const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('axios', () => jest.fn());
jest.mock('fs', () => {
  const mockWriteStream = {
    on: jest.fn(function(event, callback) {
      if (event === 'finish') {
        setTimeout(callback, 0);
      }
      return this;
    }),
    pipe: jest.fn(function() {
      setTimeout(() => {
        this.on.mock.calls
          .filter(([event]) => event === 'finish')
          .forEach(([, callback]) => callback());
      }, 0);
      return this;
    })
  };

  return {
    createWriteStream: jest.fn(() => mockWriteStream),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    unlink: jest.fn((path, callback) => callback && callback())
  };
});
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

// Import modules after mocking
const axios = require('axios');
const modelManager = require('../modelManager');

describe('ModelManager', () => {
  let progressCallback;
  let mockStore;
  let mockFs;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock modules
    mockStore = require('../../store/settings');
    mockFs = require('fs');

    // Setup progress callback
    progressCallback = jest.fn();
  });

  describe('downloadModel', () => {
    it('should download a model successfully', async () => {
      // Mock axios response
      const mockStream = {
        pipe: jest.fn()
      };
      const mockAxiosResponse = { data: mockStream };
      axios.mockResolvedValueOnce(mockAxiosResponse);

      await expect(modelManager.downloadModel('tinyllama', progressCallback))
        .resolves.toEqual('/test/models/tinyllama.safetensors');

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        method: 'GET',
        responseType: 'stream'
      }));
            
      // Verify that createWriteStream was called with the correct path
      expect(mockFs.createWriteStream).toHaveBeenCalledWith('/test/models/tinyllama.safetensors');
            
      expect(mockStore.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });

    it('should handle download errors', async () => {
      const error = new Error('Download failed');
      axios.mockRejectedValueOnce(error);

      await expect(modelManager.downloadModel('tinyllama', progressCallback))
        .rejects.toThrow('Download failed');

      expect(mockStore.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' })
      );
    });

    it('should handle file write errors', async () => {
      // Mock axios response
      const mockStream = {
        pipe: jest.fn()
      };
      const mockAxiosResponse = { data: mockStream };
      axios.mockResolvedValueOnce(mockAxiosResponse);

      // Setup error handler to be triggered
      const mockWriteStream = mockFs.createWriteStream();
            
      // Trigger error event immediately
      setTimeout(() => {
        const errorCallbacks = mockWriteStream.on.mock.calls
          .filter(([event]) => event === 'error')
          .map(([, callback]) => callback);
                
        if (errorCallbacks.length > 0) {
          errorCallbacks[0](new Error('Write failed'));
        }
      }, 0);

      await expect(modelManager.downloadModel('tinyllama', progressCallback))
        .rejects.toThrow('Write failed');

      expect(mockStore.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' })
      );
    });

    it('should update progress during download', async () => {
      // Mock axios implementation to call progress callback
      const mockStream = {
        pipe: jest.fn()
      };
      const mockAxiosResponse = { data: mockStream };
            
      axios.mockImplementationOnce((config) => {
        if (config.onDownloadProgress) {
          config.onDownloadProgress({ loaded: 50, total: 100 });
        }
        return Promise.resolve(mockAxiosResponse);
      });

      await modelManager.downloadModel('tinyllama', progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(50);
      expect(mockStore.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });
  });
});