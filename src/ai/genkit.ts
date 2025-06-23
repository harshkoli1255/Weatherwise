
import { configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

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

configureGenkit({
  plugins,
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
