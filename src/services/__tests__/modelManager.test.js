// Mock dependencies before importing the module
jest.mock('fs');
jest.mock('electron-log');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}));
jest.mock('os', () => ({
  homedir: jest.fn().mockReturnValue('/mock/home')
}));

// Mock settings
const mockSettings = {
  getModelDirectory: jest.fn().mockReturnValue('.local/lka/models'),
  setSelectedModel: jest.fn(),
  getSelectedModel: jest.fn().mockReturnValue(null),
  setModelStatus: jest.fn()
};
jest.mock('../../store/settings', () => mockSettings);

// Mock data
const mockModels = [
  {
    id: 'test-model',
    name: 'Test Model',
    description: 'Test model for unit tests',
    url: 'https://example.com/test-model.safetensors',
    size: '1GB',
    format: 'safetensors'
  }
];

// Mock the models module
jest.mock('../../config/models', () => ({
  models: mockModels
}));

// Import mocks
const fs = require('fs');
const log = require('electron-log');

describe('ModelManager', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up fs mocks
    fs.existsSync = jest.fn().mockReturnValue(false);
    fs.mkdirSync = jest.fn();
    fs.statSync = jest.fn().mockReturnValue({ size: 1000 });
    fs.unlinkSync = jest.fn();
    
    // Reset settings mocks
    mockSettings.getModelDirectory.mockReturnValue('test-models');
    mockSettings.setSelectedModel.mockReset();
    mockSettings.getSelectedModel.mockReturnValue(null);
    mockSettings.setModelStatus.mockReset();
    
    // Set up log mocks
    log.info = jest.fn();
    log.error = jest.fn();
    log.warn = jest.fn();
    log.debug = jest.fn();
  });

  // Basic test to verify the module loads
  test('Module loads without errors', () => {
    jest.resetModules();
    expect(() => {
      require('../modelManager');
    }).not.toThrow();
  });
});