const fs = require('fs');
const path = require('path');
const https = require('https');
const { models } = require('../config/models');
const settings = require('../store/settings');
const log = require('electron-log');

class ModelManager {
    constructor() {
        this.modelDirectory = settings.getModelDirectory();
        this.ensureModelDirectory();
    }

    // Ensure the model directory exists
    ensureModelDirectory() {
        if (!fs.existsSync(this.modelDirectory)) {
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
        const modelPath = this.getModelPath(modelId);
        return fs.existsSync(modelPath);
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

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(modelPath);
            
            https.get(model.url, (response) => {
                const totalSize = parseInt(response.headers['content-length'], 10);
                let downloadedSize = 0;

                response.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    const progress = (downloadedSize / totalSize) * 100;
                    
                    if (progressCallback) {
                        progressCallback(progress);
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    settings.setModelStatus('ready');
                    resolve(modelPath);
                });

                file.on('error', (err) => {
                    fs.unlink(modelPath, () => {});
                    settings.setModelStatus('error');
                    reject(err);
                });
            }).on('error', (err) => {
                fs.unlink(modelPath, () => {});
                settings.setModelStatus('error');
                reject(err);
            });
        });
    }

    // Delete model
    deleteModel(modelId) {
        const modelPath = this.getModelPath(modelId);
        if (fs.existsSync(modelPath)) {
            fs.unlinkSync(modelPath);
            return true;
        }
        return false;
    }

    // Get model status
    getModelStatus(modelId) {
        const model = this.getModelById(modelId);
        if (!model) {
            return 'not_found';
        }

        if (this.isModelDownloaded(modelId)) {
            return 'ready';
        }

        return 'not_downloaded';
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