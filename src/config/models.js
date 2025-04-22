// Available models configuration
const models = [
    {
        id: 'tinyllama-1.1b',
        name: 'TinyLlama 1.1B',
        description: 'A small, efficient language model with 1.1B parameters',
        url: 'https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0/resolve/main/model.safetensors',
        size: '1.1GB',
        format: 'safetensors',
        requirements: {
            minMemory: '4GB',
            recommendedMemory: '8GB'
        }
    },
    {
        id: 'phi-2',
        name: 'Microsoft Phi-2',
        description: 'A 2.7B parameter model with strong reasoning capabilities',
        url: 'https://huggingface.co/microsoft/phi-2/resolve/main/model.safetensors',
        size: '2.7GB',
        format: 'safetensors',
        requirements: {
            minMemory: '8GB',
            recommendedMemory: '16GB'
        }
    },
    {
        id: 'neural-chat-7b',
        name: 'Neural Chat 7B',
        description: 'A 7B parameter model optimized for chat interactions',
        url: 'https://huggingface.co/Intel/neural-chat-7b-v3-1/resolve/main/model.safetensors',
        size: '7GB',
        format: 'safetensors',
        requirements: {
            minMemory: '16GB',
            recommendedMemory: '32GB'
        }
    }
];

module.exports = {
    models
}; 