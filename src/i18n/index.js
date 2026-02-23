/**
 * i18n/index.js - Internationalization
 * 
 * Supports multiple languages with French as default.
 * Easy to extend with additional languages.
 */

import fr from './fr.json';
import en from './en.json';

/**
 * Available translations
 */
const translations = {
  fr,
  en
};

/**
 * Available languages
 */
export const AVAILABLE_LANGUAGES = {
  fr: 'Français',
  en: 'English'
};

/**
 * Current language
 */
let currentLanguage = 'fr';

/**
 * Set the current language
 * @param {string} lang 
 */
export function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
  } else {
    console.warn(`Language not found: ${lang}`);
  }
}

/**
 * Get the current language
 * @returns {string}
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Translate a key
 * @param {string} key - Dot-notation key (e.g., 'nav.dashboard')
 * @param {Object} params - Optional parameters for interpolation
 * @returns {string}
 */
export function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English
      value = translations['en'];
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = value[fk];
        } else {
          return key; // Return key if translation not found
        }
      }
      break;
    }
  }
  
  if (typeof value !== 'string') {
    return key;
  }
  
  // Simple parameter interpolation
  return value.replace(/\{\{(\w+)\}\}/g, (match, param) => {
    return params[param] !== undefined ? params[param] : match;
  });
}

/**
 * Check if a translation exists
 * @param {string} key 
 * @returns {boolean}
 */
export function hasTranslation(key) {
  const keys = key.split('.');
  let value = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return false;
    }
  }
  
  return typeof value === 'string';
}

/**
 * Get all translations for current language
 * @returns {Object}
 */
export function getAllTranslations() {
  return translations[currentLanguage];
}

/**
 * Add custom translations (for plugins/extensions)
 * @param {string} lang 
 * @param {Object} customTranslations 
 */
export function addTranslations(lang, customTranslations) {
  if (translations[lang]) {
    translations[lang] = { ...translations[lang], ...customTranslations };
  } else {
    translations[lang] = customTranslations;
  }
}

export default {
  t,
  setLanguage,
  getCurrentLanguage,
  AVAILABLE_LANGUAGES,
  hasTranslation,
  getAllTranslations,
  addTranslations
};
