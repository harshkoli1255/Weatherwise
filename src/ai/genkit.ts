
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// This is the new, correct way to initialize Genkit as of v1.x.
// The `configureGenkit` function has been removed, which caused the error.

const geminiApiKey = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k)[0];

const plugins = [];
if (geminiApiKey) {
  console.log(`Initializing Genkit with a configured Gemini API key.`);
  plugins.push(googleAI({ apiKey: geminiApiKey }));
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
