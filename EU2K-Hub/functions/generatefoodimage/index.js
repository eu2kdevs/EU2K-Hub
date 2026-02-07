import fetch from 'node-fetch';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'europe-west1', maxInstances: 5, memory: '256MiB', timeoutSeconds: 20 });

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const generatefoodimage = onCall({ secrets: [geminiApiKey] }, async (request) => {
  try {
    const { prompt, config } = request.data || {};
    if (!prompt || typeof prompt !== 'string') {
      throw new HttpsError('invalid-argument', 'prompt (string) is required');
    }

    const body = {
      prompt: { text: prompt },
      imageGenerationConfig: {
        numberOfImages: config?.numberOfImages ?? 1,
        size: config?.size ?? '1024x1024',
        quality: config?.quality ?? 'standard'
      }
    };

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/imagegeneration@005:generate';
    const apiKey = geminiApiKey.value();

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new HttpsError('failed-precondition', `Images API HTTP ${res.status}: ${text}`);
    }

    const data = await res.json();
    const first = Array.isArray(data?.images) ? data.images[0] : null;
    const inline = first?.inlineData;
    if (!inline?.data) {
      throw new HttpsError('internal', 'No image returned from Images API');
    }

    return { base64: inline.data, mimeType: inline.mimeType || 'image/png' };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    throw new HttpsError('internal', err?.message || 'Image generation failed');
  }
});


