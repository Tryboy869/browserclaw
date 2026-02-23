/**
 * webchat.js - Built-in WebChat Channel
 * 
 * This module provides the backend logic for the built-in web chat interface.
 * It handles message persistence, streaming responses, and voice input.
 * 
 * Features:
 * - Message history persistence in IndexedDB
 * - Streaming response handling
 * - Voice input via MediaDevices API
 * - Markdown rendering support
 */

import { initDB, STORES } from '../core/config.js';
import { RAGBooster } from '../memory/rag-booster.js';

/**
 * WebChat state
 */
const state = {
  db: null,
  currentSession: null,
  messageHandler: null,
  ragBooster: null,
  initialized: false
};

/**
 * Initialize WebChat
 * @param {Function} messageHandler - Callback for incoming messages
 * @returns {Promise<boolean>}
 */
export async function initWebChat(messageHandler) {
  if (state.initialized) return true;
  
  state.db = await initDB();
  state.messageHandler = messageHandler;
  state.ragBooster = new RAGBooster();
  await state.ragBooster.init();
  
  state.initialized = true;
  return true;
}

/**
 * Create a new chat session
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export async function createSession(userId = 'default') {
  await initWebChat();
  
  const sessionId = `webchat_${userId}_${Date.now()}`;
  const session = {
    id: sessionId,
    userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0
  };
  
  state.currentSession = session;
  
  return session;
}

/**
 * Get or create session
 * @param {string} userId 
 * @returns {Promise<Object>}
 */
export async function getOrCreateSession(userId = 'default') {
  if (state.currentSession && state.currentSession.userId === userId) {
    return state.currentSession;
  }
  
  // Try to find existing session
  const sessions = await getSessions(userId);
  if (sessions.length > 0) {
    state.currentSession = sessions[0];
    return state.currentSession;
  }
  
  return createSession(userId);
}

/**
 * Get all sessions for a user
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getSessions(userId = 'default') {
  await initWebChat();
  
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction([STORES.SESSIONS], 'readonly');
    const store = transaction.objectStore(STORES.SESSIONS);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const sessions = request.result
        .filter(s => s.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
      resolve(sessions);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Send a message and get response
 * @param {string} message 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
export async function sendMessage(message, options = {}) {
  await initWebChat();
  
  const { 
    userId = 'default',
    stream = true,
    onStreamToken 
  } = options;
  
  const session = await getOrCreateSession(userId);
  
  // Store user message
  await storeMessage(session.id, 'user', message);
  
  // Get conversation history for context
  const history = await getConversationHistory(session.id, 10);
  
  // Build messages array for LLM
  const messages = history.map(h => ({
    role: h.role,
    content: h.content
  }));
  
  // Send to message handler
  let response = '';
  
  if (state.messageHandler) {
    if (stream && onStreamToken) {
      // Streaming mode
      const streamHandler = {
        onToken: (token) => {
          response += token;
          onStreamToken(token);
        }
      };
      
      await state.messageHandler({
        channel: 'webchat',
        userId,
        message,
        messages,
        stream: true,
        streamHandler
      });
    } else {
      // Non-streaming mode
      response = await state.messageHandler({
        channel: 'webchat',
        userId,
        message,
        messages,
        stream: false
      });
    }
  }
  
  // Store assistant response
  if (response) {
    await storeMessage(session.id, 'assistant', response);
  }
  
  // Update session
  session.messageCount++;
  session.updatedAt = Date.now();
  
  return {
    message: response,
    session
  };
}

/**
 * Store a message in the session
 * @param {string} sessionId 
 * @param {string} role 
 * @param {string} content 
 */
async function storeMessage(sessionId, role, content) {
  const key = `${sessionId}_${Date.now()}`;
  
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction([STORES.SESSIONS], 'readwrite');
    const store = transaction.objectStore(STORES.SESSIONS);
    const request = store.put({
      key,
      sessionId,
      role,
      content,
      timestamp: Date.now()
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get conversation history for a session
 * @param {string} sessionId 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function getConversationHistory(sessionId, limit = 20) {
  await initWebChat();
  
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction([STORES.SESSIONS], 'readonly');
    const store = transaction.objectStore(STORES.SESSIONS);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const messages = request.result
        .filter(s => s.sessionId === sessionId)
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-limit);
      resolve(messages);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear session history
 * @param {string} sessionId 
 */
export async function clearSession(sessionId) {
  await initWebChat();
  
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction([STORES.SESSIONS], 'readwrite');
    const store = transaction.objectStore(STORES.SESSIONS);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const messages = request.result.filter(s => s.sessionId === sessionId);
      
      for (const msg of messages) {
        store.delete(msg.key);
      }
      
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a session and all its messages
 * @param {string} sessionId 
 */
export async function deleteSession(sessionId) {
  await clearSession(sessionId);
  
  if (state.currentSession?.id === sessionId) {
    state.currentSession = null;
  }
}

/**
 * Process voice input
 * @param {Blob} audioBlob 
 * @param {Object} options 
 * @returns {Promise<string>}
 */
export async function processVoiceInput(audioBlob, options = {}) {
  await initWebChat();
  
  // Convert blob to audio data
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Extract audio data
  const audioData = audioBuffer.getChannelData(0);
  
  // Forward to message handler for transcription
  if (state.messageHandler) {
    return state.messageHandler({
      channel: 'webchat',
      userId: options.userId || 'default',
      message: '[VOICE_INPUT]',
      audioData
    });
  }
  
  return null;
}

/**
 * Get WebChat statistics
 * @returns {Promise<Object>}
 */
export async function getStats() {
  await initWebChat();
  
  const sessions = await getSessions();
  
  return new Promise((resolve, reject) => {
    const transaction = state.db.transaction([STORES.SESSIONS], 'readonly');
    const store = transaction.objectStore(STORES.SESSIONS);
    const request = store.count();
    
    request.onsuccess = () => {
      resolve({
        totalSessions: sessions.length,
        totalMessages: request.result,
        currentSession: state.currentSession?.id
      });
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Export session data
 * @param {string} sessionId 
 * @returns {Promise<Object>}
 */
export async function exportSession(sessionId) {
  const history = await getConversationHistory(sessionId, 1000);
  
  return {
    sessionId,
    exportedAt: Date.now(),
    messages: history.map(h => ({
      role: h.role,
      content: h.content,
      timestamp: h.timestamp
    }))
  };
}

/**
 * Import session data
 * @param {Object} data 
 * @returns {Promise<void>}
 */
export async function importSession(data) {
  await initWebChat();
  
  const session = await createSession();
  
  for (const msg of data.messages) {
    await storeMessage(session.id, msg.role, msg.content);
  }
}

/**
 * Request microphone permission and start recording
 * @returns {Promise<MediaRecorder>}
 */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];
  
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };
  
  mediaRecorder.start();
  
  return {
    mediaRecorder,
    stop: () => {
      return new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          resolve(blob);
        };
        mediaRecorder.stop();
      });
    }
  };
}

/**
 * Check if microphone is available
 * @returns {Promise<boolean>}
 */
export async function isMicrophoneAvailable() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(d => d.kind === 'audioinput');
  } catch {
    return false;
  }
}

/**
 * Get all messages for current session
 * @returns {Promise<Array>}
 */
export async function getCurrentSessionMessages() {
  if (!state.currentSession) {
    return [];
  }
  
  return getConversationHistory(state.currentSession.id, 100);
}

export default {
  initWebChat,
  createSession,
  getOrCreateSession,
  getSessions,
  sendMessage,
  getConversationHistory,
  clearSession,
  deleteSession,
  processVoiceInput,
  getStats,
  exportSession,
  importSession,
  startRecording,
  isMicrophoneAvailable,
  getCurrentSessionMessages
};
