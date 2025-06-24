
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const geminiApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

const plugins = [];
if (geminiApiKeys.length > 0) {
  console.log(`Initializing Genkit with ${geminiApiKeys.length} configured Gemini API key(s) for automatic rotation.`);
  // The googleAI plugin natively supports an array of keys for rotation.
  plugins.push(googleAI({ apiKey: geminiApiKeys }));
} else {
  console.warn(
    'GEMINI_API_KEYS is not set in the .env file. AI features requiring Gemini will not work.'
  );
}

// We define and export a global `ai` object that will be used to define flows and prompts.
export const ai = genkit({
  plugins,
  logLevel: 'warn', // Using 'warn' is less noisy than 'debug' for most cases.
  enableTracingAndMetrics: true,
});
