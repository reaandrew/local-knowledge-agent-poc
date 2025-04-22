const { models } = require('../models');

describe('Models Configuration', () => {
  it('should export an array of models', () => {
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('should have TinyLlama model with correct structure', () => {
    const tinyLlama = models.find(model => model.id === 'tinyllama-1.1b');
    expect(tinyLlama).toBeDefined();
    expect(tinyLlama.name).toBe('TinyLlama 1.1B');
    expect(tinyLlama.description).toBe('A small, efficient language model with 1.1B parameters');
    expect(tinyLlama.url).toContain('huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0');
    expect(tinyLlama.size).toBe('1.1GB');
    expect(tinyLlama.format).toBe('safetensors');
    expect(tinyLlama.requirements).toEqual({
      minMemory: '4GB',
      recommendedMemory: '8GB'
    });
  });

  it('should have Phi-2 model with correct structure', () => {
    const phi2 = models.find(model => model.id === 'phi-2');
    expect(phi2).toBeDefined();
    expect(phi2.name).toBe('Microsoft Phi-2');
    expect(phi2.description).toBe('A 2.7B parameter model with strong reasoning capabilities');
    expect(phi2.url).toContain('huggingface.co/microsoft/phi-2');
    expect(phi2.size).toBe('2.7GB');
    expect(phi2.format).toBe('safetensors');
    expect(phi2.requirements).toEqual({
      minMemory: '8GB',
      recommendedMemory: '16GB'
    });
  });

  it('should have Neural Chat 7B model with correct structure', () => {
    const neuralChat = models.find(model => model.id === 'neural-chat-7b');
    expect(neuralChat).toBeDefined();
    expect(neuralChat.name).toBe('Neural Chat 7B');
    expect(neuralChat.description).toBe('A 7B parameter model optimized for chat interactions');
    expect(neuralChat.url).toContain('huggingface.co/Intel/neural-chat-7b-v3-1');
    expect(neuralChat.size).toBe('7GB');
    expect(neuralChat.format).toBe('safetensors');
    expect(neuralChat.requirements).toEqual({
      minMemory: '16GB',
      recommendedMemory: '32GB'
    });
  });

  it('should have models with unique IDs', () => {
    const ids = models.map(model => model.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });
}); 