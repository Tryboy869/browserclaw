/**
 * model-registry.js - Curated Model Registry
 * 
 * This file exports a static array of recommended models for local inference.
 * These models are selected for their balance of size, performance, and capability.
 * 
 * Categories:
 * - LLM (Lightweight): Small language models for general use
 * - Whisper: Speech-to-text models
 */

/**
 * Model categories
 */
export const MODEL_CATEGORIES = {
  LLM: 'llm',
  WHISPER: 'whisper'
};

/**
 * Model capabilities
 */
export const MODEL_CAPABILITIES = {
  CHAT: 'chat',
  CODE: 'code',
  REASONING: 'reasoning',
  MULTILINGUAL: 'multilingual',
  VISION: 'vision',
  FUNCTION_CALLING: 'function_calling'
};

/**
 * Curated model registry
 * These are recommended models that work well in browser environments
 */
export const MODEL_REGISTRY = [
  // ==================== LLM - Lightweight ====================
  {
    id: 'Qwen/Qwen2.5-0.5B-Instruct',
    name: 'Qwen 2.5 0.5B Instruct',
    category: MODEL_CATEGORIES.LLM,
    size: '~400MB',
    sizeBytes: 400 * 1024 * 1024,
    vramGB: 1,
    description: 'Ultra-lightweight instruction-tuned model. Perfect for simple Q&A and fast replies.',
    capabilities: [MODEL_CAPABILITIES.CHAT, MODEL_CAPABILITIES.MULTILINGUAL],
    bestFor: ['Simple Q&A', 'Fast replies', 'Low-resource devices'],
    benchmarkScore: 65,
    contextWindow: 32768,
    license: 'Apache-2.0',
    tags: ['qwen', 'instruction', 'lightweight'],
    recommended: true
  },
  {
    id: 'Qwen/Qwen2.5-1.5B-Instruct',
    name: 'Qwen 2.5 1.5B Instruct',
    category: MODEL_CATEGORIES.LLM,
    size: '~1GB',
    sizeBytes: 1024 * 1024 * 1024,
    vramGB: 2,
    description: 'Good balance of performance and size. Strong multilingual capabilities.',
    capabilities: [MODEL_CAPABILITIES.CHAT, MODEL_CAPABILITIES.CODE, MODEL_CAPABILITIES.MULTILINGUAL],
    bestFor: ['General chat', 'Code assistance', 'Multilingual tasks'],
    benchmarkScore: 72,
    contextWindow: 32768,
    license: 'Apache-2.0',
    tags: ['qwen', 'instruction', 'balanced'],
    recommended: true
  },
  {
    id: 'Qwen/Qwen2.5-3B-Instruct',
    name: 'Qwen 2.5 3B Instruct',
    category: MODEL_CATEGORIES.LLM,
    size: '~2GB',
    sizeBytes: 2 * 1024 * 1024 * 1024,
    vramGB: 4,
    description: 'Enhanced reasoning and code capabilities with long context support.',
    capabilities: [MODEL_CAPABILITIES.CHAT, MODEL_CAPABILITIES.CODE, MODEL_CAPABILITIES.REASONING, MODEL_CAPABILITIES.MULTILINGUAL],
    bestFor: ['Reasoning tasks', 'Code generation', 'Long context'],
    benchmarkScore: 78,
    contextWindow: 32768,
    license: 'Apache-2.0',
    tags: ['qwen', 'instruction', 'reasoning'],
    recommended: true
  },
  {
    id: 'microsoft/phi-2',
    name: 'Microsoft Phi-2',
    category: MODEL_CATEGORIES.LLM,
    size: '~1.5GB',
    sizeBytes: 1.5 * 1024 * 1024 * 1024,
    vramGB: 3,
    description: 'Compact but powerful model with strong math and logic capabilities.',
    capabilities: [MODEL_CAPABILITIES.CHAT, MODEL_CAPABILITIES.CODE, MODEL_CAPABILITIES.REASONING],
    bestFor: ['Math problems', 'Logical reasoning', 'Compact deployment'],
    benchmarkScore: 76,
    contextWindow: 2048,
    license: 'MIT',
    tags: ['phi', 'microsoft', 'math'],
    recommended: true
  },
  {
    id: 'TinyLlama/TinyLlama-1.1B-Chat',
    name: 'TinyLlama 1.1B Chat',
    category: MODEL_CATEGORIES.LLM,
    size: '~600MB',
    sizeBytes: 600 * 1024 * 1024,
    vramGB: 1.5,
    description: 'Ultra-fast, ultra-compact chat model. Great for quick responses.',
    capabilities: [MODEL_CAPABILITIES.CHAT],
    bestFor: ['Ultra-fast responses', 'Low VRAM usage', 'Simple chat'],
    benchmarkScore: 62,
    contextWindow: 2048,
    license: 'Apache-2.0',
    tags: ['tinyllama', 'chat', 'ultra-lightweight'],
    recommended: false
  },
  {
    id: 'google/gemma-2b-it',
    name: 'Google Gemma 2B Instruct',
    category: MODEL_CATEGORIES.LLM,
    size: '~1.5GB',
    sizeBytes: 1.5 * 1024 * 1024 * 1024,
    vramGB: 3,
    description: 'Google\'s lightweight instruction-tuned model with good general capabilities.',
    capabilities: [MODEL_CAPABILITIES.CHAT, MODEL_CAPABILITIES.CODE, MODEL_CAPABILITIES.MULTILINGUAL],
    bestFor: ['General tasks', 'Instruction following', 'Safe responses'],
    benchmarkScore: 70,
    contextWindow: 8192,
    license: 'Gemma',
    tags: ['gemma', 'google', 'instruction'],
    recommended: false
  },
  {
    id: 'HuggingFaceTB/SmolLM-1.7B-Instruct',
    name: 'SmolLM 1.7B Instruct',
    category: MODEL_CATEGORIES.LLM,
    size: '~1GB',
    sizeBytes: 1024 * 1024 * 1024,
    vramGB: 2.5,
    description: 'Small but mighty language model optimized for instruction following.',
    capabilities: [MODEL_CAPABILITIES.CHAT, MODEL_CAPABILITIES.CODE],
    bestFor: ['Instruction following', 'Efficient inference', 'General chat'],
    benchmarkScore: 68,
    contextWindow: 2048,
    license: 'Apache-2.0',
    tags: ['smollm', 'instruction', 'efficient'],
    recommended: false
  },
  
  // ==================== Whisper - Speech-to-Text ====================
  {
    id: 'openai/whisper-tiny',
    name: 'Whisper Tiny',
    category: MODEL_CATEGORIES.WHISPER,
    size: '~150MB',
    sizeBytes: 150 * 1024 * 1024,
    vramGB: 0.5,
    description: 'Fastest Whisper model. Good for simple commands and quick transcriptions.',
    capabilities: ['transcription', 'translation'],
    bestFor: ['Fast transcription', 'Voice commands', 'Real-time use'],
    benchmarkScore: 70,
    languages: ['multilingual'],
    license: 'MIT',
    tags: ['whisper', 'speech', 'fast'],
    recommended: true
  },
  {
    id: 'openai/whisper-base',
    name: 'Whisper Base',
    category: MODEL_CATEGORIES.WHISPER,
    size: '~290MB',
    sizeBytes: 290 * 1024 * 1024,
    vramGB: 1,
    description: 'Good balance of speed and accuracy for general transcription.',
    capabilities: ['transcription', 'translation'],
    bestFor: ['General transcription', 'Voice input', 'Balanced performance'],
    benchmarkScore: 78,
    languages: ['multilingual'],
    license: 'MIT',
    tags: ['whisper', 'speech', 'balanced'],
    recommended: true
  },
  {
    id: 'openai/whisper-small',
    name: 'Whisper Small',
    category: MODEL_CATEGORIES.WHISPER,
    size: '~460MB',
    sizeBytes: 460 * 1024 * 1024,
    vramGB: 1.5,
    description: 'High accuracy multilingual speech recognition.',
    capabilities: ['transcription', 'translation'],
    bestFor: ['High accuracy', 'Multilingual speech', 'Quality transcription'],
    benchmarkScore: 85,
    languages: ['multilingual'],
    license: 'MIT',
    tags: ['whisper', 'speech', 'accurate'],
    recommended: true
  },
  {
    id: 'openai/whisper-medium',
    name: 'Whisper Medium',
    category: MODEL_CATEGORIES.WHISPER,
    size: '~1.5GB',
    sizeBytes: 1.5 * 1024 * 1024 * 1024,
    vramGB: 4,
    description: 'Very high accuracy for demanding transcription tasks.',
    capabilities: ['transcription', 'translation'],
    bestFor: ['Professional transcription', 'Difficult audio', 'Maximum accuracy'],
    benchmarkScore: 90,
    languages: ['multilingual'],
    license: 'MIT',
    tags: ['whisper', 'speech', 'professional'],
    recommended: false
  }
];

/**
 * Get models by category
 * @param {string} category 
 * @returns {Array}
 */
export function getModelsByCategory(category) {
  return MODEL_REGISTRY.filter(m => m.category === category);
}

/**
 * Get recommended models
 * @returns {Array}
 */
export function getRecommendedModels() {
  return MODEL_REGISTRY.filter(m => m.recommended);
}

/**
 * Get model by ID
 * @param {string} modelId 
 * @returns {Object|null}
 */
export function getModelById(modelId) {
  return MODEL_REGISTRY.find(m => m.id === modelId) || null;
}

/**
 * Get models by capability
 * @param {string} capability 
 * @returns {Array}
 */
export function getModelsByCapability(capability) {
  return MODEL_REGISTRY.filter(m => m.capabilities.includes(capability));
}

/**
 * Get models by VRAM requirement
 * @param {number} maxVramGB 
 * @returns {Array}
 */
export function getModelsByVram(maxVramGB) {
  return MODEL_REGISTRY.filter(m => m.vramGB <= maxVramGB);
}

/**
 * Search models
 * @param {string} query 
 * @returns {Array}
 */
export function searchModels(query) {
  const lowerQuery = query.toLowerCase();
  return MODEL_REGISTRY.filter(m => 
    m.name.toLowerCase().includes(lowerQuery) ||
    m.id.toLowerCase().includes(lowerQuery) ||
    m.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    m.bestFor.some(bf => bf.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get model download URL from HuggingFace
 * @param {string} modelId 
 * @returns {string}
 */
export function getModelDownloadUrl(modelId) {
  return `https://huggingface.co/${modelId}/resolve/main/onnx/model.onnx`;
}

/**
 * Get model card URL
 * @param {string} modelId 
 * @returns {string}
 */
export function getModelCardUrl(modelId) {
  return `https://huggingface.co/${modelId}`;
}

export default {
  MODEL_REGISTRY,
  MODEL_CATEGORIES,
  MODEL_CAPABILITIES,
  getModelsByCategory,
  getRecommendedModels,
  getModelById,
  getModelsByCapability,
  getModelsByVram,
  searchModels,
  getModelDownloadUrl,
  getModelCardUrl
};
