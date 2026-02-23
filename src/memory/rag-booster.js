/**
 * rag-booster.js - RAG Booster JavaScript Implementation
 * 
 * This module provides persistent, context-enriched memory for the BrowserClaw agent.
 * It's a JavaScript port of the RAG Booster system, using GravitationalBit for encoding.
 * 
 * Features:
 * - Chunk storage with gravitational bit encoding
 * - Keyword-based retrieval with scoring
 * - Context assembly for LLM prompts
 * - IndexedDB persistence
 */

import { GravitationalBit, GravitationalMemory } from './gravitational-bit.js';
import { initDB, STORES } from '../core/config.js';

/**
 * RAGBooster - Main RAG system for BrowserClaw
 */
export class RAGBooster {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.chunkSize - Target chunk size in words (default: 300)
   * @param {number} options.topK - Number of chunks to retrieve (default: 8)
   * @param {number} options.maxMemoryMB - Maximum memory usage in MB (default: 500)
   */
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 300;
    this.topK = options.topK || 8;
    this.maxMemoryMB = options.maxMemoryMB || 500;
    
    // Initialize gravitational memory with IndexedDB storage
    this.memory = new GravitationalMemory({
      storeFn: this.storeToIndexedDB.bind(this),
      retrieveFn: this.retrieveFromIndexedDB.bind(this)
    });
    
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the RAG Booster
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    
    this.db = await initDB();
    
    // Preload recent chunks into cache
    await this.preloadCache();
    
    this.initialized = true;
  }

  /**
   * Store a chunk to IndexedDB
   * @param {string} key - Chunk key
   * @param {Object} value - Chunk data
   * @returns {Promise<void>}
   */
  async storeToIndexedDB(key, value) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MEMORY], 'readwrite');
      const store = transaction.objectStore(STORES.MEMORY);
      const request = store.put(value);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve chunks from IndexedDB
   * @param {string} key - Optional specific key to retrieve
   * @returns {Promise<Object[]>}
   */
  async retrieveFromIndexedDB(key = null) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MEMORY], 'readonly');
      const store = transaction.objectStore(STORES.MEMORY);
      
      let request;
      if (key) {
        request = store.get(key);
      } else {
        // Get all chunks, limited to recent 1000
        request = store.getAll();
      }
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(Array.isArray(result) ? result : [result].filter(Boolean));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Preload recent chunks into memory cache
   * @returns {Promise<void>}
   */
  async preloadCache() {
    const chunks = await this.retrieveFromIndexedDB();
    
    // Sort by timestamp (newest first) and keep top 100
    chunks.sort((a, b) => b.timestamp - a.timestamp);
    const recentChunks = chunks.slice(0, 100);
    
    for (const chunk of recentChunks) {
      this.memory.cache.set(chunk.key, chunk);
    }
  }

  /**
   * Store a document in memory
   * @param {string} docId - Document identifier
   * @param {string} text - Document text
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>}
   */
  async store(docId, text, metadata = {}) {
    await this.init();
    
    const result = await this.memory.store(docId, text, {
      ...metadata,
      storedAt: Date.now()
    });
    
    return result;
  }

  /**
   * Retrieve relevant context for a query
   * @param {string} query - Search query
   * @param {number} topK - Number of chunks to retrieve
   * @returns {Promise<string[]>}
   */
  async retrieve(query, topK = null) {
    await this.init();
    
    const k = topK || this.topK;
    const chunks = await this.memory.retrieve(query, k);
    
    return chunks;
  }

  /**
   * Assemble context for LLM prompt
   * @param {string} query - User query
   * @param {string} userMessage - Original user message
   * @returns {Promise<string>}
   */
  async assembleContext(query, userMessage) {
    const chunks = await this.retrieve(query);
    
    if (chunks.length === 0) {
      return userMessage;
    }
    
    const context = chunks.join('\n\n---\n\n');
    
    return `--- MEMORY CONTEXT ---
${context}
--- END MEMORY CONTEXT ---

Current request: ${userMessage}

Answer based on the context above and your knowledge.`;
  }

  /**
   * Store a conversation turn
   * @param {string} channelId - Channel identifier
   * @param {string} userId - User identifier
   * @param {string} role - 'user' or 'assistant'
   * @param {string} content - Message content
   * @returns {Promise<void>}
   */
  async storeConversationTurn(channelId, userId, role, content) {
    await this.init();
    
    const key = `${channelId}_${userId}_${Date.now()}`;
    const sessionData = {
      key,
      channelId,
      userId,
      role,
      content,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SESSIONS], 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.put(sessionData);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get conversation history
   * @param {string} channelId - Channel identifier
   * @param {string} userId - User identifier
   * @param {number} limit - Maximum number of turns
   * @returns {Promise<Array>}
   */
  async getConversationHistory(channelId, userId, limit = 20) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const index = store.index('channelId');
      const request = index.getAll(channelId);
      
      request.onsuccess = () => {
        let results = request.result.filter(r => r.userId === userId);
        results.sort((a, b) => b.timestamp - a.timestamp);
        results = results.slice(0, limit);
        results.reverse(); // Oldest first
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all memory for a document
   * @param {string} docId - Document identifier
   * @returns {Promise<void>}
   */
  async clearDocument(docId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MEMORY], 'readwrite');
      const store = transaction.objectStore(STORES.MEMORY);
      const index = store.index('docId');
      const request = index.getAllKeys(docId);
      
      request.onsuccess = () => {
        const keys = request.result;
        
        for (const key of keys) {
          store.delete(key);
          this.memory.cache.delete(key);
        }
        
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get memory statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this.init();
    
    const memoryStats = this.memory.getStats();
    
    // Get total chunks from IndexedDB
    const totalChunks = await new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MEMORY], 'readonly');
      const store = transaction.objectStore(STORES.MEMORY);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Get total sessions
    const totalSessions = await new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.SESSIONS], 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    return {
      ...memoryStats,
      totalChunks,
      totalSessions,
      chunkSize: this.chunkSize,
      topK: this.topK
    };
  }

  /**
   * Search memory with advanced scoring
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    await this.init();
    
    const {
      topK = this.topK,
      minScore = 0.1,
      includeMetadata = false
    } = options;
    
    // Get all chunks
    let allChunks = Array.from(this.memory.cache.values());
    
    if (allChunks.length === 0) {
      allChunks = await this.retrieveFromIndexedDB();
    }
    
    if (allChunks.length === 0) {
      return [];
    }
    
    // Advanced scoring with TF-IDF-like weighting
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const queryWordFreq = {};
    queryWords.forEach(w => queryWordFreq[w] = (queryWordFreq[w] || 0) + 1);
    
    const scored = allChunks.map(chunk => {
      const chunkText = chunk.text.toLowerCase();
      const chunkWords = chunkText.split(/\s+/).filter(w => w.length > 2);
      
      let score = 0;
      let matchedWords = 0;
      
      for (const [word, queryFreq] of Object.entries(queryWordFreq)) {
        const chunkFreq = chunkWords.filter(w => w === word).length;
        
        if (chunkFreq > 0) {
          matchedWords++;
          // TF-IDF-like scoring
          const tf = chunkFreq / chunkWords.length;
          const idf = Math.log(allChunks.length / (1 + allChunks.filter(c => 
            c.text.toLowerCase().includes(word)
          ).length));
          score += tf * idf * queryFreq;
        }
      }
      
      // Bonus for exact phrase match
      if (chunkText.includes(query.toLowerCase())) {
        score *= 2;
      }
      
      // Bonus for title/heading matches
      if (chunk.metadata?.title?.toLowerCase().includes(query.toLowerCase())) {
        score *= 1.5;
      }
      
      return { 
        chunk, 
        score,
        matchedWords,
        result: includeMetadata ? {
          text: chunk.text,
          metadata: chunk.metadata,
          docId: chunk.docId,
          score
        } : chunk.text
      };
    });
    
    // Filter by minimum score and sort
    const filtered = scored.filter(s => s.score >= minScore);
    filtered.sort((a, b) => b.score - a.score);
    
    return filtered.slice(0, topK).map(s => s.result);
  }

  /**
   * Verify integrity of all stored chunks
   * @returns {Promise<Object>}
   */
  async verifyAll() {
    await this.init();
    
    const chunks = await this.retrieveFromIndexedDB();
    const results = {
      total: chunks.length,
      valid: 0,
      invalid: 0,
      errors: []
    };
    
    for (const chunk of chunks) {
      try {
        const isValid = await this.memory.verify(chunk.key);
        if (isValid) {
          results.valid++;
        } else {
          results.invalid++;
          results.errors.push({ key: chunk.key, error: 'Hash mismatch' });
        }
      } catch (err) {
        results.invalid++;
        results.errors.push({ key: chunk.key, error: err.message });
      }
    }
    
    return results;
  }
}

// Singleton instance for global use
let globalRAG = null;

/**
 * Get or create the global RAG Booster instance
 * @returns {RAGBooster}
 */
export function getRAGBooster() {
  if (!globalRAG) {
    globalRAG = new RAGBooster();
  }
  return globalRAG;
}

/**
 * Reset the global RAG Booster instance
 */
export function resetRAGBooster() {
  globalRAG = null;
}

export default {
  RAGBooster,
  getRAGBooster,
  resetRAGBooster
};
