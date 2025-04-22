const { ipcRenderer } = require('electron');

// Feature toggle state
let features = {};
let selectedModel = null;
let availableModels = [];

// Initialize features
ipcRenderer.send('settings:getFeatures');
ipcRenderer.on('settings:features', (event, featureState) => {
    features = featureState;
    updateUI();
});

// Initialize selected model
ipcRenderer.send('settings:getSelectedModel');
ipcRenderer.on('settings:selectedModel', (event, model) => {
    selectedModel = model;
    updateUI();
});

// Initialize available models
ipcRenderer.send('model:getAvailable');
ipcRenderer.on('model:available', (event, models) => {
    availableModels = models;
    updateModelSelect();
});

// Helper function to check if a feature is enabled
function isFeatureEnabled(featureName) {
    return features[featureName] || false;
}

// Update model select dropdown
function updateModelSelect() {
    const select = document.getElementById('model-select');
    if (!select) return;

    // Clear existing options
    select.innerHTML = '<option value="">Choose a model...</option>';

    // Add model options
    availableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.name} (${model.size})`;
        select.appendChild(option);
    });

    // Set selected value if exists
    if (selectedModel) {
        select.value = selectedModel.id;
    }
}

// Update UI based on feature toggles
function updateUI() {
    // Hide/show elements based on feature toggles
    const chatInterface = document.getElementById('chat-interface');
    const settingsPanel = document.getElementById('settings-panel');
    
    if (chatInterface) {
        chatInterface.style.display = isFeatureEnabled('CHAT_INTERFACE') ? 'block' : 'none';
    }
    
    if (settingsPanel) {
        settingsPanel.style.display = isFeatureEnabled('SETTINGS_PANEL') ? 'block' : 'none';
    }

    // Update model status if available
    if (selectedModel) {
        const modelStatus = document.getElementById('model-status');
        if (modelStatus) {
            modelStatus.textContent = `Selected Model: ${selectedModel.name} (${selectedModel.status})`;
        }
    }
}

// Handle model selection
document.getElementById('model-select')?.addEventListener('change', (e) => {
    const modelId = e.target.value;
    if (modelId) {
        const model = availableModels.find(m => m.id === modelId);
        if (model) {
            ipcRenderer.send('settings:setSelectedModel', {
                ...model,
                status: 'not_downloaded'
            });
        }
    }
});

// Handle model download
document.getElementById('download-model')?.addEventListener('click', () => {
    if (selectedModel) {
        ipcRenderer.send('model:download', selectedModel.id);
    }
});

// Handle download progress
ipcRenderer.on('model:downloadProgress', (event, progress) => {
    const modelStatus = document.getElementById('model-status');
    if (modelStatus) {
        modelStatus.textContent = `Downloading: ${progress.toFixed(1)}%`;
    }
});

// Handle download completion
ipcRenderer.on('model:downloadComplete', (event, modelId) => {
    const modelStatus = document.getElementById('model-status');
    if (modelStatus) {
        modelStatus.textContent = `Model downloaded and ready`;
    }
});

// Handle download error
ipcRenderer.on('model:downloadError', (event, error) => {
    const modelStatus = document.getElementById('model-status');
    if (modelStatus) {
        modelStatus.textContent = `Error: ${error}`;
    }
});

// Event handler for form submission
document.getElementById('query-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('query-input').value;
    
    // Only process if chat interface is enabled
    if (isFeatureEnabled('CHAT_INTERFACE')) {
        ipcRenderer.send('query', query);
    }
});

// Handle responses from main process
ipcRenderer.on('response', (event, response) => {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = response;
});

// Handle errors from main process
ipcRenderer.on('error', (event, error) => {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = `Error: ${error}`;
});

// Handle update messages
ipcRenderer.on('update-message', (event, message) => {
    const updateStatusElement = document.getElementById('update-status');
    if (updateStatusElement) {
        updateStatusElement.textContent = message;
    }
    console.log('Update status:', message);
}); 