// Mock electron and electron-log before requiring the model manager
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mock/model/directory')
  }
}));

jest.mock('electron-log', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock the HTTP and HTTPS modules used for downloads
jest.mock('http', () => ({
  get: jest.fn()
}));

jest.mock('https', () => ({
  get: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(),
  unlinkSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlink: jest.fn((path, callback) => callback()),
}));

jest.mock('os', () => ({
  totalmem: jest.fn(),
  freemem: jest.fn(),
  homedir: jest.fn(() => '/mock/home')
}));

// Create a mock settings module
const mockSettings = {
  getModelDirectory: jest.fn(() => '.local/lka/models'),
  setSelectedModel: jest.fn(),
  getSelectedModel: jest.fn(() => null),
  setModelStatus: jest.fn(),
};

jest.mock('../src/store/settings', () => mockSettings);

// Mock the models configuration
const mockModels = [
  {
    id: 'test-model',
    name: 'Test Model',
    description: 'Test model for unit tests',
    url: 'https://example.com/test-model.safetensors?download=true',
    size: '1GB',
    format: 'safetensors',
    memoryRequirement: '4GB'
  }
];

jest.mock('../src/config/models', () => ({
  models: mockModels
}));

// Import dependencies after mocking
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const { EventEmitter } = require('events');
const path = require('path');
const log = require('electron-log');

// Mock for HTTP responses
class MockIncomingMessage extends EventEmitter {
  constructor(options = {}) {
    super();
    this.statusCode = options.statusCode || 200;
    this.headers = options.headers || {};
    this.destroy = jest.fn();
    this.pipe = jest.fn((destination) => {
      // Simulate successful piping
      setTimeout(() => {
        destination.emit('finish');
      }, 10);
      return destination;
    });
  }

  emitData(chunks, delay = 10) {
    if (!Array.isArray(chunks)) {
      chunks = [chunks];
    }
    
    let totalEmitted = 0;
    const totalSize = parseInt(this.headers['content-length'], 10) || 0;
    
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        this.emit('data', Buffer.from(chunk));
        totalEmitted += chunk.length;
        
        // Emit end after the last chunk
        if (index === chunks.length - 1) {
          this.emit('end');
        }
      }, delay * (index + 1));
    });
  }
}

// Mock for write stream
class MockWriteStream extends EventEmitter {
  constructor() {
    super();
    this.close = jest.fn(() => {
      this.emit('close');
    });
  }
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Set up fs mocks
  fs.existsSync.mockReturnValue(false);
  fs.statSync.mockReturnValue({ size: 1000 });
  
  // Reset settings mocks
  mockSettings.getModelDirectory.mockReturnValue('.local/lka/models');
  mockSettings.setSelectedModel.mockReset();
  mockSettings.getSelectedModel.mockReturnValue(null);
  
  // Set up mock functions for http/https
  const setupMockResponse = (protocol) => {
    protocol.get.mockImplementation((url, callback) => {
      const response = new MockIncomingMessage({
        statusCode: 200,
        headers: {
          'content-length': '1000'
        }
      });
      callback(response);
      return {
        on: jest.fn((event, errorCallback) => {
          if (event === 'error') {
            // Store the error callback for later use
            response.errorCallback = errorCallback;
          }
        })
      };
    });
  };
  
  setupMockResponse(http);
  setupMockResponse(https);
  
  // Set up mock write stream
  fs.createWriteStream.mockImplementation(() => {
    return new MockWriteStream();
  });
  
  // Set up homedir mock
  os.homedir.mockReturnValue('/mock/home');
});

// Import the model manager after setup
const modelManager = require('../src/services/modelManager');

describe('ModelManager', () => {
  describe('ensureModelDirectory', () => {
    it('should create directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      modelManager.ensureModelDirectory();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should not create directory if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      modelManager.ensureModelDirectory();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('isModelDownloaded', () => {
    it('should return true if model file exists with content', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1000 });
      
      const result = modelManager.isModelDownloaded('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.statSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if model file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = modelManager.isModelDownloaded('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should return false if file exists but has no content', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 0 });
      
      const result = modelManager.isModelDownloaded('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.statSync).toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should handle errors and return false', () => {
      fs.existsSync.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = modelManager.isModelDownloaded('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('downloadModel', () => {
    it('should download model successfully', async () => {
      // Set up success scenario
      const mockResponse = new MockIncomingMessage({
        statusCode: 200,
        headers: { 'content-length': '1000' }
      });
      
      https.get.mockImplementation((url, callback) => {
        callback(mockResponse);
        return { on: jest.fn() };
      });
      
      const mockWriter = new MockWriteStream();
      fs.createWriteStream.mockReturnValue(mockWriter);
      
      const progressCallback = jest.fn();
      
      // Start download
      const downloadPromise = modelManager.downloadModel('test-model', progressCallback);
      
      // Simulate receiving data
      mockResponse.emitData(['chunk1', 'chunk2', 'chunk3', 'chunk4']);
      
      // Wait for promise to resolve
      await downloadPromise;
      
      // Verify results
      expect(fs.createWriteStream).toHaveBeenCalled();
      expect(https.get).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/test-model.safetensors'),
        expect.any(Function)
      );
      expect(progressCallback).toHaveBeenCalled();
      expect(mockSettings.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });

    it('should handle HTTP redirects', async () => {
      // First response is a redirect
      const redirectResponse = new MockIncomingMessage({
        statusCode: 302,
        headers: { location: 'https://redirected.example.com/test-model.safetensors' }
      });
      
      // Second response is successful
      const successResponse = new MockIncomingMessage({
        statusCode: 200,
        headers: { 'content-length': '1000' }
      });
      
      // Set up https.get to first return a redirect, then success
      https.get
        .mockImplementationOnce((url, callback) => {
          callback(redirectResponse);
          return { on: jest.fn() };
        })
        .mockImplementationOnce((url, callback) => {
          callback(successResponse);
          return { on: jest.fn() };
        });
      
      const mockWriter = new MockWriteStream();
      fs.createWriteStream.mockReturnValue(mockWriter);
      
      const progressCallback = jest.fn();
      
      // Start download
      const downloadPromise = modelManager.downloadModel('test-model', progressCallback);
      
      // Simulate receiving data for the second request
      successResponse.emitData('redirected content');
      
      // Wait for promise to resolve
      await downloadPromise;
      
      // Verify redirects were followed
      expect(https.get).toHaveBeenCalledTimes(2);
      expect(https.get).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('https://example.com/test-model.safetensors'),
        expect.any(Function)
      );
      expect(https.get).toHaveBeenNthCalledWith(
        2,
        'https://redirected.example.com/test-model.safetensors',
        expect.any(Function)
      );
      expect(mockSettings.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
    });
    
    it('should handle download network errors', async () => {
      // Set up error scenario
      https.get.mockImplementation((url, callback) => {
        const mockReq = {
          on: jest.fn((event, errorCallback) => {
            if (event === 'error') {
              // Trigger error immediately
              setTimeout(() => {
                errorCallback(new Error('Network error'));
              }, 10);
            }
          })
        };
        return mockReq;
      });
      
      const mockWriter = new MockWriteStream();
      fs.createWriteStream.mockReturnValue(mockWriter);
      
      // Expect the download to fail
      await expect(modelManager.downloadModel('test-model')).rejects.toThrow('Network error');
      
      // Verify error handling
      expect(fs.unlink).toHaveBeenCalled();
      expect(mockSettings.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' })
      );
    });
    
    it('should handle file write errors', async () => {
      // Set up success response
      const mockResponse = new MockIncomingMessage({
        statusCode: 200,
        headers: { 'content-length': '1000' }
      });
      
      https.get.mockImplementation((url, callback) => {
        callback(mockResponse);
        return { on: jest.fn() };
      });
      
      // Set up file write error
      const mockWriter = new MockWriteStream();
      // Override the default mock to explicitly generate a reject on error
      fs.createWriteStream.mockImplementation(() => {
        // Schedule an error event after a short delay
        setTimeout(() => {
          mockWriter.emit('error', new Error('Write error'));
        }, 10);
        return mockWriter;
      });
      
      // Start download
      const downloadPromise = modelManager.downloadModel('test-model');
      
      // Expect the download to fail
      await expect(downloadPromise).rejects.toThrow('Write error');
      
      // Verify error handling
      expect(fs.unlink).toHaveBeenCalled();
      expect(mockSettings.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error' })
      );
    });
  });

  describe('deleteModel', () => {
    it('should delete model file if it exists', () => {
      fs.existsSync.mockReturnValue(true);
      
      const result = modelManager.deleteModel('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if model file does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = modelManager.deleteModel('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should handle errors while deleting', () => {
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Deletion error');
      });
      
      const result = modelManager.deleteModel('test-model');
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('getModelStatus', () => {
    it('should return not_found if model is not in available models', () => {
      const result = modelManager.getModelStatus('non-existent-model');
      
      expect(result).toBe('not_found');
      expect(log.warn).toHaveBeenCalled();
    });
    
    it('should return ready if model is downloaded', () => {
      // Mock isModelDownloaded to return true
      jest.spyOn(modelManager, 'isModelDownloaded').mockReturnValue(true);
      
      const result = modelManager.getModelStatus('test-model');
      
      expect(modelManager.isModelDownloaded).toHaveBeenCalledWith('test-model');
      expect(result).toBe('ready');
    });
    
    it('should update status to ready if model is downloaded but status is different', () => {
      // Mock isModelDownloaded to return true
      jest.spyOn(modelManager, 'isModelDownloaded').mockReturnValue(true);
      
      // Mock selected model with different status
      mockSettings.getSelectedModel.mockReturnValue({
        id: 'test-model',
        status: 'downloading'
      });
      
      const result = modelManager.getModelStatus('test-model');
      
      expect(modelManager.isModelDownloaded).toHaveBeenCalledWith('test-model');
      expect(mockSettings.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ready' })
      );
      expect(result).toBe('ready');
    });
    
    it('should update status to not_downloaded if file not found but status is ready', () => {
      // Mock isModelDownloaded to return false
      jest.spyOn(modelManager, 'isModelDownloaded').mockReturnValue(false);
      
      // Mock selected model with ready status
      mockSettings.getSelectedModel.mockReturnValue({
        id: 'test-model',
        status: 'ready'
      });
      
      const result = modelManager.getModelStatus('test-model');
      
      expect(modelManager.isModelDownloaded).toHaveBeenCalledWith('test-model');
      expect(mockSettings.setSelectedModel).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'not_downloaded' })
      );
      expect(result).toBe('not_downloaded');
    });
    
    it('should return saved status if model is not downloaded', () => {
      // Mock isModelDownloaded to return false
      jest.spyOn(modelManager, 'isModelDownloaded').mockReturnValue(false);
      
      // Mock selected model with downloading status
      mockSettings.getSelectedModel.mockReturnValue({
        id: 'test-model',
        status: 'downloading'
      });
      
      const result = modelManager.getModelStatus('test-model');
      
      expect(modelManager.isModelDownloaded).toHaveBeenCalledWith('test-model');
      expect(result).toBe('downloading');
    });
    
    it('should handle errors and return error status', () => {
      jest.spyOn(modelManager, 'isModelDownloaded').mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = modelManager.getModelStatus('test-model');
      
      expect(modelManager.isModelDownloaded).toHaveBeenCalledWith('test-model');
      expect(log.error).toHaveBeenCalled();
      expect(result).toBe('error');
    });
  });
  
  describe('checkSystemRequirements', () => {
    it('should return meets:false if model is not found', () => {
      const result = modelManager.checkSystemRequirements('non-existent-model');
      
      expect(result).toEqual({
        meets: false,
        reason: 'Model not found'
      });
    });
    
    it('should return meets:true for now (placeholder for actual checks)', () => {
      const result = modelManager.checkSystemRequirements('test-model');
      
      expect(result).toEqual({
        meets: true,
        reason: 'System meets requirements'
      });
    });
  });
}); 