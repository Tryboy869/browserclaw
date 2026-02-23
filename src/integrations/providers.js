/**
 * providers.js - Cloud LLM Provider Integration
 * 
 * This module provides a unified interface for all cloud LLM providers.
 * Each provider implements the same interface for listing models and chat completion.
 * 
 * Supported providers:
 * - Groq
 * - OpenAI
 * - Anthropic
 * - Moonshot (Kimi)
 * - Mistral
 * - Together AI
 * - Cohere
 * - Google (Gemini)
 * - HuggingFace Inference
 */

import { getConfig } from '../core/config.js';

/**
 * Provider configurations
 */
export const PROVIDERS = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.id,
      contextWindow: m.context_window || 8192,
      costIn: null, // Groq doesn't publish costs in API
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => ({
      model,
      messages,
      stream,
      temperature: 0.7
    }),
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return { done: true };
          try {
            const parsed = JSON.parse(data);
            return {
              done: false,
              token: parsed.choices?.[0]?.delta?.content || ''
            };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.id,
      contextWindow: m.context_window || 4096,
      costIn: null,
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => ({
      model,
      messages,
      stream,
      temperature: 0.7
    }),
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return { done: true };
          try {
            const parsed = JSON.parse(data);
            return {
              done: false,
              token: parsed.choices?.[0]?.delta?.content || ''
            };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/messages',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.display_name || m.id,
      contextWindow: m.context_window || 200000,
      costIn: null,
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => {
      // Anthropic uses a different message format
      const systemMessage = messages.find(m => m.role === 'system');
      const otherMessages = messages.filter(m => m.role !== 'system');
      
      return {
        model,
        messages: otherMessages,
        system: systemMessage?.content,
        stream,
        max_tokens: 4096
      };
    },
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return { done: true };
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta') {
              return {
                done: false,
                token: parsed.delta?.text || ''
              };
            }
            return { done: false, token: '' };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  moonshot: {
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.ai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.id,
      contextWindow: m.context_window || 8192,
      costIn: null,
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => ({
      model,
      messages,
      stream,
      temperature: 0.7
    }),
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return { done: true };
          try {
            const parsed = JSON.parse(data);
            return {
              done: false,
              token: parsed.choices?.[0]?.delta?.content || ''
            };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.name || m.id,
      contextWindow: m.max_context_length || 32768,
      costIn: null,
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => ({
      model,
      messages,
      stream,
      temperature: 0.7
    }),
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return { done: true };
          try {
            const parsed = JSON.parse(data);
            return {
              done: false,
              token: parsed.choices?.[0]?.delta?.content || ''
            };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat/completions',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.id,
      contextWindow: m.context?.length || 4096,
      costIn: m.pricing?.input,
      costOut: m.pricing?.output,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => ({
      model,
      messages,
      stream,
      temperature: 0.7
    }),
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return { done: true };
          try {
            const parsed = JSON.parse(data);
            return {
              done: false,
              token: parsed.choices?.[0]?.delta?.content || ''
            };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    modelsEndpoint: '/models',
    chatEndpoint: '/chat',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.name,
      name: m.name,
      contextWindow: m.context_length || 4096,
      costIn: null,
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => {
      // Cohere uses a different format
      const lastMessage = messages[messages.length - 1];
      const chatHistory = messages.slice(0, -1).map(m => ({
        role: m.role,
        message: m.content
      }));
      
      return {
        model,
        message: lastMessage.content,
        chat_history: chatHistory,
        stream
      };
    },
    parseStreamChunk: (chunk) => {
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.event_type === 'text-generation') {
              return {
                done: false,
                token: parsed.text || ''
              };
            }
            if (parsed.event_type === 'stream-end') {
              return { done: true };
            }
            return { done: false, token: '' };
          } catch {
            return { done: false, token: '' };
          }
        }
      }
      return { done: false, token: '' };
    }
  },
  
  google: {
    name: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelsEndpoint: '/models',
    chatEndpoint: null, // Uses different endpoint pattern
    headers: (apiKey) => ({
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.name,
      name: m.displayName || m.name,
      contextWindow: m.inputTokenLimit || 32768,
      costIn: null,
      costOut: null,
      capabilities: m.supportedGenerationMethods || []
    }),
    normalizeChatRequest: (model, messages, stream) => {
      // Gemini uses a different format
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      return {
        contents,
        generationConfig: {
          temperature: 0.7
        }
      };
    },
    parseStreamChunk: (chunk) => {
      try {
        const parsed = JSON.parse(chunk);
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { done: false, token: text };
      } catch {
        return { done: false, token: '' };
      }
    }
  },
  
  huggingface: {
    name: 'HuggingFace Inference',
    baseUrl: 'https://api-inference.huggingface.co',
    modelsEndpoint: null, // Manual model entry
    chatEndpoint: null,
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    normalizeModel: (m) => ({
      id: m.id,
      name: m.id,
      contextWindow: 4096,
      costIn: null,
      costOut: null,
      capabilities: []
    }),
    normalizeChatRequest: (model, messages, stream) => ({
      inputs: messages[messages.length - 1].content,
      parameters: {
        max_new_tokens: 1024,
        return_full_text: false
      }
    }),
    parseStreamChunk: (chunk) => {
      try {
        const parsed = JSON.parse(chunk);
        const text = Array.isArray(parsed) ? parsed[0]?.generated_text : parsed.generated_text;
        return { done: true, token: text || '' };
      } catch {
        return { done: false, token: '' };
      }
    }
  }
};

/**
 * List models for a provider
 * @param {string} providerId 
 * @param {string} apiKey 
 * @returns {Promise<Array>}
 */
export async function listModels(providerId, apiKey) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  
  if (!provider.modelsEndpoint) {
    // Provider doesn't support model listing
    return [];
  }
  
  const url = `${provider.baseUrl}${provider.modelsEndpoint}`;
  
  // Special handling for Google
  if (providerId === 'google') {
    const response = await fetch(`${url}?key=${apiKey}`, {
      headers: provider.headers(apiKey)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.models?.map(provider.normalizeModel) || [];
  }
  
  const response = await fetch(url, {
    headers: provider.headers(apiKey)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Different providers return different structures
  const models = data.data || data.models || [];
  return models.map(provider.normalizeModel);
}

/**
 * Chat with a provider
 * @param {string} providerId 
 * @param {string} apiKey 
 * @param {string} model 
 * @param {Array} messages 
 * @param {boolean} stream 
 * @returns {Promise<string|AsyncGenerator>}
 */
export async function chat(providerId, apiKey, model, messages, stream = false) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Unknown provider: ${providerId}`);
  
  // Special handling for HuggingFace
  if (providerId === 'huggingface') {
    const url = `${provider.baseUrl}/models/${model}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(provider.normalizeChatRequest(model, messages, stream))
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
  }
  
  // Special handling for Google
  if (providerId === 'google') {
    const url = `${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(provider.normalizeChatRequest(model, messages, stream))
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  const url = `${provider.baseUrl}${provider.chatEndpoint}`;
  
  if (stream) {
    const response = await fetch(url, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(provider.normalizeChatRequest(model, messages, true))
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }
    
    // Return async generator for streaming
    return streamResponse(response, provider);
  } else {
    const response = await fetch(url, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(provider.normalizeChatRequest(model, messages, false))
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

/**
 * Stream response from provider
 * @param {Response} response 
 * @param {Object} provider 
 * @returns {AsyncGenerator<string>}
 */
async function* streamResponse(response, provider) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const result = provider.parseStreamChunk(chunk);
      
      if (result.done) break;
      if (result.token) {
        yield result.token;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Get all configured providers
 * @returns {Promise<Array>}
 */
export async function getConfiguredProviders() {
  const apiKeys = await getConfig('api_keys', {});
  
  return Object.entries(PROVIDERS)
    .filter(([id]) => apiKeys[id])
    .map(([id, provider]) => ({
      id,
      name: provider.name,
      hasKey: true
    }));
}

/**
 * Get all providers (configured or not)
 * @returns {Array}
 */
export function getAllProviders() {
  return Object.entries(PROVIDERS).map(([id, provider]) => ({
    id,
    name: provider.name
  }));
}

/**
 * Test a provider connection
 * @param {string} providerId 
 * @param {string} apiKey 
 * @returns {Promise<boolean>}
 */
export async function testProvider(providerId, apiKey) {
  try {
    await listModels(providerId, apiKey);
    return true;
  } catch {
    return false;
  }
}

export default {
  PROVIDERS,
  listModels,
  chat,
  getConfiguredProviders,
  getAllProviders,
  testProvider
};
