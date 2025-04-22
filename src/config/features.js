// Feature toggle configuration
const features = {
    CHAT_INTERFACE: false,      // Controls the chat UI components
    SETTINGS_PANEL: false,      // Controls the settings panel UI
    LOCAL_LLM: false,          // Controls local LLM integration
    MODEL_DOWNLOAD: false,      // Controls model download functionality
};

// Helper function to check if a feature is enabled
function isFeatureEnabled(featureName) {
    return features[featureName] || false;
}

// Helper function to enable a feature
function enableFeature(featureName) {
    if (features.hasOwnProperty(featureName)) {
        features[featureName] = true;
    }
}

// Helper function to disable a feature
function disableFeature(featureName) {
    if (features.hasOwnProperty(featureName)) {
        features[featureName] = false;
    }
}

module.exports = {
    features,
    isFeatureEnabled,
    enableFeature,
    disableFeature
}; 