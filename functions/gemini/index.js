const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Secret API key
const geminiApiKey = defineSecret("GEMINI_API_KEY");

exports.getGeminiApiKey = onRequest({ region: "europe-west1" }, async (req, res) => {
  try {
    logger.info("API key requested via HTTP");

    // CORS headers
    res.set("Access-Control-Allow-Origin", "https://eu2kdevs.github.io");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    res.json({
      apiKey: geminiApiKey.value(),
      success: true,
    });
  } catch (error) {
    logger.error("Error retrieving API key:", error);
    res.status(500).json({ error: "Failed to retrieve API key" });
  }
});