/**
 * telegram.js - Telegram Bot Channel
 * 
 * This module handles Telegram Bot integration using long-polling.
 * Supports commands, free-text messages, voice messages, and inline keyboards.
 * 
 * Commands:
 * - /start - Welcome message
 * - /help - Show available commands
 * - /clear - Clear conversation history
 * - /model - Show current model info
 * - /status - Show agent status
 */

import { getConfig } from '../core/config.js';

/**
 * Telegram API base URL
 */
const TELEGRAM_API = 'https://api.telegram.org/bot';

/**
 * Telegram channel state
 */
const state = {
  token: null,
  active: false,
  offset: 0,
  pollingInterval: null,
  messageHandler: null
};

/**
 * Initialize Telegram bot
 * @param {Function} messageHandler - Callback for incoming messages
 * @returns {Promise<boolean>}
 */
export async function initTelegram(messageHandler) {
  const integrations = await getConfig('integrations', {});
  const telegram = integrations.telegram;
  
  if (!telegram || !telegram.token) {
    console.log('Telegram not configured');
    return false;
  }
  
  state.token = telegram.token;
  state.active = telegram.active !== false; // Default to active
  state.messageHandler = messageHandler;
  
  if (state.active) {
    await startPolling();
  }
  
  return true;
}

/**
 * Make Telegram API request
 * @param {string} method 
 * @param {Object} params 
 * @returns {Promise<Object>}
 */
async function apiRequest(method, params = {}) {
  if (!state.token) {
    throw new Error('Telegram not initialized');
  }
  
  const url = `${TELEGRAM_API}${state.token}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  });
  
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  
  return data.result;
}

/**
 * Start long-polling for updates
 */
async function startPolling() {
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval);
  }
  
  // Poll every 2 seconds
  state.pollingInterval = setInterval(pollUpdates, 2000);
  
  // Do an initial poll
  pollUpdates();
}

/**
 * Stop polling
 */
export function stopPolling() {
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
  }
}

/**
 * Poll for updates
 */
async function pollUpdates() {
  if (!state.active || !state.token) return;
  
  try {
    const updates = await apiRequest('getUpdates', {
      offset: state.offset,
      limit: 10,
      timeout: 30
    });
    
    for (const update of updates) {
      // Update offset to mark as processed
      state.offset = update.update_id + 1;
      
      // Handle message
      if (update.message) {
        await handleMessage(update.message);
      }
      
      // Handle callback queries (inline keyboard)
      if (update.callback_query) {
        await handleCallbackQuery(update.callback_query);
      }
    }
  } catch (error) {
    console.error('Telegram polling error:', error);
  }
}

/**
 * Handle incoming message
 * @param {Object} message 
 */
async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const username = message.from.username || message.from.first_name;
  
  // Send typing indicator
  await sendChatAction(chatId, 'typing');
  
  // Handle commands
  if (message.text && message.text.startsWith('/')) {
    await handleCommand(chatId, message.text, username);
    return;
  }
  
  // Handle voice messages
  if (message.voice) {
    await handleVoiceMessage(chatId, message.voice, userId);
    return;
  }
  
  // Handle text messages
  if (message.text) {
    // Forward to message handler
    if (state.messageHandler) {
      const response = await state.messageHandler({
        channel: 'telegram',
        userId: String(userId),
        username,
        message: message.text,
        chatId: String(chatId)
      });
      
      if (response) {
        await sendMessage(chatId, response);
      }
    }
  }
}

/**
 * Handle bot commands
 * @param {string} chatId 
 * @param {string} text 
 * @param {string} username 
 */
async function handleCommand(chatId, text, username) {
  const command = text.split(' ')[0].toLowerCase();
  
  switch (command) {
    case '/start':
      await sendMessage(
        chatId,
        `👋 Hello ${username}!\n\nI'm your AI assistant powered by BrowserClaw. I run entirely in your browser, keeping your data private.\n\nUse /help to see available commands.`
      );
      break;
      
    case '/help':
      await sendMessage(
        chatId,
        `🦞 *BrowserClaw Commands*\n\n` +
        `/start - Start the bot\n` +
        `/help - Show this help message\n` +
        `/clear - Clear conversation history\n` +
        `/model - Show current model info\n` +
        `/status - Show agent status\n\n` +
        `You can also send me any message and I'll respond!`
      );
      break;
      
    case '/clear':
      // Clear conversation history (handled by RAG Booster)
      await sendMessage(chatId, '🗑️ Conversation history cleared!');
      break;
      
    case '/model':
      const localModel = await getConfig('local_model', {});
      const soul = await getConfig('soul', {});
      await sendMessage(
        chatId,
        `🤖 *Model Info*\n\n` +
        `Active Model: ${localModel.active || 'None'}\n` +
        `Whisper: ${localModel.whisper || 'None'}\n` +
        `Agent Name: ${soul.name || 'Atlas'}`
      );
      break;
      
    case '/status':
      const routing = await getConfig('routing', {});
      await sendMessage(
        chatId,
        `📊 *Agent Status*\n\n` +
        `Mode: ${routing.mode || 'auto'}\n` +
        `Privacy Mode: ${routing.privacyMode ? 'ON' : 'OFF'}\n` +
        `Complexity Threshold: ${routing.threshold || 6}`
      );
      break;
      
    default:
      await sendMessage(chatId, '❓ Unknown command. Use /help to see available commands.');
  }
}

/**
 * Handle voice messages
 * @param {string} chatId 
 * @param {Object} voice 
 * @param {string} userId 
 */
async function handleVoiceMessage(chatId, voice, userId) {
  try {
    // Download voice file
    const fileInfo = await apiRequest('getFile', { file_id: voice.file_id });
    const fileUrl = `https://api.telegram.org/file/bot${state.token}/${fileInfo.file_path}`;
    
    // Send processing message
    await sendMessage(chatId, '🎙️ Processing voice message...');
    
    // Download audio
    const response = await fetch(fileUrl);
    const audioBlob = await response.blob();
    
    // Forward to message handler for transcription
    if (state.messageHandler) {
      const response_text = await state.messageHandler({
        channel: 'telegram',
        userId: String(userId),
        message: '[VOICE_MESSAGE]',
        audioData: audioBlob,
        chatId: String(chatId)
      });
      
      if (response_text) {
        await sendMessage(chatId, response_text);
      }
    }
  } catch (error) {
    console.error('Voice message error:', error);
    await sendMessage(chatId, '❌ Failed to process voice message.');
  }
}

/**
 * Handle callback queries (inline keyboards)
 * @param {Object} query 
 */
async function handleCallbackQuery(query) {
  // Answer the query
  await apiRequest('answerCallbackQuery', {
    callback_query_id: query.id
  });
  
  // Handle the callback data
  const data = query.data;
  const chatId = query.message.chat.id;
  
  // Forward to message handler
  if (state.messageHandler) {
    const response = await state.messageHandler({
      channel: 'telegram',
      userId: String(query.from.id),
      message: `[CALLBACK:${data}]`,
      chatId: String(chatId)
    });
    
    if (response) {
      await sendMessage(chatId, response);
    }
  }
}

/**
 * Send text message
 * @param {string} chatId 
 * @param {string} text 
 * @param {Object} options 
 * @returns {Promise<Object>}
 */
export async function sendMessage(chatId, text, options = {}) {
  const params = {
    chat_id: chatId,
    text: text,
    parse_mode: options.parseMode || 'Markdown',
    ...options
  };
  
  return apiRequest('sendMessage', params);
}

/**
 * Send chat action (typing, uploading_photo, etc.)
 * @param {string} chatId 
 * @param {string} action 
 */
export async function sendChatAction(chatId, action) {
  return apiRequest('sendChatAction', {
    chat_id: chatId,
    action
  });
}

/**
 * Send inline keyboard
 * @param {string} chatId 
 * @param {string} text 
 * @param {Array} buttons 
 */
export async function sendInlineKeyboard(chatId, text, buttons) {
  return sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: buttons
    }
  });
}

/**
 * Get bot info
 * @returns {Promise<Object>}
 */
export async function getBotInfo() {
  return apiRequest('getMe');
}

/**
 * Set webhook (for webhook mode)
 * @param {string} url 
 */
export async function setWebhook(url) {
  return apiRequest('setWebhook', { url });
}

/**
 * Delete webhook
 */
export async function deleteWebhook() {
  return apiRequest('deleteWebhook');
}

/**
 * Check if Telegram is configured and active
 * @returns {Promise<boolean>}
 */
export async function isTelegramActive() {
  const integrations = await getConfig('integrations', {});
  return integrations.telegram?.active === true && integrations.telegram?.token;
}

/**
 * Get Telegram status
 * @returns {Promise<Object>}
 */
export async function getTelegramStatus() {
  const integrations = await getConfig('integrations', {});
  const telegram = integrations.telegram;
  
  return {
    configured: !!(telegram?.token),
    active: telegram?.active === true,
    polling: state.pollingInterval !== null
  };
}

export default {
  initTelegram,
  stopPolling,
  sendMessage,
  sendChatAction,
  sendInlineKeyboard,
  getBotInfo,
  setWebhook,
  deleteWebhook,
  isTelegramActive,
  getTelegramStatus
};
