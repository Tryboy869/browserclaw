/**
 * soul.js - Agent Soul - Identity & Persistence
 * 
 * The Soul is the agent's persistent identity. It shapes how the agent
 * communicates across all channels and survives browser restarts.
 * 
 * The Soul includes:
 * - Name and personality
 * - Language preference
 * - Goals and skills
 * - Relationships with users
 * - Ethical values and constraints
 */

import { getConfig, setConfig, DEFAULTS } from './config.js';

/**
 * Soul schema
 */
const SOUL_SCHEMA = {
  name: 'string',
  personality: 'string',
  language: 'string',
  goals: 'array',
  skills: 'array',
  relationships: 'object',
  values: 'array'
};

/**
 * Default Soul configuration
 */
export const DEFAULT_SOUL = DEFAULTS.soul;

/**
 * Available languages
 */
export const AVAILABLE_LANGUAGES = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية'
};

/**
 * Available skills
 */
export const AVAILABLE_SKILLS = [
  'code',
  'research',
  'scheduling',
  'memory',
  'writing',
  'analysis',
  'math',
  'translation',
  'summarization',
  'creative',
  'planning',
  'debugging'
];

/**
 * Available values
 */
export const AVAILABLE_VALUES = [
  'Never share private data',
  'Always be transparent about being AI',
  'Respect user autonomy',
  'Provide accurate information',
  'Acknowledge limitations',
  'Respect copyright',
  'Prioritize user safety'
];

/**
 * Personality presets
 */
export const PERSONALITY_PRESETS = {
  helpful: 'Helpful, concise, honest. Adapts tone to context.',
  friendly: 'Warm, approachable, and conversational. Uses casual language.',
  professional: 'Formal, precise, and business-oriented. Focuses on efficiency.',
  creative: 'Imaginative, expressive, and enthusiastic. Encourages exploration.',
  analytical: 'Logical, thorough, and detail-oriented. Emphasizes evidence.',
  supportive: 'Encouraging, patient, and empathetic. Focuses on understanding.',
  witty: 'Clever, humorous, and engaging. Uses appropriate wit.',
  minimalist: 'Extremely brief and to the point. No unnecessary words.'
};

/**
 * Get the current Soul configuration
 * @returns {Promise<Object>}
 */
export async function getSoul() {
  return await getConfig('soul', DEFAULT_SOUL);
}

/**
 * Update the Soul configuration
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
export async function updateSoul(updates) {
  const current = await getSoul();
  const updated = { ...current, ...updates };
  await setConfig('soul', updated);
  return updated;
}

/**
 * Set the agent's name
 * @param {string} name 
 * @returns {Promise<Object>}
 */
export async function setName(name) {
  return updateSoul({ name: name.trim() });
}

/**
 * Set the agent's personality
 * @param {string} personality 
 * @returns {Promise<Object>}
 */
export async function setPersonality(personality) {
  return updateSoul({ personality: personality.trim() });
}

/**
 * Set the agent's language
 * @param {string} language 
 * @returns {Promise<Object>}
 */
export async function setLanguage(language) {
  if (!AVAILABLE_LANGUAGES[language]) {
    throw new Error(`Unsupported language: ${language}`);
  }
  return updateSoul({ language });
}

/**
 * Add a goal
 * @param {string} goal 
 * @returns {Promise<Object>}
 */
export async function addGoal(goal) {
  const soul = await getSoul();
  if (!soul.goals.includes(goal)) {
    soul.goals.push(goal);
    return updateSoul({ goals: soul.goals });
  }
  return soul;
}

/**
 * Remove a goal
 * @param {string} goal 
 * @returns {Promise<Object>}
 */
export async function removeGoal(goal) {
  const soul = await getSoul();
  soul.goals = soul.goals.filter(g => g !== goal);
  return updateSoul({ goals: soul.goals });
}

/**
 * Add a skill
 * @param {string} skill 
 * @returns {Promise<Object>}
 */
export async function addSkill(skill) {
  if (!AVAILABLE_SKILLS.includes(skill)) {
    throw new Error(`Unknown skill: ${skill}`);
  }
  
  const soul = await getSoul();
  if (!soul.skills.includes(skill)) {
    soul.skills.push(skill);
    return updateSoul({ skills: soul.skills });
  }
  return soul;
}

/**
 * Remove a skill
 * @param {string} skill 
 * @returns {Promise<Object>}
 */
export async function removeSkill(skill) {
  const soul = await getSoul();
  soul.skills = soul.skills.filter(s => s !== skill);
  return updateSoul({ skills: soul.skills });
}

/**
 * Add or update a relationship
 * @param {string} userId 
 * @param {Object} info 
 * @returns {Promise<Object>}
 */
export async function setRelationship(userId, info) {
  const soul = await getSoul();
  soul.relationships[userId] = {
    ...soul.relationships[userId],
    ...info,
    lastSeen: Date.now()
  };
  return updateSoul({ relationships: soul.relationships });
}

/**
 * Get relationship info
 * @param {string} userId 
 * @returns {Promise<Object|null>}
 */
export async function getRelationship(userId) {
  const soul = await getSoul();
  return soul.relationships[userId] || null;
}

/**
 * Add a value
 * @param {string} value 
 * @returns {Promise<Object>}
 */
export async function addValue(value) {
  const soul = await getSoul();
  if (!soul.values.includes(value)) {
    soul.values.push(value);
    return updateSoul({ values: soul.values });
  }
  return soul;
}

/**
 * Remove a value
 * @param {string} value 
 * @returns {Promise<Object>}
 */
export async function removeValue(value) {
  const soul = await getSoul();
  soul.values = soul.values.filter(v => v !== value);
  return updateSoul({ values: soul.values });
}

/**
 * Reset Soul to defaults
 * @returns {Promise<Object>}
 */
export async function resetSoul() {
  await setConfig('soul', DEFAULT_SOUL);
  return DEFAULT_SOUL;
}

/**
 * Get system prompt based on Soul
 * @returns {Promise<string>}
 */
export async function getSystemPrompt() {
  const soul = await getSoul();
  
  const parts = [
    `You are ${soul.name}, an AI assistant.`,
    `Personality: ${soul.personality}`,
    `Language: Respond in ${AVAILABLE_LANGUAGES[soul.language] || 'English'}.`,
    ''
  ];
  
  if (soul.goals.length > 0) {
    parts.push('Goals:');
    soul.goals.forEach(goal => parts.push(`- ${goal}`));
    parts.push('');
  }
  
  if (soul.skills.length > 0) {
    parts.push('Skills:');
    soul.skills.forEach(skill => parts.push(`- ${skill}`));
    parts.push('');
  }
  
  if (soul.values.length > 0) {
    parts.push('Values:');
    soul.values.forEach(value => parts.push(`- ${value}`));
    parts.push('');
  }
  
  parts.push('Always be helpful, honest, and respectful.');
  
  return parts.join('\n');
}

/**
 * Get personalized greeting for a user
 * @param {string} userId 
 * @param {string} userName 
 * @returns {Promise<string>}
 */
export async function getGreeting(userId, userName) {
  const soul = await getSoul();
  const relationship = await getRelationship(userId);
  
  if (relationship) {
    const lastSeen = relationship.lastSeen;
    const daysSince = Math.floor((Date.now() - lastSeen) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) {
      return `Welcome back, ${userName}!`;
    } else if (daysSince === 1) {
      return `Good to see you again, ${userName}! It's been a day.`;
    } else if (daysSince < 7) {
      return `Welcome back, ${userName}! It's been ${daysSince} days.`;
    } else {
      return `Long time no see, ${userName}! It's been ${daysSince} days. How have you been?`;
    }
  }
  
  return `Hello, ${userName}! I'm ${soul.name}. How can I help you today?`;
}

/**
 * Export Soul configuration
 * @returns {Promise<Object>}
 */
export async function exportSoul() {
  const soul = await getSoul();
  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    soul
  };
}

/**
 * Import Soul configuration
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
export async function importSoul(data) {
  if (!data.soul) {
    throw new Error('Invalid Soul data');
  }
  
  return updateSoul(data.soul);
}

/**
 * Validate Soul configuration
 * @param {Object} soul 
 * @returns {Array}
 */
export function validateSoul(soul) {
  const errors = [];
  
  for (const [key, type] of Object.entries(SOUL_SCHEMA)) {
    if (soul[key] === undefined) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }
    
    const actualType = Array.isArray(soul[key]) ? 'array' : typeof soul[key];
    if (actualType !== type) {
      errors.push(`Invalid type for ${key}: expected ${type}, got ${actualType}`);
    }
  }
  
  if (soul.language && !AVAILABLE_LANGUAGES[soul.language]) {
    errors.push(`Unsupported language: ${soul.language}`);
  }
  
  return errors;
}

/**
 * Get Soul statistics
 * @returns {Promise<Object>}
 */
export async function getSoulStats() {
  const soul = await getSoul();
  
  return {
    name: soul.name,
    language: soul.language,
    goalCount: soul.goals.length,
    skillCount: soul.skills.length,
    relationshipCount: Object.keys(soul.relationships).length,
    valueCount: soul.values.length
  };
}

export default {
  DEFAULT_SOUL,
  AVAILABLE_LANGUAGES,
  AVAILABLE_SKILLS,
  AVAILABLE_VALUES,
  PERSONALITY_PRESETS,
  getSoul,
  updateSoul,
  setName,
  setPersonality,
  setLanguage,
  addGoal,
  removeGoal,
  addSkill,
  removeSkill,
  setRelationship,
  getRelationship,
  addValue,
  removeValue,
  resetSoul,
  getSystemPrompt,
  getGreeting,
  exportSoul,
  importSoul,
  validateSoul,
  getSoulStats
};
