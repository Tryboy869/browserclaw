/**
 * gravitational-bit.js - Gravitational Bit Implementation in JavaScript
 * 
 * This is a JavaScript port of the Python GravitationalBit class.
 * It provides a novel approach to encoding data using orbital mechanics metaphors.
 * 
 * Key concepts:
 * - Orbital states: {n, l, m, occupied, energy, phase}
 * - Encode: Convert a BigInt (128-bit hash) into orbital states
 * - Decode: Reconstruct the BigInt from occupied states
 * - Uses BigInt throughout for hash operations
 * - SHA-256 via SubtleCrypto API
 */

/**
 * Represents a single orbital state in the gravitational bit system
 */
class OrbitalState {
  /**
   * @param {number} n - Principal quantum number
   * @param {number} l - Angular momentum quantum number
   * @param {number} m - Magnetic quantum number
   * @param {boolean} occupied - Whether this state is occupied
   * @param {number} energy - Energy level of this state
   * @param {number} phase - Phase angle (0-2π)
   */
  constructor(n, l, m, occupied = false, energy = 0, phase = 0) {
    this.n = n;
    this.l = l;
    this.m = m;
    this.occupied = occupied;
    this.energy = energy;
    this.phase = phase;
  }

  /**
   * Get a string representation of this state
   * @returns {string}
   */
  toString() {
    return `|${this.n},${this.l},${this.m}⟩ ${this.occupied ? '●' : '○'} E=${this.energy.toFixed(4)}`;
  }
}

/**
 * GravitationalBit - Encodes data into orbital states
 */
export class GravitationalBit {
  /**
   * @param {number} nMax - Maximum principal quantum number
   */
  constructor(nMax = 8) {
    this.nMax = nMax;
    this.states = this.generateStates(nMax);
    this.encodedValue = 0n;
  }

  /**
   * Generate all possible orbital states up to nMax
   * @param {number} nMax - Maximum principal quantum number
   * @returns {OrbitalState[]}
   */
  generateStates(nMax) {
    const states = [];
    
    for (let n = 1; n <= nMax; n++) {
      for (let l = 0; l < n; l++) {
        for (let m = -l; m <= l; m++) {
          // Calculate energy based on quantum numbers (simplified hydrogen-like model)
          const energy = -1.0 / (n * n) + 0.1 * l;
          // Random phase for each state
          const phase = Math.random() * 2 * Math.PI;
          
          states.push(new OrbitalState(n, l, m, false, energy, phase));
        }
      }
    }
    
    // Sort by energy (lowest first)
    states.sort((a, b) => a.energy - b.energy);
    
    return states;
  }

  /**
   * Get the total capacity of this gravitational bit (in bits)
   * @returns {number}
   */
  capacity() {
    return Math.min(this.states.length, 128);
  }

  /**
   * Encode a BigInt value into orbital states
   * @param {bigint} value - The value to encode (up to 128 bits)
   * @returns {GravitationalBit}
   */
  encode(value) {
    this.encodedValue = value;
    
    // Reset all states
    for (const state of this.states) {
      state.occupied = false;
    }
    
    // Set states based on bits in value
    const capacity = this.capacity();
    for (let i = 0; i < capacity; i++) {
      const bit = (value >> BigInt(i)) & 1n;
      if (bit === 1n && i < this.states.length) {
        this.states[i].occupied = true;
      }
    }
    
    return this;
  }

  /**
   * Decode the current orbital states back to a BigInt
   * @returns {bigint}
   */
  decode() {
    let value = 0n;
    
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i].occupied) {
        value |= 1n << BigInt(i);
      }
    }
    
    return value;
  }

  /**
   * Get all occupied states
   * @returns {OrbitalState[]}
   */
  getOccupiedStates() {
    return this.states.filter(s => s.occupied);
  }

  /**
   * Get all unoccupied states
   * @returns {OrbitalState[]}
   */
  getUnoccupiedStates() {
    return this.states.filter(s => !s.occupied);
  }

  /**
   * Get the occupation ratio (0.0 to 1.0)
   * @returns {number}
   */
  getOccupationRatio() {
    const occupied = this.getOccupiedStates().length;
    return occupied / this.states.length;
  }

  /**
   * Get the energy of the encoded configuration
   * @returns {number}
   */
  getTotalEnergy() {
    return this.states
      .filter(s => s.occupied)
      .reduce((sum, s) => sum + s.energy, 0);
  }

  /**
   * Serialize the gravitational bit to a plain object
   * @returns {Object}
   */
  serialize() {
    return {
      nMax: this.nMax,
      encodedValue: this.encodedValue.toString(),
      states: this.states.map(s => ({
        n: s.n,
        l: s.l,
        m: s.m,
        occupied: s.occupied,
        energy: s.energy,
        phase: s.phase
      }))
    };
  }

  /**
   * Deserialize a gravitational bit from a plain object
   * @param {Object} data - Serialized data
   * @returns {GravitationalBit}
   */
  static deserialize(data) {
    const bit = new GravitationalBit(data.nMax);
    bit.encodedValue = BigInt(data.encodedValue);
    
    for (let i = 0; i < data.states.length && i < bit.states.length; i++) {
      const s = data.states[i];
      bit.states[i].occupied = s.occupied;
      bit.states[i].energy = s.energy;
      bit.states[i].phase = s.phase;
    }
    
    return bit;
  }

  /**
   * Create a hash from text using SHA-256
   * @param {string} text - Text to hash
   * @returns {Promise<bigint>}
   */
  static async hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert first 16 bytes to BigInt (128 bits)
    let hash = 0n;
    for (let i = 0; i < 16 && i < hashArray.length; i++) {
      hash = (hash << 8n) | BigInt(hashArray[i]);
    }
    
    return hash;
  }

  /**
   * Create a GravitationalBit from text (convenience method)
   * @param {string} text - Text to encode
   * @param {number} nMax - Maximum principal quantum number
   * @returns {Promise<GravitationalBit>}
   */
  static async fromText(text, nMax = 8) {
    const hash = await GravitationalBit.hashText(text);
    const bit = new GravitationalBit(nMax);
    return bit.encode(hash);
  }

  /**
   * Verify that the decoded value matches the original
   * @returns {boolean}
   */
  verify() {
    return this.decode() === this.encodedValue;
  }

  /**
   * Get a visual representation of the orbital states
   * @returns {string}
   */
  visualize() {
    const lines = [];
    lines.push(`GravitationalBit (nMax=${this.nMax}, capacity=${this.capacity()} bits)`);
    lines.push(`Encoded: 0x${this.encodedValue.toString(16).padStart(32, '0')}`);
    lines.push(`Occupied: ${this.getOccupiedStates().length}/${this.states.length} (${(this.getOccupationRatio() * 100).toFixed(1)}%)`);
    lines.push('');
    
    // Group by n
    for (let n = 1; n <= this.nMax; n++) {
      const nStates = this.states.filter(s => s.n === n);
      const occupied = nStates.filter(s => s.occupied).length;
      const visual = nStates.map(s => s.occupied ? '●' : '○').join('');
      lines.push(`n=${n}: ${visual} (${occupied}/${nStates.length})`);
    }
    
    return lines.join('\n');
  }
}

/**
 * GravitationalMemory - Higher-level memory management using GravitationalBits
 */
export class GravitationalMemory {
  /**
   * @param {Object} options - Configuration options
   * @param {Function} options.storeFn - Function to store data (key, value)
   * @param {Function} options.retrieveFn - Function to retrieve data (key)
   */
  constructor(options = {}) {
    this.storeFn = options.storeFn || null;
    this.retrieveFn = options.retrieveFn || null;
    this.cache = new Map();
  }

  /**
   * Store text with gravitational bit encoding
   * @param {string} docId - Document identifier
   * @param {string} text - Text to store
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>}
   */
  async store(docId, text, metadata = {}) {
    // Chunk text into ~300-word segments
    const chunks = this.chunkText(text, 300);
    const storedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const bit = await GravitationalBit.fromText(chunk, 8);
      
      const chunkData = {
        key: `${docId}_chunk_${i}`,
        docId: docId,
        index: i,
        bit: bit.serialize(),
        text: chunk,
        metadata: { ...metadata, timestamp: Date.now() },
        timestamp: Date.now()
      };

      if (this.storeFn) {
        await this.storeFn(chunkData.key, chunkData);
      }
      
      this.cache.set(chunkData.key, chunkData);
      storedChunks.push(chunkData);
    }

    return {
      docId,
      chunkCount: chunks.length,
      chunks: storedChunks
    };
  }

  /**
   * Retrieve relevant chunks based on a query
   * @param {string} query - Search query
   * @param {number} topK - Number of top results to return
   * @returns {Promise<string[]>}
   */
  async retrieve(query, topK = 8) {
    // Get all chunks from cache or storage
    let allChunks = Array.from(this.cache.values());
    
    if (this.retrieveFn && allChunks.length === 0) {
      // If cache is empty, try to retrieve from storage
      allChunks = await this.retrieveFn();
    }

    if (allChunks.length === 0) {
      return [];
    }

    // Score each chunk based on keyword overlap
    const queryWords = new Set(query.toLowerCase().split(/\s+/));
    const scored = allChunks.map(chunk => {
      const chunkWords = new Set(chunk.text.toLowerCase().split(/\s+/));
      let score = 0;
      
      for (const word of queryWords) {
        if (chunkWords.has(word)) {
          score += 1;
          // Bonus for exact phrase match
          if (chunk.text.toLowerCase().includes(query.toLowerCase())) {
            score += 5;
          }
        }
      }
      
      // Normalize by chunk length
      score = score / Math.sqrt(chunkWords.size);
      
      return { chunk, score };
    });

    // Sort by score and return top K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.chunk.text);
  }

  /**
   * Verify the integrity of a stored chunk
   * @param {string} key - Chunk key
   * @returns {Promise<boolean>}
   */
  async verify(key) {
    const chunk = this.cache.get(key) || 
      (this.retrieveFn ? await this.retrieveFn(key) : null);
    
    if (!chunk) {
      return false;
    }

    const bit = GravitationalBit.deserialize(chunk.bit);
    const recomputedHash = await GravitationalBit.hashText(chunk.text);
    
    return bit.decode() === recomputedHash;
  }

  /**
   * Chunk text into segments of approximately targetWordCount words
   * @param {string} text - Text to chunk
   * @param {number} targetWordCount - Target words per chunk
   * @returns {string[]}
   */
  chunkText(text, targetWordCount) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;

    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).length;
      
      if (currentWordCount + wordCount > targetWordCount && currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [sentence];
        currentWordCount = wordCount;
      } else {
        currentChunk.push(sentence);
        currentWordCount += wordCount;
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    return chunks;
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      documents: new Set(Array.from(this.cache.values()).map(c => c.docId)).size
    };
  }
}

export default {
  GravitationalBit,
  GravitationalMemory,
  OrbitalState
};
