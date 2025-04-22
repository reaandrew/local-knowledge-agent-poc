const Store = require('electron-store');
const { features } = require('../config/features');

const schema = {
    features: {
        type: 'object',
        default: features
    },
    selectedModel: {
        type: ['object', 'null'],
        properties: {
            name: { type: 'string' },
            url: { type: 'string' },
            status: { type: 'string', enum: ['not_downloaded', 'downloading', 'ready', 'error'] }
        },
        default: null
    },
    modelDirectory: {
        type: 'string',
        default: 'models'
    }
};

class SettingsStore extends Store {
    constructor() {
        super({
            name: 'settings',
            schema
        });

        // Initialize store with default values if empty
        if (Object.keys(this.store).length === 0) {
            this.store = {
                features,
                selectedModel: null,
                modelDirectory: 'models'
            };
        }
    }

    // Feature toggle methods
    isFeatureEnabled(featureName) {
        return this.get(`features.${featureName}`) || false;
    }

    enableFeature(featureName) {
        if (this.get(`features.${featureName}`) !== undefined) {
            this.set(`features.${featureName}`, true);
        }
    }

    disableFeature(featureName) {
        if (this.get(`features.${featureName}`) !== undefined) {
            this.set(`features.${featureName}`, false);
        }
    }

    // Model management methods
    setSelectedModel(model) {
        this.set('selectedModel', model);
    }

    getSelectedModel() {
        return this.get('selectedModel');
    }

    setModelStatus(status) {
        const model = this.getSelectedModel();
        if (model) {
            model.status = status;
            this.setSelectedModel(model);
        }
    }

    getModelDirectory() {
        return this.get('modelDirectory');
    }

    setModelDirectory(directory) {
        this.set('modelDirectory', directory);
    }
}

module.exports = new SettingsStore(); 