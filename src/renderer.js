const { ipcRenderer } = require('electron');

// Get DOM elements
const form = document.querySelector('form');
const input = document.querySelector('input[type="text"]');
const responseElement = document.getElementById('response');
const updateStatusElement = document.getElementById('update-status');

// Set up IPC listeners
ipcRenderer.on('response', (event, response) => {
    responseElement.textContent = response;
});

ipcRenderer.on('error', (event, error) => {
    responseElement.textContent = `Error: ${error}`;
});

// Handle update messages
ipcRenderer.on('update-message', (event, message) => {
    if (updateStatusElement) {
        updateStatusElement.textContent = message;
    }
    console.log('Update status:', message);
});

// Handle form submission
if (form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = input.value;
        ipcRenderer.send('query', query);
        input.value = '';
    });
} 