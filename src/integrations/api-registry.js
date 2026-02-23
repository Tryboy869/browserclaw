/**
 * api-registry.js - Configurable External Integrations Registry
 * 
 * This module manages all external API integrations for BrowserClaw.
 * Each integration defines its capabilities, required credentials, and connection methods.
 * 
 * Categories:
 * - Channels: Telegram, Discord, Slack
 * - Dev tools: GitHub
 * - Knowledge: Notion
 * - Data: Airtable
 * - Productivity: Google Calendar, Gmail
 * - Project: Linear
 * - Payments: Stripe
 * - Communication: Twilio
 * - Audio: ElevenLabs, OpenAI TTS
 * - Search: Serper, Brave
 * - Information: NewsAPI, OpenWeather
 */

import { getConfig, setConfig } from '../core/config.js';

/**
 * Integration categories
 */
export const INTEGRATION_CATEGORIES = {
  CHANNEL: 'channel',
  DEV_TOOLS: 'dev_tools',
  KNOWLEDGE: 'knowledge',
  DATA: 'data',
  PRODUCTIVITY: 'productivity',
  PROJECT: 'project',
  PAYMENTS: 'payments',
  COMMUNICATION: 'communication',
  AUDIO: 'audio',
  SEARCH: 'search',
  INFORMATION: 'information'
};

/**
 * Full integration registry
 */
export const INTEGRATION_REGISTRY = [
  // ==================== Channels ====================
  {
    id: 'telegram',
    name: 'Telegram Bot',
    category: INTEGRATION_CATEGORIES.CHANNEL,
    description: 'Receive and send messages via Telegram. Supports commands, media, and inline keyboards.',
    icon: 'message-circle',
    requiredCredentials: ['token'],
    optionalCredentials: ['webhookUrl'],
    capabilities: [
      'Receive/send messages',
      'Handle commands (/start, /help, etc.)',
      'Send/receive media',
      'Inline keyboards'
    ],
    testEndpoint: null, // Uses long-polling
    documentationUrl: 'https://core.telegram.org/bots/api'
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    category: INTEGRATION_CATEGORIES.CHANNEL,
    description: 'Connect to Discord servers. Handle guild messages, slash commands, and reactions.',
    icon: 'message-square',
    requiredCredentials: ['token'],
    optionalCredentials: ['guildId'],
    capabilities: [
      'Read/send guild messages',
      'Handle slash commands',
      'Add reactions',
      'DM users'
    ],
    testEndpoint: 'https://discord.com/api/v10/users/@me',
    documentationUrl: 'https://discord.com/developers/docs'
  },
  {
    id: 'slack',
    name: 'Slack',
    category: INTEGRATION_CATEGORIES.CHANNEL,
    description: 'Post messages and read channels in Slack workspaces.',
    icon: 'hash',
    requiredCredentials: ['token'],
    optionalCredentials: ['channelId'],
    capabilities: [
      'Post to channels',
      'Read channel messages',
      'Send direct messages'
    ],
    testEndpoint: 'https://slack.com/api/auth.test',
    documentationUrl: 'https://api.slack.com/'
  },
  
  // ==================== Dev Tools ====================
  {
    id: 'github',
    name: 'GitHub',
    category: INTEGRATION_CATEGORIES.DEV_TOOLS,
    description: 'Read/write code, open issues, create PRs, and read commits.',
    icon: 'github',
    requiredCredentials: ['token'],
    optionalCredentials: ['org', 'repo'],
    capabilities: [
      'Read repository code',
      'Create/update issues',
      'Create pull requests',
      'Read commit history',
      'Search repositories'
    ],
    testEndpoint: 'https://api.github.com/user',
    documentationUrl: 'https://docs.github.com/en/rest'
  },
  
  // ==================== Knowledge ====================
  {
    id: 'notion',
    name: 'Notion',
    category: INTEGRATION_CATEGORIES.KNOWLEDGE,
    description: 'Read/write pages and databases. Extend agent memory with Notion content.',
    icon: 'file-text',
    requiredCredentials: ['token'],
    optionalCredentials: ['databaseId'],
    capabilities: [
      'Read pages',
      'Create/update pages',
      'Query databases',
      'Add database entries'
    ],
    testEndpoint: 'https://api.notion.com/v1/users/me',
    documentationUrl: 'https://developers.notion.com/'
  },
  
  // ==================== Data ====================
  {
    id: 'airtable',
    name: 'Airtable',
    category: INTEGRATION_CATEGORIES.DATA,
    description: 'Read/write records in Airtable bases. Structured data for the agent.',
    icon: 'table',
    requiredCredentials: ['apiKey', 'baseId'],
    optionalCredentials: ['tableId'],
    capabilities: [
      'Read records',
      'Create records',
      'Update records',
      'Query with filters'
    ],
    testEndpoint: null, // Requires base ID
    documentationUrl: 'https://airtable.com/developers/web/api'
  },
  
  // ==================== Productivity ====================
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: INTEGRATION_CATEGORIES.PRODUCTIVITY,
    description: 'Read events, create reminders, and schedule tasks.',
    icon: 'calendar',
    requiredCredentials: ['clientId', 'clientSecret', 'refreshToken'],
    optionalCredentials: ['calendarId'],
    capabilities: [
      'Read events',
      'Create events',
      'Update events',
      'Set reminders'
    ],
    testEndpoint: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    documentationUrl: 'https://developers.google.com/calendar/api'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: INTEGRATION_CATEGORIES.PRODUCTIVITY,
    description: 'Read emails and send automated responses.',
    icon: 'mail',
    requiredCredentials: ['clientId', 'clientSecret', 'refreshToken'],
    optionalCredentials: [],
    capabilities: [
      'Read emails',
      'Send emails',
      'Search inbox',
      'Manage labels'
    ],
    testEndpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
    documentationUrl: 'https://developers.google.com/gmail/api'
  },
  
  // ==================== Project ====================
  {
    id: 'linear',
    name: 'Linear',
    category: INTEGRATION_CATEGORIES.PROJECT,
    description: 'Create/update issues and read project status.',
    icon: 'check-circle',
    requiredCredentials: ['apiKey'],
    optionalCredentials: ['teamId'],
    capabilities: [
      'Create issues',
      'Update issues',
      'Read project status',
      'Search issues'
    ],
    testEndpoint: 'https://api.linear.app/graphql',
    documentationUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api'
  },
  
  // ==================== Payments ====================
  {
    id: 'stripe',
    name: 'Stripe',
    category: INTEGRATION_CATEGORIES.PAYMENTS,
    description: 'Receive webhooks and read transaction data.',
    icon: 'credit-card',
    requiredCredentials: ['secretKey'],
    optionalCredentials: ['webhookSecret'],
    capabilities: [
      'Receive webhooks',
      'Read transactions',
      'Query customers',
      'Check payment status'
    ],
    testEndpoint: 'https://api.stripe.com/v1/account',
    documentationUrl: 'https://stripe.com/docs/api'
  },
  
  // ==================== Communication ====================
  {
    id: 'twilio',
    name: 'Twilio',
    category: INTEGRATION_CATEGORIES.COMMUNICATION,
    description: 'Send SMS and receive inbound messages.',
    icon: 'phone',
    requiredCredentials: ['accountSid', 'authToken', 'phoneNumber'],
    optionalCredentials: [],
    capabilities: [
      'Send SMS',
      'Receive inbound SMS',
      'Check message status'
    ],
    testEndpoint: 'https://api.twilio.com/2010-04-01/Accounts/{accountSid}.json',
    documentationUrl: 'https://www.twilio.com/docs/api'
  },
  
  // ==================== Audio ====================
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: INTEGRATION_CATEGORIES.AUDIO,
    description: 'Text-to-speech and voice cloning.',
    icon: 'volume-2',
    requiredCredentials: ['apiKey'],
    optionalCredentials: ['voiceId'],
    capabilities: [
      'Text-to-speech',
      'Voice cloning',
      'Multiple voices'
    ],
    testEndpoint: 'https://api.elevenlabs.io/v1/voices',
    documentationUrl: 'https://elevenlabs.io/docs/api-reference'
  },
  {
    id: 'openai-tts',
    name: 'OpenAI TTS',
    category: INTEGRATION_CATEGORIES.AUDIO,
    description: 'Text-to-speech via OpenAI API.',
    icon: 'volume-2',
    requiredCredentials: ['apiKey'],
    optionalCredentials: ['voice'],
    capabilities: [
      'Text-to-speech',
      'Multiple voices',
      'HD quality'
    ],
    testEndpoint: null, // Uses same key as OpenAI
    documentationUrl: 'https://platform.openai.com/docs/guides/text-to-speech'
  },
  
  // ==================== Search ====================
  {
    id: 'serper',
    name: 'Serper',
    category: INTEGRATION_CATEGORIES.SEARCH,
    description: 'Google Search API for web search capabilities.',
    icon: 'search',
    requiredCredentials: ['apiKey'],
    optionalCredentials: [],
    capabilities: [
      'Web search',
      'News search',
      'Image search'
    ],
    testEndpoint: 'https://google.serper.dev/search',
    documentationUrl: 'https://serper.dev/'
  },
  {
    id: 'brave',
    name: 'Brave Search',
    category: INTEGRATION_CATEGORIES.SEARCH,
    description: 'Privacy-focused web search API.',
    icon: 'search',
    requiredCredentials: ['apiKey'],
    optionalCredentials: [],
    capabilities: [
      'Web search',
      'News search',
      'Image search'
    ],
    testEndpoint: 'https://api.search.brave.com/res/v1/web/search?q=test',
    documentationUrl: 'https://brave.com/search/api/'
  },
  
  // ==================== Information ====================
  {
    id: 'newsapi',
    name: 'NewsAPI',
    category: INTEGRATION_CATEGORIES.INFORMATION,
    description: 'Real-time news for agent context.',
    icon: 'newspaper',
    requiredCredentials: ['apiKey'],
    optionalCredentials: [],
    capabilities: [
      'Top headlines',
      'Search news',
      'Filter by source'
    ],
    testEndpoint: 'https://newsapi.org/v2/top-headlines?country=us&pageSize=1',
    documentationUrl: 'https://newsapi.org/docs'
  },
  {
    id: 'openweather',
    name: 'OpenWeather',
    category: INTEGRATION_CATEGORIES.INFORMATION,
    description: 'Weather data for location-aware responses.',
    icon: 'cloud',
    requiredCredentials: ['apiKey'],
    optionalCredentials: [],
    capabilities: [
      'Current weather',
      'Forecast',
      'Location-based'
    ],
    testEndpoint: 'https://api.openweathermap.org/data/2.5/weather?q=London&appid={apiKey}',
    documentationUrl: 'https://openweathermap.org/api'
  }
];

/**
 * Get integration by ID
 * @param {string} id 
 * @returns {Object|null}
 */
export function getIntegration(id) {
  return INTEGRATION_REGISTRY.find(i => i.id === id) || null;
}

/**
 * Get integrations by category
 * @param {string} category 
 * @returns {Array}
 */
export function getIntegrationsByCategory(category) {
  return INTEGRATION_REGISTRY.filter(i => i.category === category);
}

/**
 * Get all integration categories
 * @returns {Array}
 */
export function getCategories() {
  return Object.values(INTEGRATION_CATEGORIES);
}

/**
 * Get integration status (active/inactive)
 * @param {string} integrationId 
 * @returns {Promise<Object>}
 */
export async function getIntegrationStatus(integrationId) {
  const integrations = await getConfig('integrations', {});
  const config = integrations[integrationId];
  
  if (!config) {
    return {
      active: false,
      configured: false
    };
  }
  
  return {
    active: config.active || false,
    configured: true,
    ...config
  };
}

/**
 * Set integration configuration
 * @param {string} integrationId 
 * @param {Object} config 
 */
export async function setIntegrationConfig(integrationId, config) {
  const integrations = await getConfig('integrations', {});
  integrations[integrationId] = {
    ...integrations[integrationId],
    ...config,
    updatedAt: Date.now()
  };
  await setConfig('integrations', integrations);
}

/**
 * Test integration connection
 * @param {string} integrationId 
 * @returns {Promise<boolean>}
 */
export async function testIntegration(integrationId) {
  const integration = getIntegration(integrationId);
  if (!integration || !integration.testEndpoint) {
    return false;
  }
  
  const status = await getIntegrationStatus(integrationId);
  if (!status.configured) {
    return false;
  }
  
  try {
    // Build test request based on integration type
    let url = integration.testEndpoint;
    const headers = {};
    
    switch (integrationId) {
      case 'github':
        headers['Authorization'] = `token ${status.token}`;
        break;
      case 'notion':
        headers['Authorization'] = `Bearer ${status.token}`;
        headers['Notion-Version'] = '2022-06-28';
        break;
      case 'slack':
        headers['Authorization'] = `Bearer ${status.token}`;
        break;
      case 'stripe':
        headers['Authorization'] = `Bearer ${status.secretKey}`;
        break;
      case 'twilio':
        // Twilio uses basic auth
        break;
      default:
        return false;
    }
    
    const response = await fetch(url, { headers });
    return response.ok;
    
  } catch (error) {
    console.error(`Integration test failed for ${integrationId}:`, error);
    return false;
  }
}

/**
 * Get all integrations with their status
 * @returns {Promise<Array>}
 */
export async function getAllIntegrationsWithStatus() {
  const integrations = [];
  
  for (const integration of INTEGRATION_REGISTRY) {
    const status = await getIntegrationStatus(integration.id);
    integrations.push({
      ...integration,
      ...status
    });
  }
  
  return integrations;
}

/**
 * Enable/disable an integration
 * @param {string} integrationId 
 * @param {boolean} enabled 
 */
export async function toggleIntegration(integrationId, enabled) {
  const status = await getIntegrationStatus(integrationId);
  if (!status.configured) {
    throw new Error('Integration not configured');
  }
  
  await setIntegrationConfig(integrationId, { active: enabled });
}

/**
 * Get active integrations
 * @returns {Promise<Array>}
 */
export async function getActiveIntegrations() {
  const all = await getAllIntegrationsWithStatus();
  return all.filter(i => i.active);
}

export default {
  INTEGRATION_REGISTRY,
  INTEGRATION_CATEGORIES,
  getIntegration,
  getIntegrationsByCategory,
  getCategories,
  getIntegrationStatus,
  setIntegrationConfig,
  testIntegration,
  getAllIntegrationsWithStatus,
  toggleIntegration,
  getActiveIntegrations
};
