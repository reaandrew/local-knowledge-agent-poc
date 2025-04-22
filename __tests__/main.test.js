/**
 * @jest-environment node
 */

// Mock electron
jest.mock('electron', () => ({
  app: {
    whenReady: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    getVersion: jest.fn().mockReturnValue('1.0.0')
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      on: jest.fn()
    }
  })),
  ipcMain: {
    on: jest.fn()
  }
}));

// Mock electron-updater
jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: true,
    checkForUpdatesAndNotify: jest.fn(),
    checkForUpdates: jest.fn(),
    on: jest.fn(),
    setFeedURL: jest.fn(),
    logger: null,
    autoInstallOnAppQuit: true
  }
}));

// Mock electron-log
jest.mock('electron-log', () => ({
  info: jest.fn(),
  error: jest.fn(),
  transports: {
    file: {
      level: 'info'
    },
    console: {
      level: 'info'
    }
  }
}));

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

describe('Electron Main Process', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Require the main process file
    jest.isolateModules(() => {
      require('../src/main');
    });
  });

  test('app.whenReady is called', () => {
    expect(app.whenReady).toHaveBeenCalled();
  });

  test('BrowserWindow is created with correct options', () => {
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
      width: 800,
      height: 600,
      webPreferences: expect.objectContaining({
        nodeIntegration: true,
        contextIsolation: false
      })
    }));
  });

  test('loadFile is called with correct path', () => {
    const mainWindow = BrowserWindow.mock.results[0].value;
    expect(mainWindow.loadFile).toHaveBeenCalledWith(
      path.join(__dirname, '../src/index.html')
    );
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