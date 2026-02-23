/**
 * config.js - IndexedDB Configuration Manager
 * 
 * This module manages all configuration storage in IndexedDB.
 * It's the foundation of the BrowserClaw system - everything depends on this.
 * 
 * Database Schema:
 * - config: API keys, routing settings, soul, integrations
 * - models: Model metadata (id, name, size, status, etc.)
 * - model_weights: Actual model weights as ArrayBuffer
 * - memory: RAG memory chunks with gravitational bit encoding
 * - sessions: Chat session history
 */

const DB_NAME = 'BrowserClawDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  CONFIG: 'config',
  MODELS: 'models',
  MODEL_WEIGHTS: 'model_weights',
  MEMORY: 'memory',
  SESSIONS: 'sessions'
};

// Default configuration values
const DEFAULTS = {
  routing: {
    mode: 'auto', // 'auto' | 'local' | 'cloud'
    threshold: 6,
    privacyMode: false
  },
  local_model: {
    active: null,
    whisper: null,
    autoLoad: true
  },
  soul: {
    name: 'Atlas',
    personality: 'Helpful, concise, honest. Adapts tone to context.',
    language: 'fr',
    goals: [
      'Help the user be more productive',
      'Learn from every interaction'
    ],
    skills: ['code', 'research', 'scheduling', 'memory'],
    relationships: {},
    values: [
      'Never share private data',
      'Always be transparent about being AI'
    ]
  },
  api_keys: {},
  integrations: {}
};

let db = null;

/**
 * Initialize the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Config store - key/value pairs for all settings
      if (!database.objectStoreNames.contains(STORES.CONFIG)) {
        database.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
      }

      // Models store - metadata about downloaded models
      if (!database.objectStoreNames.contains(STORES.MODELS)) {
        database.createObjectStore(STORES.MODELS, { keyPath: 'id' });
      }

      // Model weights store - actual binary weights
      if (!database.objectStoreNames.contains(STORES.MODEL_WEIGHTS)) {
        database.createObjectStore(STORES.MODEL_WEIGHTS, { keyPath: 'id' });
      }

      // Memory store - RAG chunks with gravitational bit encoding
      if (!database.objectStoreNames.contains(STORES.MEMORY)) {
        const memoryStore = database.createObjectStore(STORES.MEMORY, { keyPath: 'key' });
        memoryStore.createIndex('docId', 'docId', { unique: false });
        memoryStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Sessions store - chat history
      if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionsStore = database.createObjectStore(STORES.SESSIONS, { keyPath: 'key' });
        sessionsStore.createIndex('channelId', 'channelId', { unique: false });
        sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get a value from the config store
 * @param {string} key - The config key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {Promise<*>}
 */
export async function getConfig(key, defaultValue = null) {
  await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFIG], 'readonly');
    const store = transaction.objectStore(STORES.CONFIG);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : (defaultValue !== null ? defaultValue : DEFAULTS[key] || null));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set a value in the config store
 * @param {string} key - The config key
 * @param {*} value - The value to store
 * @returns {Promise<void>}
 */
export async function setConfig(key, value) {
  await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFIG], 'readwrite');
    const store = transaction.objectStore(STORES.CONFIG);
    const request = store.put({ key, value, updatedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get API keys (with optional decryption)
 * @param {string} passphrase - Optional passphrase for decryption
 * @returns {Promise<Object>}
 */
export async function getApiKeys(passphrase = null) {
  const keys = await getConfig('api_keys', {});
  
  if (passphrase && keys._encrypted) {
    try {
      return await decryptApiKeys(keys, passphrase);
    } catch (err) {
      console.error('Failed to decrypt API keys:', err);
      throw new Error('Invalid passphrase');
    }
  }
  
  return keys;
}

/**
 * Set API keys (with optional encryption)
 * @param {Object} keys - API keys object
 * @param {string} passphrase - Optional passphrase for encryption
 * @returns {Promise<void>}
 */
export async function setApiKeys(keys, passphrase = null) {
  if (passphrase) {
    keys = await encryptApiKeys(keys, passphrase);
    keys._encrypted = true;
  }
  await setConfig('api_keys', keys);
}

/**
 * Encrypt API keys using WebCrypto AES-GCM
 * @param {Object} keys - API keys to encrypt
 * @param {string} passphrase - Encryption passphrase
 * @returns {Promise<Object>}
 */
async function encryptApiKeys(keys, passphrase) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(keys));
  
  // Derive key from passphrase using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  return {
    data: Array.from(new Uint8Array(encrypted)),
    salt: Array.from(salt),
    iv: Array.from(iv)
  };
}

/**
 * Decrypt API keys using WebCrypto AES-GCM
 * @param {Object} encryptedKeys - Encrypted keys object
 * @param {string} passphrase - Decryption passphrase
 * @returns {Promise<Object>}
 */
async function decryptApiKeys(encryptedKeys, passphrase) {
  const encoder = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(encryptedKeys.salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encryptedKeys.iv) },
    key,
    new Uint8Array(encryptedKeys.data)
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Check if this is the first launch (no config exists)
 * @returns {Promise<boolean>}
 */
export async function isFirstLaunch() {
  await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CONFIG], 'readonly');
    const store = transaction.objectStore(STORES.CONFIG);
    const request = store.count();

    request.onsuccess = () => resolve(request.result === 0);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wipe all data from IndexedDB
 * @returns {Promise<void>}
 */
export async function wipeAllData() {
  if (db) {
    db.close();
    db = null;
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database deletion blocked'));
  });
}

/**
 * Get database statistics
 * @returns {Promise<Object>}
 */
export async function getDBStats() {
  await initDB();
  
  const stats = {};
  
  for (const storeName of Object.values(STORES)) {
    stats[storeName] = await new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  return stats;
}

/**
 * Export all data as a JSON object (for backup)
 * @returns {Promise<Object>}
 */
export async function exportAllData() {
  await initDB();
  
  const exportData = {
    version: DB_VERSION,
    exportedAt: Date.now(),
    stores: {}
  };
  
  for (const storeName of Object.values(STORES)) {
    exportData.stores[storeName] = await new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  return exportData;
}

/**
 * Import data from a JSON object (from backup)
 * @param {Object} data - Data to import
 * @returns {Promise<void>}
 */
export async function importAllData(data) {
  await initDB();
  
  // Clear existing data first
  for (const storeName of Object.values(STORES)) {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  // Import new data
  for (const [storeName, items] of Object.entries(data.stores || {})) {
    if (!Object.values(STORES).includes(storeName)) continue;
    
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    for (const item of items) {
      await new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Export store names for use in other modules
export { STORES, DEFAULTS };

export default {
  initDB,
  getConfig,
  setConfig,
  getApiKeys,
  setApiKeys,
  isFirstLaunch,
  wipeAllData,
  getDBStats,
  exportAllData,
  importAllData,
  STORES,
  DEFAULTS
};
