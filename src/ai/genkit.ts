
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Get the first key from the comma-separated list.
const geminiApiKey = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k)[0];

export const hasGeminiConfig = !!geminiApiKey;

const plugins = [];
if (hasGeminiConfig) {
  console.log(`Initializing Genkit with a configured Gemini API key.`);
  plugins.push(googleAI({ apiKey: geminiApiKey }));
} else {
  console.warn(
    'GEMINI_API_KEYS is not set in the .env file. AI features requiring Gemini will not work.'
  );
}

// Initialize Genkit with plugins. It's safe to initialize with an empty array of plugins.
export const ai = genkit({
  plugins,
});
