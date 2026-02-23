/**
 * model-manager.js - Model Management System
 * 
 * This module handles:
 * - Model downloads from HuggingFace Hub
 * - Model storage in IndexedDB
 * - Download progress tracking
 * - Model activation/deactivation
 * - Model status monitoring
 */

import { initDB, STORES, getConfig, setConfig } from '../core/config.js';
import { 
  MODEL_REGISTRY, 
  getModelById, 
  getModelDownloadUrl 
} from './model-registry.js';

/**
 * Model download status
 */
export const DOWNLOAD_STATUS = {
  PENDING: 'pending',
  DOWNLOADING: 'downloading',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled'
};

/**
 * Model Manager class
 */
export class ModelManager {
  constructor() {
    this.db = null;
    this.activeDownloads = new Map();
    this.downloadCallbacks = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the model manager
   */
  async init() {
    if (this.initialized) return;
    
    this.db = await initDB();
    this.initialized = true;
  }

  /**
   * Get all models with their download status
   * @returns {Promise<Array>}
   */
  async getAllModels() {
    await this.init();
    
    const models = [...MODEL_REGISTRY];
    
    // Add download status from IndexedDB
    for (const model of models) {
      const status = await this.getModelStatus(model.id);
      model.downloadStatus = status.status;
      model.downloadProgress = status.progress;
      model.downloadedAt = status.downloadedAt;
      model.isActive = status.isActive;
    }
    
    return models;
  }

  /**
   * Get model status from IndexedDB
   * @param {string} modelId 
   * @returns {Promise<Object>}
   */
  async getModelStatus(modelId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODELS], 'readonly');
      const store = transaction.objectStore(STORES.MODELS);
      const request = store.get(modelId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            status: result.status || DOWNLOAD_STATUS.PENDING,
            progress: result.progress || 0,
            downloadedAt: result.downloadedAt || null,
            isActive: result.isActive || false
          });
        } else {
          resolve({
            status: DOWNLOAD_STATUS.PENDING,
            progress: 0,
            downloadedAt: null,
            isActive: false
          });
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update model status in IndexedDB
   * @param {string} modelId 
   * @param {Object} status 
   */
  async updateModelStatus(modelId, status) {
    await this.init();
    
    const model = getModelById(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);
    
    const data = {
      id: modelId,
      name: model.name,
      category: model.category,
      size: model.size,
      sizeBytes: model.sizeBytes,
      ...status,
      updatedAt: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODELS], 'readwrite');
      const store = transaction.objectStore(STORES.MODELS);
      const request = store.put(data);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Download a model from HuggingFace
   * @param {string} modelId 
   * @param {Object} options 
   * @returns {Promise<void>}
   */
  async downloadModel(modelId, options = {}) {
    await this.init();
    
    const model = getModelById(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);
    
    const { 
      onProgress, 
      onComplete, 
      onError,
      abortSignal 
    } = options;
    
    // Check if already downloading
    if (this.activeDownloads.has(modelId)) {
      throw new Error('Download already in progress');
    }
    
    // Update status to downloading
    await this.updateModelStatus(modelId, {
      status: DOWNLOAD_STATUS.DOWNLOADING,
      progress: 0
    });
    
    // Store callbacks
    this.downloadCallbacks.set(modelId, { onProgress, onComplete, onError });
    
    try {
      // Get HuggingFace token if configured
      const apiKeys = await getConfig('api_keys', {});
      const hfToken = apiKeys.huggingface;
      
      // Download model
      const url = getModelDownloadUrl(modelId);
      const headers = {};
      if (hfToken) {
        headers['Authorization'] = `Bearer ${hfToken}`;
      }
      
      const response = await fetch(url, { 
        headers,
        signal: abortSignal 
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const reader = response.body.getReader();
      
      let receivedBytes = 0;
      const chunks = [];
      
      while (true) {
        if (abortSignal?.aborted) {
          throw new Error('Download cancelled');
        }
        
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedBytes += value.length;
        
        // Calculate progress
        const progress = contentLength > 0 
          ? Math.round((receivedBytes / contentLength) * 100) 
          : 0;
        
        // Update status
        await this.updateModelStatus(modelId, { 
          status: DOWNLOAD_STATUS.DOWNLOADING, 
          progress 
        });
        
        // Call progress callback
        const callbacks = this.downloadCallbacks.get(modelId);
        if (callbacks?.onProgress) {
          callbacks.onProgress({
            receivedBytes,
            totalBytes: contentLength,
            progress
          });
        }
      }
      
      // Combine chunks into ArrayBuffer
      const allChunks = new Uint8Array(receivedBytes);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }
      
      // Store model weights in IndexedDB
      await this.storeModelWeights(modelId, allChunks.buffer);
      
      // Update status to completed
      await this.updateModelStatus(modelId, {
        status: DOWNLOAD_STATUS.COMPLETED,
        progress: 100,
        downloadedAt: Date.now()
      });
      
      // Call complete callback
      const callbacks = this.downloadCallbacks.get(modelId);
      if (callbacks?.onComplete) {
        callbacks.onComplete({ receivedBytes });
      }
      
    } catch (error) {
      // Update status to error
      await this.updateModelStatus(modelId, {
        status: DOWNLOAD_STATUS.ERROR,
        error: error.message
      });
      
      // Call error callback
      const callbacks = this.downloadCallbacks.get(modelId);
      if (callbacks?.onError) {
        callbacks.onError(error);
      }
      
      throw error;
    } finally {
      this.activeDownloads.delete(modelId);
      this.downloadCallbacks.delete(modelId);
    }
  }

  /**
   * Store model weights in IndexedDB
   * @param {string} modelId 
   * @param {ArrayBuffer} weights 
   */
  async storeModelWeights(modelId, weights) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODEL_WEIGHTS], 'readwrite');
      const store = transaction.objectStore(STORES.MODEL_WEIGHTS);
      const request = store.put({
        id: modelId,
        weights,
        storedAt: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get model weights from IndexedDB
   * @param {string} modelId 
   * @returns {Promise<ArrayBuffer>}
   */
  async getModelWeights(modelId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODEL_WEIGHTS], 'readonly');
      const store = transaction.objectStore(STORES.MODEL_WEIGHTS);
      const request = store.get(modelId);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result.weights);
        } else {
          reject(new Error('Model weights not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cancel an active download
   * @param {string} modelId 
   */
  async cancelDownload(modelId) {
    if (this.activeDownloads.has(modelId)) {
      const controller = this.activeDownloads.get(modelId);
      controller.abort();
      
      await this.updateModelStatus(modelId, {
        status: DOWNLOAD_STATUS.CANCELLED,
        progress: 0
      });
    }
  }

  /**
   * Delete a downloaded model
   * @param {string} modelId 
   */
  async deleteModel(modelId) {
    await this.init();
    
    // Delete weights
    await new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODEL_WEIGHTS], 'readwrite');
      const store = transaction.objectStore(STORES.MODEL_WEIGHTS);
      const request = store.delete(modelId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Delete status
    await new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODELS], 'readwrite');
      const store = transaction.objectStore(STORES.MODELS);
      const request = store.delete(modelId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // If this was the active model, clear it
    const localModel = await getConfig('local_model', {});
    if (localModel.active === modelId) {
      await setConfig('local_model', { ...localModel, active: null });
    }
    if (localModel.whisper === modelId) {
      await setConfig('local_model', { ...localModel, whisper: null });
    }
  }

  /**
   * Set a model as active
   * @param {string} modelId 
   */
  async setActiveModel(modelId) {
    await this.init();
    
    const model = getModelById(modelId);
    if (!model) throw new Error(`Model not found: ${modelId}`);
    
    const status = await this.getModelStatus(modelId);
    if (status.status !== DOWNLOAD_STATUS.COMPLETED) {
      throw new Error('Model not downloaded');
    }
    
    // Update model status
    await this.updateModelStatus(modelId, { isActive: true });
    
    // Update config
    const localModel = await getConfig('local_model', {});
    
    if (model.category === 'whisper') {
      await setConfig('local_model', { ...localModel, whisper: modelId });
    } else {
      // Deactivate other LLM models
      const allModels = await this.getAllModels();
      for (const m of allModels) {
        if (m.category !== 'whisper' && m.id !== modelId && m.isActive) {
          await this.updateModelStatus(m.id, { isActive: false });
        }
      }
      await setConfig('local_model', { ...localModel, active: modelId });
    }
  }

  /**
   * Get the currently active model
   * @returns {Promise<Object|null>}
   */
  async getActiveModel() {
    await this.init();
    
    const localModel = await getConfig('local_model', {});
    if (!localModel.active) return null;
    
    return getModelById(localModel.active);
  }

  /**
   * Get the currently active Whisper model
   * @returns {Promise<Object|null>}
   */
  async getActiveWhisperModel() {
    await this.init();
    
    const localModel = await getConfig('local_model', {});
    if (!localModel.whisper) return null;
    
    return getModelById(localModel.whisper);
  }

  /**
   * Get total storage used by models
   * @returns {Promise<number>}
   */
  async getStorageUsed() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MODEL_WEIGHTS], 'readonly');
      const store = transaction.objectStore(STORES.MODEL_WEIGHTS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const models = request.result;
        const totalBytes = models.reduce((sum, m) => sum + (m.weights?.byteLength || 0), 0);
        resolve(totalBytes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get download progress for a model
   * @param {string} modelId 
   * @returns {Promise<number>}
   */
  async getDownloadProgress(modelId) {
    const status = await this.getModelStatus(modelId);
    return status.progress;
  }

  /**
   * Check if a model is downloaded
   * @param {string} modelId 
   * @returns {Promise<boolean>}
   */
  async isModelDownloaded(modelId) {
    const status = await this.getModelStatus(modelId);
    return status.status === DOWNLOAD_STATUS.COMPLETED;
  }
}

// Singleton instance
let globalModelManager = null;

/**
 * Get or create the global model manager instance
 * @returns {ModelManager}
 */
export function getModelManager() {
  if (!globalModelManager) {
    globalModelManager = new ModelManager();
  }
  return globalModelManager;
}

export default {
  ModelManager,
  getModelManager,
  DOWNLOAD_STATUS
};
