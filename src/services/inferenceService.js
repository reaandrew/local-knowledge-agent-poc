const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const log = require('electron-log');
const fetch = require('node-fetch');
const modelManager = require('./modelManager');
const settings = require('../store/settings');

class InferenceService {
  constructor() {
    this.inferenceProcess = null;
    this.isReady = false;
    this.modelPath = null;
    this.inferenceCommand = 'llama-cpp-server'; // Default command
  }

  async startInference(modelId) {
    // Check if already running
    if (this.inferenceProcess && this.isReady) {
      log.info('Inference service is already running');
      return true;
    }

    // Get model
    const model = modelManager.getModelById(modelId);
    if (!model) {
      log.error(`Model ${modelId} not found`);
      throw new Error(`Model ${modelId} not found`);
    }

    // Check if model is downloaded
    const isDownloaded = modelManager.isModelDownloaded(modelId);
    if (!isDownloaded) {
      log.error(`Model ${modelId} is not downloaded`);
      throw new Error(`Model ${modelId} is not downloaded. Please download the model first.`);
    }

    this.modelPath = modelManager.getModelPath(modelId);
    log.info(`Starting inference with model: ${this.modelPath}`);

    try {
      // Check if llama-cpp-server is installed
      const tempFilePath = path.join(os.tmpdir(), 'llama-cpp-check.txt');
      
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // Ignore if file doesn't exist
      }

      // Try to get llama-cpp-server version
      const checkResult = spawn('llama-cpp-server', ['--version']);
      
      checkResult.on('error', (err) => {
        log.error(`Error checking llama-cpp-server: ${err.message}`);
        throw new Error('llama-cpp-server is not installed or not in PATH. Please install llama-cpp-server first.');
      });

      // Start the inference server with the selected model
      this.inferenceProcess = spawn(this.inferenceCommand, [
        '--model', this.modelPath,
        '--host', '127.0.0.1',
        '--port', '8080',
        '--ctx-size', '2048',
        '--threads', Math.max(1, Math.floor(os.cpus().length / 2))
      ]);

      // Log output
      this.inferenceProcess.stdout.on('data', (data) => {
        const output = data.toString();
        log.info(`Inference stdout: ${output}`);
        if (output.includes('HTTP server listening')) {
          this.isReady = true;
          log.info('Inference service is ready');
        }
      });

      this.inferenceProcess.stderr.on('data', (data) => {
        log.error(`Inference stderr: ${data.toString()}`);
      });

      this.inferenceProcess.on('close', (code) => {
        log.info(`Inference process exited with code ${code}`);
        this.isReady = false;
        this.inferenceProcess = null;
      });

      // Wait for server to start
      return new Promise((resolve, reject) => {
        // Set timeout to wait for server to start
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for inference server to start'));
        }, 30000); // 30 seconds timeout

        const checkInterval = setInterval(() => {
          if (this.isReady) {
            clearTimeout(timeout);
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 500);

        // Handle process error
        this.inferenceProcess.on('error', (err) => {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          log.error(`Failed to start inference process: ${err.message}`);
          reject(err);
        });
      });
    } catch (error) {
      log.error(`Error starting inference: ${error.message}`);
      throw error;
    }
  }

  async stopInference() {
    if (this.inferenceProcess) {
      log.info('Stopping inference service');
      this.inferenceProcess.kill();
      this.inferenceProcess = null;
      this.isReady = false;
      return true;
    }
    return false;
  }

  async query(prompt, options = {}) {
    if (!this.isReady || !this.inferenceProcess) {
      log.error('Inference service is not ready');
      throw new Error('Inference service is not ready. Please start the inference service first.');
    }

    try {
      log.info(`Sending query: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
      
      // Default options
      const defaultOptions = {
        temperature: 0.7,
        max_tokens: 1024,
        stop: ['<|endoftext|>', '</s>'],
        stream: false
      };
      
      const requestOptions = { ...defaultOptions, ...options };
      
      // Call to the local server
      const response = await fetch('http://127.0.0.1:8080/v1/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          temperature: requestOptions.temperature,
          max_tokens: requestOptions.max_tokens,
          stop: requestOptions.stop,
          stream: requestOptions.stream
        })
      });

      if (!response.ok) {
        const error = await response.text();
        log.error(`Error from inference server: ${error}`);
        throw new Error(`Error from inference server: ${error}`);
      }

      const result = await response.json();
      return result.choices[0].text;
    } catch (error) {
      log.error(`Error querying model: ${error.message}`);
      throw error;
    }
  }

  isInferenceRunning() {
    return this.isReady && this.inferenceProcess !== null;
  }
}

module.exports = new InferenceService(); 