/**
 * @jest-environment jsdom
 */

// Mock the electron module
jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn((event, callback) => {
      // Store the callback for later use in tests
      if (event === 'response') {
        module.exports.responseCallback = callback;
      } else if (event === 'error') {
        module.exports.errorCallback = callback;
      } else if (event === 'settings:features') {
        module.exports.featuresCallback = callback;
      }
    }),
    send: jest.fn(),
    removeListener: jest.fn(),
  },
}));

describe('renderer.js', () => {
  let ipcRenderer;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up the DOM
    document.body.innerHTML = `
      <div class="container">
        <h1>Local Knowledge Agent</h1>
        <div id="settings-panel">
          <h2>Settings</h2>
          <div id="model-status"></div>
          <div id="model-selection">
            <h3>Select Model</h3>
            <select id="model-select">
              <option value="">Choose a model...</option>
            </select>
            <button id="download-model">Download Model</button>
          </div>
        </div>
        <div id="chat-interface">
          <div class="chat-container" id="chat-messages"></div>
          <form id="query-form">
            <input type="text" id="query-input" placeholder="Type your message..." required>
            <button type="submit">Send</button>
          </form>
        </div>
        <div id="query-interface">
          <form>
            <input type="text" placeholder="Enter your query">
            <button type="submit">Submit</button>
          </form>
          <div id="result"></div>
        </div>
        <div id="update-status"></div>
      </div>
    `;
    
    // Get the mocked ipcRenderer
    ipcRenderer = require('electron').ipcRenderer;

    // Import the renderer file after setting up the DOM
    jest.isolateModules(() => {
      require('../src/renderer');
    });

    // Enable chat interface feature
    const featuresCallback = module.exports.featuresCallback;
    if (featuresCallback) {
      featuresCallback(null, { CHAT_INTERFACE: true });
    }
  });

  test('sets up IPC listeners', () => {
    // Verify that IPC listeners are set up
    expect(ipcRenderer.on).toHaveBeenCalledWith('response', expect.any(Function));
    expect(ipcRenderer.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('handles form submission', () => {
    // Get the form and input elements
    const form = document.getElementById('query-form');
    const input = document.getElementById('query-input');
    
    // Set a test value
    input.value = 'test query';
    
    // Create a submit event
    const submitEvent = new Event('submit');
    submitEvent.preventDefault = jest.fn();
    
    // Dispatch the event
    form.dispatchEvent(submitEvent);
    
    // Verify that preventDefault was called
    expect(submitEvent.preventDefault).toHaveBeenCalled();
    
    // Get all IPC send calls
    const sendCalls = ipcRenderer.send.mock.calls;
    
    // Find the query call
    const queryCall = sendCalls.find(call => call[0] === 'query');
    
    // Verify that the query IPC message was sent
    expect(queryCall).toBeDefined();
    expect(queryCall[1]).toBe('test query');
  });

  test('handles response from main process', () => {
    // Get the response element
    const resultElement = document.getElementById('result');
    
    // Get the stored response callback
    const responseCallback = module.exports.responseCallback;
    
    // Call the callback with a test response
    responseCallback(null, 'test response');
    
    // Verify that the response was displayed
    expect(resultElement.textContent).toBe('test response');
  });

  test('handles error from main process', () => {
    // Get the response element
    const resultElement = document.getElementById('result');
    
    // Get the stored error callback
    const errorCallback = module.exports.errorCallback;
    
    // Call the callback with a test error
    errorCallback(null, 'test error');
    
    // Verify that the error was displayed
    expect(resultElement.textContent).toBe('Error: test error');
  });
}); 