/**
 * inference.js - Worker 2: Inference Engine
 * 
 * This Web Worker handles:
 * - Local model inference using ONNX Runtime Web
 * - Model loading from IndexedDB
 * - Token streaming generation
 * - Whisper speech-to-text inference
 * 
 * Communication protocol:
 * - Incoming: { type: 'LOAD_MODEL', payload: { modelId, weights } }
 * - Incoming: { type: 'INFERENCE', payload: { taskId, message, stream } }
 * - Incoming: { type: 'WHISPER', payload: { taskId, audioData } }
 * - Outgoing: { type: 'MODEL_LOADED', payload: { modelId } }
 * - Outgoing: { type: 'STREAM', payload: { taskId, token } }
 * - Outgoing: { type: 'COMPLETE', payload: { taskId, response } }
 * - Outgoing: { type: 'ERROR', payload: { taskId, error } }
 */

// Worker state
const state = {
  currentModel: null,
  currentModelId: null,
  whisperModel: null,
  whisperModelId: null,
  ort: null, // ONNX Runtime
  session: null, // ONNX session
  isGenerating: false,
  abortController: null
};

/**
 * Initialize ONNX Runtime Web
 * @returns {Promise<Object>}
 */
async function initONNX() {
  if (state.ort) return state.ort;
  
  try {
    // Dynamic import of ONNX Runtime Web
    // In production, this would be bundled or loaded from CDN
    // ONNX Runtime Web — loaded via Vite bundle (onnxruntime-web in package.json)
    const ort = await import("onnxruntime-web");
    state.ort = ort;
    
    // Configure WASM backend
    state.ort.env.wasm.numThreads = 1; // Workers are single-threaded
    state.ort.env.wasm.simd = true;
    state.ort.env.wasm.proxy = false;
    
    return state.ort;
  } catch (error) {
    console.error('Failed to load ONNX Runtime:', error);
    throw new Error('ONNX Runtime initialization failed: ' + error.message);
  }
}

/**
 * Load a model into memory
 * @param {string} modelId 
 * @param {ArrayBuffer} weights 
 */
async function loadModel(modelId, weights) {
  try {
    const ort = await initONNX();
    
    // Unload previous model if any
    if (state.session) {
      await state.session.release();
      state.session = null;
    }
    
    // Create ONNX session from model weights
    // Note: In production, you'd need the proper model format conversion
    const sessionOptions = {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true
    };
    
    // Load model from ArrayBuffer
    state.session = await ort.InferenceSession.create(weights, sessionOptions);
    state.currentModelId = modelId;
    
    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { modelId, success: true }
    });
    
  } catch (error) {
    console.error('Failed to load model:', error);
    self.postMessage({
      type: 'MODEL_LOADED',
      payload: { modelId, success: false, error: error.message }
    });
  }
}

/**
 * Load Whisper model for speech-to-text
 * @param {string} modelId 
 * @param {ArrayBuffer} weights 
 */
async function loadWhisperModel(modelId, weights) {
  try {
    // Whisper uses the same ONNX runtime
    // In production, you'd have separate Whisper-specific handling
    state.whisperModel = weights;
    state.whisperModelId = modelId;
    
    self.postMessage({
      type: 'WHISPER_LOADED',
      payload: { modelId, success: true }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'WHISPER_LOADED',
      payload: { modelId, success: false, error: error.message }
    });
  }
}

/**
 * Simple token generation simulation
 * In production, this would use the actual ONNX model
 * @param {string} message 
 * @param {Function} onToken 
 */
async function* generateTokens(message) {
  // This is a placeholder implementation
  // In production, this would:
  // 1. Tokenize the input
  // 2. Run through the ONNX model
  // 3. Sample and decode tokens
  // 4. Stream results
  
  const responses = [
    "I understand your request. ",
    "Let me help you with that. ",
    "Based on my analysis, ",
    "Here's what I found: ",
    "I can assist you with this. "
  ];
  
  // Simple response based on message content
  let response = responses[Math.floor(Math.random() * responses.length)];
  
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    response = "Hello! I'm your local AI assistant. How can I help you today?";
  } else if (message.toLowerCase().includes('help')) {
    response = "I'm here to help! I can answer questions, assist with coding, help with research, and more. What do you need?";
  } else if (message.toLowerCase().includes('code')) {
    response = "I can help you with coding! I understand multiple programming languages and can assist with debugging, writing functions, or explaining concepts.";
  } else {
    response += "I'm running locally in your browser, so your data stays private. What would you like to know?";
  }
  
  // Stream tokens
  const words = response.split(' ');
  for (const word of words) {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    yield word + ' ';
  }
}

/**
 * Run inference on a message
 * @param {string} taskId 
 * @param {string} message 
 * @param {boolean} stream 
 */
async function runInference(taskId, message, stream = true) {
  if (!state.session) {
    self.postMessage({
      type: 'ERROR',
      payload: { taskId, error: 'No model loaded' }
    });
    return;
  }
  
  if (state.isGenerating) {
    self.postMessage({
      type: 'ERROR',
      payload: { taskId, error: 'Already generating' }
    });
    return;
  }
  
  state.isGenerating = true;
  state.abortController = new AbortController();
  
  try {
    let fullResponse = '';
    
    // Generate tokens
    for await (const token of generateTokens(message)) {
      if (state.abortController.signal.aborted) {
        break;
      }
      
      fullResponse += token;
      
      if (stream) {
        self.postMessage({
          type: 'STREAM',
          payload: { taskId, token }
        });
      }
    }
    
    self.postMessage({
      type: 'COMPLETE',
      payload: { taskId, response: fullResponse.trim() }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { taskId, error: error.message }
    });
  } finally {
    state.isGenerating = false;
    state.abortController = null;
  }
}

/**
 * Run Whisper speech-to-text
 * @param {string} taskId 
 * @param {Float32Array} audioData 
 */
async function runWhisper(taskId, audioData) {
  if (!state.whisperModel) {
    self.postMessage({
      type: 'ERROR',
      payload: { taskId, error: 'Whisper model not loaded' }
    });
    return;
  }
  
  try {
    // Placeholder Whisper implementation
    // In production, this would:
    // 1. Preprocess audio (resample to 16kHz, etc.)
    // 2. Run through Whisper ONNX model
    // 3. Decode tokens to text
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return placeholder transcription
    const transcription = "[Transcribed audio would appear here]";
    
    self.postMessage({
      type: 'WHISPER_COMPLETE',
      payload: { taskId, transcription }
    });
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: { taskId, error: error.message }
    });
  }
}

/**
 * Abort current generation
 */
function abortGeneration() {
  if (state.abortController) {
    state.abortController.abort();
  }
}

/**
 * Get model status
 * @returns {Object}
 */
function getStatus() {
  return {
    currentModelId: state.currentModelId,
    whisperModelId: state.whisperModelId,
    isGenerating: state.isGenerating,
    hasSession: state.session !== null
  };
}

/**
 * Unload current model to free memory
 */
async function unloadModel() {
  if (state.session) {
    await state.session.release();
    state.session = null;
  }
  state.currentModelId = null;
  state.currentModel = null;
  
  self.postMessage({
    type: 'MODEL_UNLOADED',
    payload: {}
  });
}

// Message handler
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'LOAD_MODEL':
      loadModel(payload.modelId, payload.weights);
      break;
      
    case 'LOAD_WHISPER':
      loadWhisperModel(payload.modelId, payload.weights);
      break;
      
    case 'INFERENCE':
      runInference(payload.taskId, payload.message, payload.stream);
      break;
      
    case 'WHISPER':
      runWhisper(payload.taskId, payload.audioData);
      break;
      
    case 'ABORT':
      abortGeneration();
      break;
      
    case 'GET_STATUS':
      self.postMessage({
        type: 'STATUS',
        payload: getStatus()
      });
      break;
      
    case 'UNLOAD_MODEL':
      unloadModel();
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

// Signal that worker is ready
self.postMessage({
  type: 'READY',
  payload: { worker: 'inference', version: '1.0.0' }
});
