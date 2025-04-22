const { ipcRenderer } = require('electron');

// Feature toggle state
let features = {};
let selectedModel = null;

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

// Helper function to check if a feature is enabled
function isFeatureEnabled(featureName) {
    return features[featureName] || false;
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

// Event handler for form submission
document.getElementById('query-form').addEventListener('submit', async (e) => {
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