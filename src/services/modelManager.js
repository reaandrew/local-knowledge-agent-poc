const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { models } = require('../config/models');
const settings = require('../store/settings');
const log = require('electron-log');
const { app } = require('electron');
const os = require('os');

class ModelManager {
  constructor() {
    // Get model directory from settings
    const configuredDir = settings.getModelDirectory();
        
    // If path starts with dot or is relative, place it in user's home directory
    if (configuredDir.startsWith('.') || !path.isAbsolute(configuredDir)) {
      this.modelDirectory = path.join(os.homedir(), configuredDir);
    } else {
      // If it's an absolute path, use as is
      this.modelDirectory = configuredDir;
    }
        
    log.info(`Using model directory: ${this.modelDirectory}`);
    this.ensureModelDirectory();
  }

  // Ensure the model directory exists
  ensureModelDirectory() {
    if (!fs.existsSync(this.modelDirectory)) {
      log.info(`Creating model directory: ${this.modelDirectory}`);
      fs.mkdirSync(this.modelDirectory, { recursive: true });
    }
  }

  // Get available models
  getAvailableModels() {
    return models;
  }

  // Get model by ID
  getModelById(modelId) {
    return models.find(model => model.id === modelId);
  }

  // Check if model is downloaded
  isModelDownloaded(modelId) {
    try {
      const modelPath = this.getModelPath(modelId);
      const exists = fs.existsSync(modelPath);
            
      if (exists) {
        // Get file stats to ensure it's a valid file with content
        const stats = fs.statSync(modelPath);
        log.info(`Model ${modelId} exists: ${exists}, Size: ${stats.size} bytes`);
        return exists && stats.size > 0;
      }
            
      log.info(`Model ${modelId} does not exist at path: ${modelPath}`);
      return false;
    } catch (error) {
      log.error(`Error checking if model is downloaded: ${error.message}`);
      return false;
    }
  }

  // Get model path
  getModelPath(modelId) {
    return path.join(this.modelDirectory, `${modelId}.safetensors`);
  }

  // Download model
  async downloadModel(modelId, progressCallback) {
    const model = this.getModelById(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const modelPath = this.getModelPath(modelId);
        
    // Update model status
    settings.setSelectedModel({
      ...model,
      status: 'downloading'
    });

    log.info(`Starting download of model ${modelId} from ${model.url}`);
    if (progressCallback) {
      progressCallback(0); // Start at 0%
    }

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(modelPath);
            
      // Function to follow redirects and handle the download
      const downloadWithRedirects = (url) => {
        log.info(`Requesting URL: ${url}`);
                
        // Determine if HTTP or HTTPS
        const protocol = url.startsWith('https:') ? https : http;
                
        protocol.get(url, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
            const redirectUrl = response.headers.location;
            log.info(`Redirect detected to: ${redirectUrl}`);
            // Close the current response to avoid memory leaks
            response.destroy();
            // Follow the redirect
            return downloadWithRedirects(redirectUrl);
          }
                    
          // Check for other HTTP errors
          if (response.statusCode !== 200) {
            const error = new Error(`Request failed with status code ${response.statusCode}`);
            file.close();
            fs.unlink(modelPath, () => {});
            settings.setModelStatus('error');
            return reject(error);
          }
                    
          const totalSize = parseInt(response.headers['content-length'], 10);
          if (isNaN(totalSize)) {
            log.warn('Could not determine content length for download');
          } else {
            log.info(`Total file size: ${totalSize} bytes`);
          }
                    
          let downloadedSize = 0;
          let lastProgressReported = 0;
                    
          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
                        
            // Only report progress every 1% to avoid flooding the UI
            if (totalSize && progressCallback) {
              const currentProgress = (downloadedSize / totalSize) * 100;
              if (currentProgress - lastProgressReported >= 1 || currentProgress === 100) {
                lastProgressReported = currentProgress;
                log.debug(`Download progress: ${currentProgress.toFixed(2)}%`);
                progressCallback(currentProgress);
              }
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close();
            log.info(`Download complete for model ${modelId}`);
            // Update the entire model object with status
            settings.setSelectedModel({
              ...model,
              status: 'ready'
            });
            resolve(modelPath);
          });

          file.on('error', (err) => {
            log.error(`File write error: ${err.message}`);
            fs.unlink(modelPath, () => {});
            settings.setSelectedModel({
              ...model,
              status: 'error'
            });
            reject(err);
          });
        }).on('error', (err) => {
          log.error(`Network error: ${err.message}`);
          fs.unlink(modelPath, () => {});
          settings.setSelectedModel({
            ...model, 
            status: 'error'
          });
          reject(err);
        });
      };
            
      // Start the download process
      downloadWithRedirects(model.url);
    });
  }

  // Delete model
  deleteModel(modelId) {
    try {
      const modelPath = this.getModelPath(modelId);
      log.info(`Attempting to delete model at path: ${modelPath}`);
            
      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
        log.info(`Successfully deleted model file: ${modelPath}`);
        return true;
      } else {
        log.warn(`Model file not found for deletion: ${modelPath}`);
        return false;
      }
    } catch (error) {
      log.error(`Error deleting model ${modelId}: ${error.message}`);
      return false;
    }
  }

  // Get model status
  getModelStatus(modelId) {
    try {
      const model = this.getModelById(modelId);
      if (!model) {
        log.warn(`Model ${modelId} not found in available models`);
        return 'not_found';
      }

      // Check if the model is downloaded
      const isDownloaded = this.isModelDownloaded(modelId);
            
      // Get status from settings, defaulting to not_downloaded if not found
      const selectedModel = settings.getSelectedModel();
      const savedStatus = (selectedModel && selectedModel.id === modelId) 
        ? selectedModel.status 
        : null;
                
      log.info(`Model ${modelId} status: isDownloaded=${isDownloaded}, savedStatus=${savedStatus}`);
                
      // If the model is downloaded, it should be ready
      if (isDownloaded) {
        // If status in settings is not 'ready', update it
        if (savedStatus !== 'ready') {
          log.info(`Updating model ${modelId} status to 'ready' because it is downloaded`);
          settings.setSelectedModel({
            ...model,
            status: 'ready'
          });
        }
        return 'ready';
      }
            
      // If it's not downloaded, but the status is 'ready', fix it
      if (savedStatus === 'ready') {
        log.warn(`Model ${modelId} marked as ready but file not found, correcting status`);
        settings.setSelectedModel({
          ...model,
          status: 'not_downloaded'
        });
        return 'not_downloaded';
      }
            
      // Otherwise return the saved status or not_downloaded
      return savedStatus || 'not_downloaded';
    } catch (error) {
      log.error(`Error getting model status: ${error.message}`);
      return 'error';
    }
  }

  // Check system requirements
  checkSystemRequirements(modelId) {
    const model = this.getModelById(modelId);
    if (!model) {
      return {
        meets: false,
        reason: 'Model not found'
      };
    }

    // TODO: Implement actual system requirement checks
    // For now, just return true
    return {
      meets: true,
      reason: 'System meets requirements'
    };
  }
}

module.exports = new ModelManager(); 