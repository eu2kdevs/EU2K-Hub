/**
 * AI Translation Helper for EU2K Hub
 * Handles dynamic content translation using Gemini AI via Cloud Functions
 */

// Language code to full name mapping
const LANGUAGE_NAMES = {
  'hu': 'Hungarian',
  'en': 'English',
  'de': 'German',
  'es': 'Spanish',
  'fr': 'French',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'sv': 'Swedish',
  'ru': 'Russian'
};

// Cache for translated content (session-only, not persisted)
const translationCache = new Map();

/**
 * Check if AI translation is enabled for the current user
 * @returns {Promise<boolean>} - Whether AI translation is enabled
 */
async function isAiTranslationEnabled() {
  try {
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js");
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
    
    const auth = getAuth();
    if (!auth.currentUser) return true; // Default to true for non-logged in users
    
    const functionsRef = doc(window.db, 'users', auth.currentUser.uid, 'settings', 'functions');
    const functionsSnap = await getDoc(functionsRef);
    
    if (functionsSnap.exists()) {
      const data = functionsSnap.data();
      // Default to true if not found
      return data.aiTranslation !== false;
    }
    
    return true; // Default to true
  } catch (e) {
    console.warn('[AITranslation] Error checking settings:', e);
    return true; // Default to true on error
  }
}

/**
 * Get the current display language
 * @returns {string} - Language code (e.g., 'hu', 'en')
 */
function getCurrentLanguage() {
  return localStorage.getItem('eu2k_language') || 'hu';
}

/**
 * Get the full language name for translation
 * @param {string} langCode - Language code
 * @returns {string} - Full language name
 */
function getLanguageName(langCode) {
  return LANGUAGE_NAMES[langCode] || 'English';
}

/**
 * Generate a cache key for translations
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language
 * @returns {string} - Cache key
 */
function getCacheKey(text, targetLang) {
  return `${targetLang}:${text.substring(0, 100)}`;
}

/**
 * Translate a batch of texts using AI
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLanguage - Target language code or name
 * @returns {Promise<string[]>} - Translated texts
 */
async function translateBatch(texts, targetLanguage) {
  if (!texts || texts.length === 0) return texts;
  
  const langCode = targetLanguage.length === 2 ? targetLanguage : getCurrentLanguage();
  const langName = getLanguageName(langCode);
  
  // Skip if target is Hungarian (original language)
  if (langCode === 'hu') return texts;
  
  // Check which texts need translation (not in cache)
  const textsToTranslate = [];
  const translatedTexts = [];
  const translateIndices = [];
  
  texts.forEach((text, index) => {
    if (!text || text.trim() === '') {
      translatedTexts[index] = text;
      return;
    }
    
    const cacheKey = getCacheKey(text, langCode);
    if (translationCache.has(cacheKey)) {
      translatedTexts[index] = translationCache.get(cacheKey);
    } else {
      textsToTranslate.push(text);
      translateIndices.push(index);
    }
  });
  
  // If all texts are cached, return immediately
  if (textsToTranslate.length === 0) {
    return translatedTexts;
  }
  
  try {
    const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
    const functions = getFunctions(window.firebaseApp || window.app, 'europe-west1');
    const translateBatchFn = httpsCallable(functions, 'translateBatch');
    
    const result = await translateBatchFn({
      texts: textsToTranslate,
      targetLanguage: langName
    });
    
    if (result.data.success && result.data.translated) {
      const translations = Array.isArray(result.data.translated) 
        ? result.data.translated 
        : [result.data.translated];
      
      // Apply translations and update cache
      translations.forEach((translated, i) => {
        const originalIndex = translateIndices[i];
        const originalText = textsToTranslate[i];
        
        translatedTexts[originalIndex] = translated;
        
        // Cache the translation
        const cacheKey = getCacheKey(originalText, langCode);
        translationCache.set(cacheKey, translated);
      });
    }
    
    return translatedTexts;
  } catch (error) {
    console.error('[AITranslation] Batch translation error:', error);
    // Return original texts on error
    textsToTranslate.forEach((text, i) => {
      translatedTexts[translateIndices[i]] = text;
    });
    return translatedTexts;
  }
}

/**
 * Translate a single text using AI
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code or name
 * @returns {Promise<string>} - Translated text
 */
async function translateText(text, targetLanguage) {
  if (!text || text.trim() === '') return text;
  
  const results = await translateBatch([text], targetLanguage);
  return results[0];
}

/**
 * Translate fields in an object using AI
 * @param {Object} data - Object with fields to translate
 * @param {string[]} fields - Array of field names to translate (supports dot notation)
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object>} - Object with translated fields
 */
async function translateFields(data, fields, targetLanguage) {
  if (!data || !fields || fields.length === 0) return data;
  
  const langCode = targetLanguage.length === 2 ? targetLanguage : getCurrentLanguage();
  const langName = getLanguageName(langCode);
  
  // Skip if target is Hungarian (original language)
  if (langCode === 'hu') return data;
  
  try {
    const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js");
    const functions = getFunctions(window.firebaseApp || window.app, 'europe-west1');
    const translateFieldsFn = httpsCallable(functions, 'translateFields');
    
    const result = await translateFieldsFn({
      data: data,
      fields: fields,
      targetLanguage: langName
    });
    
    if (result.data.success && result.data.data) {
      return result.data.data;
    }
    
    return data;
  } catch (error) {
    console.error('[AITranslation] Field translation error:', error);
    return data;
  }
}

/**
 * Translate an array of objects with specified fields
 * @param {Object[]} items - Array of objects to translate
 * @param {string[]} fields - Fields to translate in each object
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<Object[]>} - Translated array
 */
async function translateArray(items, fields, targetLanguage) {
  if (!items || items.length === 0 || !fields || fields.length === 0) return items;
  
  const langCode = targetLanguage.length === 2 ? targetLanguage : getCurrentLanguage();
  
  // Skip if target is Hungarian (original language)
  if (langCode === 'hu') return items;
  
  // Collect all texts to translate
  const allTexts = [];
  const textMappings = []; // { itemIndex, field, textIndex }
  
  items.forEach((item, itemIndex) => {
    fields.forEach(field => {
      const value = field.includes('.') 
        ? field.split('.').reduce((obj, key) => obj?.[key], item)
        : item[field];
      
      if (value && typeof value === 'string' && value.trim() !== '') {
        textMappings.push({ itemIndex, field, textIndex: allTexts.length });
        allTexts.push(value);
      }
    });
  });
  
  if (allTexts.length === 0) return items;
  
  // Translate all texts at once
  const translatedTexts = await translateBatch(allTexts, langCode);
  
  // Apply translations back to items
  const result = JSON.parse(JSON.stringify(items)); // Deep clone
  
  textMappings.forEach(({ itemIndex, field, textIndex }) => {
    const translatedText = translatedTexts[textIndex];
    
    if (field.includes('.')) {
      const keys = field.split('.');
      let obj = result[itemIndex];
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = translatedText;
    } else {
      result[itemIndex][field] = translatedText;
    }
  });
  
  return result;
}

/**
 * Clear the translation cache
 */
function clearTranslationCache() {
  translationCache.clear();
}

// Export functions globally
window.AITranslation = {
  isEnabled: isAiTranslationEnabled,
  getCurrentLanguage,
  translateText,
  translateBatch,
  translateFields,
  translateArray,
  clearCache: clearTranslationCache
};

// Also export for ES modules
export {
  isAiTranslationEnabled,
  getCurrentLanguage,
  translateText,
  translateBatch,
  translateFields,
  translateArray,
  clearTranslationCache
};

