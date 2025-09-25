/**
 * Firebase Functions for EU2K Hub
 * API Key retrieval functions
 */

const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Define secrets for API keys
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Cloud Function to retrieve Gemini API key
 * Returns the API key securely without exposing it in frontend code
 */
exports.getGeminiApiKey = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
  },
  async (request) => {
    try {
      logger.info(`API key requested`);
      
      // Return the API key
      return {
        apiKey: geminiApiKey.value(),
        success: true
      };
      
    } catch (error) {
      logger.error("Error retrieving API key:", error);
      throw new Error("Failed to retrieve API key");
    }
  }
);