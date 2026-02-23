/**
 * task-router.js - Worker 1: Task Router
 * 
 * This Web Worker handles:
 * - Complexity scoring of incoming tasks (0-10 scale)
 * - Routing decisions (LOCAL vs CLOUD)
 * - Task queue management with priority levels
 * - Context enrichment via RAG Booster
 * 
 * Communication protocol with main thread:
 * - Incoming: { type: 'TASK', payload: { id, message, channel, userId, metadata } }
 * - Outgoing: { type: 'ROUTED', payload: { taskId, route, complexity, context } }
 * - Outgoing: { type: 'STREAM', payload: { taskId, token } }
 * - Outgoing: { type: 'COMPLETE', payload: { taskId, response } }
 * - Outgoing: { type: 'ERROR', payload: { taskId, error } }
 */

// Worker state
const state = {
  queue: [],
  currentTask: null,
  config: {
    mode: 'auto', // 'auto' | 'local' | 'cloud'
    threshold: 6,
    privacyMode: false
  },
  localModelLoaded: false,
  cloudAvailable: false,
  ragBooster: null
};

// Priority levels
const PRIORITY = {
  URGENT: 3,
  NORMAL: 2,
  BACKGROUND: 1
};

// Maximum queue depth
const MAX_QUEUE_DEPTH = 50;

/**
 * Count tokens in text (approximation)
 * @param {string} text 
 * @returns {number}
 */
function countTokens(text) {
  // Simple approximation: ~4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Calculate complexity score (0-10)
 * @param {Object} task 
 * @returns {number}
 */
function calculateComplexity(task) {
  let score = 0;
  const message = task.message || '';
  const lowerMessage = message.toLowerCase();
  
  // Token count scoring
  const tokenCount = countTokens(message);
  if (tokenCount > 1000) score += 2;
  if (tokenCount > 4000) score += 2;
  
  // Multi-step detection
  const multiStepKeywords = ['then', 'after', 'next', 'first', 'second', 'third', 'finally', 'step'];
  const hasMultiStep = multiStepKeywords.some(kw => lowerMessage.includes(kw));
  const hasNumberedSteps = /\b\d+\s*[.)]\s+\w+/.test(message);
  if (hasMultiStep || hasNumberedSteps) score += 3;
  
  // Domain-specific detection
  const domainKeywords = {
    code: ['code', 'function', 'programming', 'javascript', 'python', 'debug', 'error'],
    math: ['calculate', 'solve', 'equation', 'math', 'formula', 'compute'],
    law: ['legal', 'law', 'contract', 'regulation', 'compliance']
  };
  
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some(kw => lowerMessage.includes(kw))) {
      score += 2;
      break; // Only add once
    }
  }
  
  // Real-time requirement (forces local but doesn't add to score)
  const realtimeKeywords = ['now', 'immediately', 'quick', 'fast', 'urgent'];
  task.realtime = realtimeKeywords.some(kw => lowerMessage.includes(kw));
  
  // Privacy flag detection
  const privacyKeywords = ['private', 'confidential', 'secret', 'personal'];
  task.privacyFlag = privacyKeywords.some(kw => lowerMessage.includes(kw)) || state.config.privacyMode;
  
  // Cap at 10
  return Math.min(score, 10);
}

/**
 * Determine priority level based on complexity and flags
 * @param {Object} task 
 * @param {number} complexity 
 * @returns {number}
 */
function determinePriority(task, complexity) {
  if (complexity >= 8 || task.realtime) {
    return PRIORITY.URGENT;
  } else if (complexity >= 4) {
    return PRIORITY.NORMAL;
  } else {
    return PRIORITY.BACKGROUND;
  }
}

/**
 * Make routing decision
 * @param {Object} task 
 * @param {number} complexity 
 * @returns {string} 'LOCAL' | 'CLOUD'
 */
function makeRoutingDecision(task, complexity) {
  // Force privacy mode
  if (task.privacyFlag) {
    return 'LOCAL';
  }
  
  // Force local for real-time if model is loaded
  if (task.realtime && state.localModelLoaded) {
    return 'LOCAL';
  }
  
  // Manual mode overrides
  if (state.config.mode === 'local') {
    return state.localModelLoaded ? 'LOCAL' : 'CLOUD';
  }
  if (state.config.mode === 'cloud') {
    return state.cloudAvailable ? 'CLOUD' : 'LOCAL';
  }
  
  // Auto mode: use threshold
  if (complexity >= state.config.threshold) {
    return state.cloudAvailable ? 'CLOUD' : 'LOCAL';
  } else {
    return state.localModelLoaded ? 'LOCAL' : 'CLOUD';
  }
}

/**
 * Add task to queue with priority
 * @param {Object} task 
 */
function enqueueTask(task) {
  // Check queue depth
  if (state.queue.length >= MAX_QUEUE_DEPTH) {
    // Remove oldest BACKGROUND tasks
    const backgroundIndex = state.queue.findIndex(t => t.priority === PRIORITY.BACKGROUND);
    if (backgroundIndex >= 0) {
      const removed = state.queue.splice(backgroundIndex, 1)[0];
      self.postMessage({
        type: 'DROPPED',
        payload: { taskId: removed.id, reason: 'Queue overflow' }
      });
    }
  }
  
  // Insert task in priority order
  const insertIndex = state.queue.findIndex(t => t.priority < task.priority);
  if (insertIndex === -1) {
    state.queue.push(task);
  } else {
    state.queue.splice(insertIndex, 0, task);
  }
}

/**
 * Get next task from queue
 * @returns {Object|null}
 */
function dequeueTask() {
  // URGENT tasks can interrupt current NORMAL/BACKGROUND tasks
  if (state.currentTask && state.currentTask.priority < PRIORITY.URGENT) {
    const urgentTask = state.queue.find(t => t.priority === PRIORITY.URGENT);
    if (urgentTask) {
      // Preempt current task
      self.postMessage({
        type: 'PREEMPTED',
        payload: { taskId: state.currentTask.id }
      });
      state.queue.unshift(state.currentTask);
      state.queue = state.queue.filter(t => t.id !== urgentTask.id);
      return urgentTask;
    }
  }
  
  return state.queue.shift() || null;
}

/**
 * Process a task through the routing pipeline
 * @param {Object} task 
 */
async function processTask(task) {
  try {
    // Calculate complexity
    const complexity = calculateComplexity(task);
    task.complexity = complexity;
    
    // Determine priority
    task.priority = determinePriority(task, complexity);
    
    // Make routing decision
    const route = makeRoutingDecision(task, complexity);
    task.route = route;
    
    // Enrich with RAG context if available
    let context = task.message;
    if (state.ragBooster) {
      try {
        context = await state.ragBooster.assembleContext(task.message, task.message);
      } catch (err) {
        console.warn('RAG context assembly failed:', err);
        // Continue without context enrichment
      }
    }
    task.context = context;
    
    // Send routing decision to main thread
    self.postMessage({
      type: 'ROUTED',
      payload: {
        taskId: task.id,
        route,
        complexity,
        priority: task.priority,
        realtime: task.realtime,
        privacyFlag: task.privacyFlag
      }
    });
    
    // Execute the task
    await executeTask(task);
    
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      payload: {
        taskId: task.id,
        error: error.message,
        stack: error.stack
      }
    });
  } finally {
    state.currentTask = null;
    processNextTask();
  }
}

/**
 * Execute a task (route to appropriate executor)
 * @param {Object} task 
 */
async function executeTask(task) {
  state.currentTask = task;
  
  if (task.route === 'LOCAL') {
    // Send to inference worker
    self.postMessage({
      type: 'EXECUTE_LOCAL',
      payload: {
        taskId: task.id,
        message: task.context,
        stream: true
      }
    });
  } else {
    // Send to cloud provider
    self.postMessage({
      type: 'EXECUTE_CLOUD',
      payload: {
        taskId: task.id,
        message: task.context,
        stream: true
      }
    });
  }
}

/**
 * Process next task in queue
 */
function processNextTask() {
  const nextTask = dequeueTask();
  if (nextTask) {
    processTask(nextTask);
  }
}

/**
 * Handle streaming token from executor
 * @param {string} taskId 
 * @param {string} token 
 */
function handleStreamToken(taskId, token) {
  self.postMessage({
    type: 'STREAM',
    payload: { taskId, token }
  });
}

/**
 * Handle task completion
 * @param {string} taskId 
 * @param {string} response 
 */
function handleComplete(taskId, response) {
  self.postMessage({
    type: 'COMPLETE',
    payload: { taskId, response }
  });
  
  // Store conversation turn in RAG if available
  if (state.ragBooster && state.currentTask) {
    const task = state.currentTask;
    state.ragBooster.storeConversationTurn(
      task.channel,
      task.userId,
      'assistant',
      response
    ).catch(err => console.warn('Failed to store conversation:', err));
  }
}

/**
 * Handle executor error
 * @param {string} taskId 
 * @param {string} error 
 */
function handleError(taskId, error) {
  self.postMessage({
    type: 'ERROR',
    payload: { taskId, error }
  });
}

/**
 * Update worker configuration
 * @param {Object} config 
 */
function updateConfig(config) {
  state.config = { ...state.config, ...config };
}

/**
 * Update model status
 * @param {Object} status 
 */
function updateModelStatus(status) {
  if (status.localModelLoaded !== undefined) {
    state.localModelLoaded = status.localModelLoaded;
  }
  if (status.cloudAvailable !== undefined) {
    state.cloudAvailable = status.cloudAvailable;
  }
}

/**
 * Initialize RAG Booster (called from main thread with initialized instance)
 * @param {Object} ragBooster 
 */
function initRAG(ragBooster) {
  state.ragBooster = ragBooster;
}

/**
 * Get current queue status
 * @returns {Object}
 */
function getQueueStatus() {
  return {
    queueLength: state.queue.length,
    currentTask: state.currentTask ? {
      id: state.currentTask.id,
      priority: state.currentTask.priority,
      route: state.currentTask.route
    } : null,
    urgent: state.queue.filter(t => t.priority === PRIORITY.URGENT).length,
    normal: state.queue.filter(t => t.priority === PRIORITY.NORMAL).length,
    background: state.queue.filter(t => t.priority === PRIORITY.BACKGROUND).length
  };
}

// Message handler
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'TASK':
      // New task received
      const task = {
        ...payload,
        receivedAt: Date.now()
      };
      
      if (state.currentTask) {
        // Add to queue
        enqueueTask(task);
        self.postMessage({
          type: 'QUEUED',
          payload: { taskId: task.id, queuePosition: state.queue.length }
        });
      } else {
        // Process immediately
        processTask(task);
      }
      break;
      
    case 'CONFIG':
      updateConfig(payload);
      break;
      
    case 'MODEL_STATUS':
      updateModelStatus(payload);
      break;
      
    case 'INIT_RAG':
      initRAG(payload);
      break;
      
    case 'STREAM_TOKEN':
      // Forward streaming token from executor
      handleStreamToken(payload.taskId, payload.token);
      break;
      
    case 'COMPLETE_TASK':
      // Task completed by executor
      handleComplete(payload.taskId, payload.response);
      break;
      
    case 'ERROR_TASK':
      // Error from executor
      handleError(payload.taskId, payload.error);
      break;
      
    case 'GET_STATUS':
      self.postMessage({
        type: 'STATUS',
        payload: getQueueStatus()
      });
      break;
      
    case 'CANCEL':
      // Cancel a specific task
      const cancelIndex = state.queue.findIndex(t => t.id === payload.taskId);
      if (cancelIndex >= 0) {
        state.queue.splice(cancelIndex, 1);
        self.postMessage({
          type: 'CANCELLED',
          payload: { taskId: payload.taskId }
        });
      }
      break;
      
    case 'CLEAR_QUEUE':
      state.queue = [];
      self.postMessage({
        type: 'QUEUE_CLEARED',
        payload: {}
      });
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
};

// Signal that worker is ready
self.postMessage({
  type: 'READY',
  payload: { worker: 'task-router', version: '1.0.0' }
});
