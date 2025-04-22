/**
 * @jest-environment node
 */

// Mock electron
jest.mock('electron', () => {
  const mockApp = {
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
  };
  
  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
    },
  }));

  const mockIpcMain = {
    on: jest.fn(),
  };
  
  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
    ipcMain: mockIpcMain,
  };
});

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockReturnValue('mocked/path'),
}));

describe('Electron Main Process', () => {
  let electron;
  let app;
  let BrowserWindow;
  let ipcMain;

  beforeEach(() => {
    // Clear the module cache
    jest.resetModules();
    
    // Get fresh instances of mocked modules
    electron = require('electron');
    app = electron.app;
    BrowserWindow = electron.BrowserWindow;
    ipcMain = electron.ipcMain;
    
    // Import the main.js file
    require('../src/main');
  });

  test('app.whenReady is called', () => {
    expect(app.whenReady).toHaveBeenCalled();
  });

  test('BrowserWindow is created with correct options', async () => {
    // Call the whenReady callback
    await app.whenReady();
    
    // Check if BrowserWindow was created with correct options
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      width: expect.any(Number),
      height: expect.any(Number),
      webPreferences: expect.any(Object)
    }));
  });

  test('loadFile is called with correct path', async () => {
    // Call the whenReady callback
    await app.whenReady();
    
    // Get the BrowserWindow instance
    const browserWindowInstance = BrowserWindow.mock.results[0].value;
    
    // Check if loadFile was called with correct path
    expect(browserWindowInstance.loadFile).toHaveBeenCalledWith(expect.any(String));
  });

  test('app.on is called for window-all-closed event', () => {
    expect(app.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
  });

  test('app.on is called for activate event', () => {
    expect(app.on).toHaveBeenCalledWith('activate', expect.any(Function));
  });

  test('ipcMain.on is called for query event', () => {
    expect(ipcMain.on).toHaveBeenCalledWith('query', expect.any(Function));
  });
}); 