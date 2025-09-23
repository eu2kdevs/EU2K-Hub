/**
 * Firebase Functions for EU2K Hub
 * API Key retrieval and authentication functions
 */

const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Define secrets for API keys
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Cloud Function to retrieve Gemini API key for authenticated users
 * Returns the API key securely without exposing it in frontend code
 */
exports.getGeminiApiKey = onCall(
  {
    secrets: [geminiApiKey],
    cors: true,
  },
  async (request) => {
    // Check if user is authenticated
    if (!request.auth) {
      logger.warn("Unauthorized request for API key");
      throw new Error("Authentication required");
    }

    try {
      logger.info(`API key requested by user: ${request.auth.uid}`);
      
      // Return the API key to authenticated users
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