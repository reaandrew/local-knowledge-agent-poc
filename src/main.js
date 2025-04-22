const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const settings = require('./store/settings');

// Configure auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Check for updates when the window is created
  autoUpdater.checkForUpdates();
}

// Initialize app
app.whenReady().then(createWindow);

// Handle window-all-closed event
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle activate event
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle IPC messages
ipcMain.on('query', async (event, query) => {
  try {
    // TODO: Implement query handling
    event.reply('response', `Received query: ${query}`);
  } catch (error) {
    event.reply('error', error.message);
  }
});

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('Update available. Downloading...');
});

autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('Application is up to date.');
});

autoUpdater.on('error', (err) => {
  sendStatusToWindow(`Error in auto-updater: ${err.toString()}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  let message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
  sendStatusToWindow(message);
});

autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('Update downloaded. Will install on restart.');
  
  // Ask user if they want to restart now
  dialog.showMessageBox({
    type: 'info',
    buttons: ['Restart', 'Later'],
    title: 'Application Update',
    message: 'A new version has been downloaded.',
    detail: 'Restart the application to apply the updates.'
  }).then((returnValue) => {
    if (returnValue.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

function sendStatusToWindow(text) {
  if (mainWindow) {
    mainWindow.webContents.send('update-message', text);
  }
  console.log(text);
}

// IPC handlers for settings
ipcMain.on('settings:getFeatures', (event) => {
  event.reply('settings:features', settings.get('features'));
});

ipcMain.on('settings:enableFeature', (event, featureName) => {
  settings.enableFeature(featureName);
  event.reply('settings:features', settings.get('features'));
});

ipcMain.on('settings:disableFeature', (event, featureName) => {
  settings.disableFeature(featureName);
  event.reply('settings:features', settings.get('features'));
});

ipcMain.on('settings:getSelectedModel', (event) => {
  event.reply('settings:selectedModel', settings.getSelectedModel());
});

ipcMain.on('settings:setSelectedModel', (event, model) => {
  settings.setSelectedModel(model);
  event.reply('settings:selectedModel', settings.getSelectedModel());
});

// Handle model status updates
ipcMain.on('settings:setModelStatus', (event, status) => {
  settings.setModelStatus(status);
  event.reply('settings:selectedModel', settings.getSelectedModel());
}); 