const { ipcRenderer } = require('electron');

// Feature toggle state
let features = {};
let selectedModel = null;
let availableModels = [];
let modelDirectory = '';

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

// Initialize model directory
ipcRenderer.send('settings:getModelDirectory');
ipcRenderer.on('settings:modelDirectory', (event, directory) => {
  modelDirectory = directory;
  updateModelDirectoryUI();
});

// Model directory change notification
ipcRenderer.on('settings:modelDirectoryChanged', () => {
  // Refresh available models and model status
  ipcRenderer.send('model:getAvailable');
  if (selectedModel) {
    ipcRenderer.send('model:getStatus', selectedModel.id);
  }
  
  const modelDirectoryStatus = document.getElementById('model-directory-status');
  if (modelDirectoryStatus) {
    modelDirectoryStatus.textContent = 'Model directory updated. Checking for models...';
    modelDirectoryStatus.style.color = '#007bff';
    
    // Clear the status message after 3 seconds
    setTimeout(() => {
      modelDirectoryStatus.textContent = '';
    }, 3000);
  }
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

// Update model directory input field and status
function updateModelDirectoryUI() {
  const modelDirectoryInput = document.getElementById('model-directory-input');
  if (modelDirectoryInput) {
    modelDirectoryInput.value = modelDirectory;
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

  // Update model status and controls if available
  if (selectedModel) {
    const modelStatus = document.getElementById('model-status');
    const downloadButton = document.getElementById('download-model');
    const deleteButton = document.getElementById('delete-model');
    const progressContainer = document.getElementById('download-progress-container');
        
    if (modelStatus) {
      modelStatus.textContent = `Selected Model: ${selectedModel.name} (${selectedModel.status})`;
      // Reset color in case it was set to red for an error
      modelStatus.style.color = '';
    }
        
    // Update the model info section
    const modelInfo = document.getElementById('model-info');
    if (modelInfo) {
      modelInfo.innerHTML = `
                <p><strong>Model:</strong> ${selectedModel.name}</p>
                <p><strong>Size:</strong> ${selectedModel.size}</p>
                <p><strong>Description:</strong> ${selectedModel.description || 'No description available'}</p>
                <p><strong>Status:</strong> ${selectedModel.status}</p>
            `;
    }
        
    // Handle button visibility based on model status
    if (downloadButton && deleteButton && progressContainer) {
      if (selectedModel.status === 'ready') {
        // Model is downloaded and ready to use
        downloadButton.style.display = 'none';
        deleteButton.style.display = 'inline-block';
        progressContainer.style.display = 'none';
      } else if (selectedModel.status === 'downloading') {
        // Model is currently downloading
        downloadButton.style.display = 'none';
        deleteButton.style.display = 'none';
        progressContainer.style.display = 'block';
      } else {
        // Model is not downloaded or had an error
        downloadButton.style.display = 'inline-block';
        downloadButton.disabled = false;
        downloadButton.textContent = 'Download Model';
        deleteButton.style.display = 'none';
        progressContainer.style.display = 'none';
      }
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
    const downloadButton = document.getElementById('download-model');
    const modelStatus = document.getElementById('model-status');
        
    // Disable button and update status
    downloadButton.disabled = true;
    downloadButton.textContent = 'Downloading...';
        
    if (modelStatus) {
      modelStatus.textContent = 'Preparing to download...';
    }
        
    // Show progress container if it exists
    const progressContainer = document.getElementById('download-progress-container');
    const progressBar = document.getElementById('download-progress-bar');
    const progressText = document.getElementById('download-progress-text');
        
    if (progressContainer) {
      progressContainer.style.display = 'block';
      if (progressBar) {
        progressBar.style.width = '0%';
      }
      if (progressText) {
        progressText.textContent = '0%';
      }
    }
        
    ipcRenderer.send('model:download', selectedModel.id);
  }
});

// Handle download progress
ipcRenderer.on('model:downloadProgress', (event, progress) => {
  const modelStatus = document.getElementById('model-status');
  const progressBar = document.getElementById('download-progress-bar');
  const progressText = document.getElementById('download-progress-text');
    
  if (modelStatus) {
    modelStatus.textContent = `Downloading: ${progress.toFixed(1)}%`;
  }
    
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
    
  if (progressText) {
    progressText.textContent = `${progress.toFixed(1)}%`;
  }
});

// Handle download completion
ipcRenderer.on('model:downloadComplete', (event, modelId) => {
  const modelStatus = document.getElementById('model-status');
  const downloadButton = document.getElementById('download-model');
  const progressContainer = document.getElementById('download-progress-container');
    
  if (modelStatus) {
    modelStatus.textContent = 'Model downloaded and ready';
  }
    
  if (downloadButton) {
    downloadButton.disabled = false;
    downloadButton.style.display = 'none'; // Hide download button
  }
    
  // Show delete button if it exists
  const deleteButton = document.getElementById('delete-model');
  if (deleteButton) {
    deleteButton.style.display = 'inline-block';
  }
    
  // Hide progress container
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
    
  // Refresh model data
  ipcRenderer.send('settings:getSelectedModel');
});

// Handle download error
ipcRenderer.on('model:downloadError', (event, error) => {
  const modelStatus = document.getElementById('model-status');
  const downloadButton = document.getElementById('download-model');
  const progressContainer = document.getElementById('download-progress-container');
    
  if (modelStatus) {
    modelStatus.textContent = `Error: ${error}`;
    modelStatus.style.color = 'red'; // Highlight error in red
  }
    
  if (downloadButton) {
    downloadButton.disabled = false;
    downloadButton.textContent = 'Retry Download';
  }
    
  // Hide progress container
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
    
  console.error('Download error:', error);
});

// Handle model delete
document.getElementById('delete-model')?.addEventListener('click', () => {
  if (selectedModel) {
    const deleteButton = document.getElementById('delete-model');
    const modelStatus = document.getElementById('model-status');
        
    // Disable button and update status
    deleteButton.disabled = true;
        
    if (modelStatus) {
      modelStatus.textContent = 'Deleting model...';
    }
        
    ipcRenderer.send('model:delete', selectedModel.id);
  }
});

// Handle delete completion
ipcRenderer.on('model:deleteComplete', (event, { modelId, success }) => {
  const modelStatus = document.getElementById('model-status');
  const deleteButton = document.getElementById('delete-model');
  const downloadButton = document.getElementById('download-model');
    
  if (success) {
    if (modelStatus) {
      modelStatus.textContent = 'Model deleted successfully';
    }
        
    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.style.display = 'none';
    }
        
    if (downloadButton) {
      downloadButton.style.display = 'inline-block';
    }
        
    // Refresh model data
    ipcRenderer.send('settings:getSelectedModel');
  } else {
    if (modelStatus) {
      modelStatus.textContent = 'Error: Could not delete model';
      modelStatus.style.color = 'red';
    }
        
    if (deleteButton) {
      deleteButton.disabled = false;
    }
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

function updateModelUI() {
  const selectedModel = window.electronAPI.getSelectedModel();
  const modelSelect = document.getElementById('model-select');
  const downloadButton = document.getElementById('download-model');
  const deleteButton = document.getElementById('delete-model');
  const modelInfo = document.getElementById('model-info');
  const downloadProgress = document.getElementById('download-progress-container');
    
  // Hide progress initially
  downloadProgress.style.display = 'none';
    
  // Populate model dropdown
  if (modelSelect.options.length === 0) {
    const models = window.electronAPI.getAvailableModels();
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
  }
    
  if (selectedModel) {
    // Set the selected model in dropdown
    modelSelect.value = selectedModel.id;
        
    // Show model info
    modelInfo.innerHTML = `
            <p><strong>Model:</strong> ${selectedModel.name}</p>
            <p><strong>Size:</strong> ${selectedModel.size}</p>
            <p><strong>RAM Required:</strong> ${selectedModel.memoryRequirement}</p>
            <p><strong>Status:</strong> <span id="model-status">${selectedModel.status}</span></p>
        `;
        
    // Update buttons based on model status
    if (selectedModel.status === 'ready') {
      downloadButton.style.display = 'none';
      deleteButton.style.display = 'inline-block';
    } else if (selectedModel.status === 'downloading') {
      downloadButton.style.display = 'none';
      deleteButton.style.display = 'none';
      downloadProgress.style.display = 'block';
    } else {
      downloadButton.style.display = 'inline-block';
      deleteButton.style.display = 'none';
    }
  }
}

// Handle model directory save
document.getElementById('save-model-directory')?.addEventListener('click', () => {
  const modelDirectoryInput = document.getElementById('model-directory-input');
  const modelDirectoryStatus = document.getElementById('model-directory-status');
  
  if (modelDirectoryInput) {
    const newDirectory = modelDirectoryInput.value.trim();
    
    if (newDirectory && newDirectory !== modelDirectory) {
      ipcRenderer.send('settings:setModelDirectory', newDirectory);
      
      if (modelDirectoryStatus) {
        modelDirectoryStatus.textContent = 'Saving directory...';
        modelDirectoryStatus.style.color = '#666';
      }
    } else {
      if (modelDirectoryStatus) {
        modelDirectoryStatus.textContent = 'No changes to save';
        modelDirectoryStatus.style.color = '#666';
        
        // Clear the status message after 3 seconds
        setTimeout(() => {
          modelDirectoryStatus.textContent = '';
        }, 3000);
      }
    }
  }
});

// Handle directory browse button
document.getElementById('browse-model-directory')?.addEventListener('click', () => {
  ipcRenderer.send('dialog:openDirectory');
});

// Handle the selected directory from the dialog
ipcRenderer.on('dialog:selectedDirectory', (event, directory) => {
  if (directory) {
    const modelDirectoryInput = document.getElementById('model-directory-input');
    if (modelDirectoryInput) {
      modelDirectoryInput.value = directory;
    }
  }
}); 