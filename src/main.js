const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const settings = require('./store/settings');
const modelManager = require('./services/modelManager');

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
app.whenReady().then(() => {
  createWindow();
  
  // Log application directories for debugging
  const userDataPath = app.getPath('userData');
  const homePath = require('os').homedir();
  log.info(`Electron user data path: ${userDataPath}`);
  log.info(`User home directory: ${homePath}`);
  
  // Check status of the selected model when app starts
  const selectedModel = settings.getSelectedModel();
  if (selectedModel) {
    log.info(`Checking status of selected model: ${selectedModel.id}`);
    // This will update the model status in settings if necessary
    const status = modelManager.getModelStatus(selectedModel.id);
    log.info(`Selected model status: ${status}`);
  }
});

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

// Model management IPC handlers
ipcMain.on('model:getAvailable', (event) => {
  event.reply('model:available', modelManager.getAvailableModels());
});

ipcMain.on('model:getStatus', (event, modelId) => {
  event.reply('model:status', modelManager.getModelStatus(modelId));
});

ipcMain.on('model:download', async (event, modelId) => {
  try {
    log.info(`Received request to download model: ${modelId}`);
    event.reply('model:downloadProgress', 0); // Send initial progress
    
    await modelManager.downloadModel(modelId, (progress) => {
      // Ensure progress is a valid number and within range (0-100)
      if (typeof progress === 'number' && !isNaN(progress)) {
        const validProgress = Math.max(0, Math.min(100, progress));
        log.debug(`Download progress update: ${validProgress.toFixed(1)}%`);
        event.reply('model:downloadProgress', validProgress);
      }
    });
    
    log.info(`Download complete for model: ${modelId}`);
    event.reply('model:downloadComplete', modelId);
  } catch (error) {
    log.error(`Error downloading model: ${error.message}`);
    event.reply('model:downloadError', `Failed to download model: ${error.message}`);
  }
});

ipcMain.on('model:delete', (event, modelId) => {
  try {
    log.info(`Received request to delete model: ${modelId}`);
    const success = modelManager.deleteModel(modelId);
    
    if (success) {
      log.info(`Model ${modelId} deleted successfully`);
      
      // Update the model status in settings
      const model = modelManager.getModelById(modelId);
      if (model) {
        settings.setSelectedModel({
          ...model,
          status: 'not_downloaded'
        });
      }
    } else {
      log.warn(`Failed to delete model ${modelId}`);
    }
    
    event.reply('model:deleteComplete', { modelId, success });
  } catch (error) {
    log.error(`Error deleting model: ${error.message}`);
    event.reply('model:deleteComplete', { modelId, success: false });
  }
});

ipcMain.on('model:checkRequirements', (event, modelId) => {
  const requirements = modelManager.checkSystemRequirements(modelId);
  event.reply('model:requirements', requirements);
});

// Handle model status updates
ipcMain.on('settings:setModelStatus', (event, status) => {
  settings.setModelStatus(status);
  event.reply('settings:selectedModel', settings.getSelectedModel());
});

// Add model directory handlers
ipcMain.on('settings:getModelDirectory', (event) => {
  event.reply('settings:modelDirectory', settings.getModelDirectory());
});

ipcMain.on('settings:setModelDirectory', (event, directory) => {
  settings.setModelDirectory(directory);
  
  // Reload the model manager with the new directory
  const newDirectory = modelManager.reloadModelDirectory();
  log.info(`Model directory changed to: ${newDirectory}`);
  
  // Notify the renderer that the directory has changed
  event.reply('settings:modelDirectory', settings.getModelDirectory());
  mainWindow.webContents.send('settings:modelDirectoryChanged');
});

// Add handler for directory dialog
ipcMain.on('dialog:openDirectory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Model Directory'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    event.reply('dialog:selectedDirectory', result.filePaths[0]);
  }
}); 