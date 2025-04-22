const Store = require('electron-store');
const settings = require('../../src/store/settings');

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    store: {},
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    has: jest.fn(),
    onDidChange: jest.fn(),
    onDidAnyChange: jest.fn()
  }));
});

describe('SettingsStore', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('selectedModel handling', () => {
    it('should accept null as a valid selectedModel value', () => {
      // This should not throw an error
      expect(() => settings.setSelectedModel(null)).not.toThrow();
    });

    it('should accept a valid model object', () => {
      const validModel = {
        name: 'Test Model',
        url: 'https://example.com/model',
        status: 'not_downloaded'
      };
      expect(() => settings.setSelectedModel(validModel)).not.toThrow();
    });

    it('should reject invalid model objects', () => {
      const invalidModel = {
        name: 123, // Should be string
        url: 'https://example.com/model',
        status: 'invalid_status' // Not in enum
      };
      expect(() => settings.setSelectedModel(invalidModel)).toThrow();
    });

    it('should maintain model status consistency', () => {
      const model = {
        name: 'Test Model',
        url: 'https://example.com/model',
        status: 'not_downloaded'
      };
      settings.setSelectedModel(model);
      settings.setModelStatus('downloading');
      const updatedModel = settings.getSelectedModel();
      expect(updatedModel.status).toBe('downloading');
    });
  });
}); 