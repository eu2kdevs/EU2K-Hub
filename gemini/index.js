/**
 * Firebase Functions for EU2K Hub
 * API Key retrieval functions
 */

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const cors = require("cors")({ origin: "https://eu2kdevs.github.io" });

// Define secrets for API keys
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * Cloud Function to retrieve Gemini API key via HTTP request
 * Supports CORS so it can be called from GitHub Pages
 */
exports.getGeminiApiKey = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      logger.info("API key requested via HTTP");

      // Return the API key
      res.json({
        apiKey: geminiApiKey.value(),
        success: true,
      });
    } catch (error) {
      logger.error("Error retrieving API key:", error);
      res.status(500).json({ error: "Failed to retrieve API key" });
    }
  });
});