const fs = require('fs');
const path = require('path');
const https = require('https');
const { EventEmitter } = require('events');

// Mock dependencies
jest.mock('https');
jest.mock('fs', () => ({
  createWriteStream: jest.fn(() => ({
    on: jest.fn(function(event, callback) {
      if (event === 'finish') {
        // Store callback to be called later
        this._finishCallback = callback;
      }
      return this;
    }),
    close: jest.fn(),
    _finishCallback: null
  })),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  unlink: jest.fn((path, callback) => callback && callback())
}));

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    store: {}
  }));
});

jest.mock('electron-log');
jest.mock('../../store/settings', () => {
  const mockStore = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    store: {
      features: {},
      selectedModel: null,
      modelDirectory: '/test/models'
    },
    getModelDirectory: jest.fn(() => '/test/models'),
    setSelectedModel: jest.fn(),
    getSelectedModel: jest.fn(() => null),
    setModelStatus: jest.fn(),
    save: jest.fn()
  };
  return mockStore;
});

// Mock models config
jest.mock('../../config/models', () => ({
  models: [
    {
      id: 'tinyllama',
      name: 'TinyLlama',
      url: 'https://example.com/tinyllama.safetensors',
      status: 'not_downloaded'
    }
  ]
}));

// Import the ModelManager instance
const modelManager = require('../modelManager');

describe('ModelManager', () => {
  let progressCallback;
  let mockStore;
  let mockFs;
  let mockHttps;
  let mockResponse;
  let mockRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock store
    mockStore = require('../../store/settings');
    mockFs = require('fs');
    mockHttps = require('https');
        
    // Create a mock response that extends EventEmitter
    mockResponse = new EventEmitter();
    mockResponse.headers = { 'content-length': '1000' };
    mockResponse.pipe = jest.fn(function(dest) {
      // Store destination to trigger finish event later
      this.dest = dest;
      return dest;
    });

    // Create a mock request that extends EventEmitter
    mockRequest = new EventEmitter();
    mockRequest.on = jest.fn((event, handler) => {
      mockRequest.addListener(event, handler);
      return mockRequest;
    });

    // Setup https.get to return mockRequest and call callback with mockResponse
    mockHttps.get = jest.fn((url, callback) => {
      if (callback) {
        callback(mockResponse);
      }
      return mockRequest;
    });

    // Setup progress callback
    progressCallback = jest.fn();
  });

  describe('downloadModel', () => {
    // Increase the test timeout
    jest.setTimeout(10000);
        
    it('should download a model successfully', async () => {
      const downloadPromise = modelManager.downloadModel('tinyllama', progressCallback);
            
      // Emit some data events to simulate download progress
      mockResponse.emit('data', Buffer.from('x'.repeat(500)));
            
      // Simulate file stream finish event
      setTimeout(() => {
        const fileStream = mockFs.createWriteStream.mock.results[0].value;
        if (fileStream._finishCallback) {
          fileStream._finishCallback();
        }
      }, 10);
            
      await expect(downloadPromise).resolves.toEqual('/test/models/tinyllama.safetensors');
            
      expect(mockHttps.get).toHaveBeenCalledWith(
        'https://example.com/tinyllama.safetensors',
        expect.any(Function)
      );
      expect(mockFs.createWriteStream).toHaveBeenCalledWith('/test/models/tinyllama.safetensors');
      expect(mockResponse.pipe).toHaveBeenCalled();
      expect(mockStore.setModelStatus).toHaveBeenCalledWith('ready');
    });

    it('should handle download errors', async () => {
      const downloadPromise = modelManager.downloadModel('tinyllama', progressCallback);
            
      // Simulate network error
      mockRequest.emit('error', new Error('Download failed'));
            
      await expect(downloadPromise).rejects.toThrow('Download failed');
            
      expect(mockStore.setModelStatus).toHaveBeenCalledWith('error');
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      const downloadPromise = modelManager.downloadModel('tinyllama', progressCallback);
            
      // Get the file stream
      const fileStream = mockFs.createWriteStream.mock.results[0].value;
            
      // Simulate file write error
      setTimeout(() => {
        fileStream.on.mock.calls
          .filter(([event]) => event === 'error')
          .forEach(([, callback]) => callback(new Error('Write failed')));
      }, 10);
            
      await expect(downloadPromise).rejects.toThrow('Write failed');
            
      expect(mockStore.setModelStatus).toHaveBeenCalledWith('error');
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it('should update progress during download', async () => {
      const downloadPromise = modelManager.downloadModel('tinyllama', progressCallback);
            
      // Emit data events to simulate download progress
      mockResponse.emit('data', Buffer.from('x'.repeat(250)));
      mockResponse.emit('data', Buffer.from('x'.repeat(250)));
      mockResponse.emit('data', Buffer.from('x'.repeat(250)));
            
      // Simulate file stream finish event
      setTimeout(() => {
        const fileStream = mockFs.createWriteStream.mock.results[0].value;
        if (fileStream._finishCallback) {
          fileStream._finishCallback();
        }
      }, 10);
            
      await downloadPromise;
            
      expect(progressCallback).toHaveBeenCalledWith(25);
      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(progressCallback).toHaveBeenCalledWith(75);
      expect(mockStore.setModelStatus).toHaveBeenCalledWith('ready');
    });
  });
});