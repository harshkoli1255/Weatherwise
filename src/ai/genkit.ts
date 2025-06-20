
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Read the comma-separated list of Gemini API keys from .env
const geminiApiKeysString = process.env.GEMINI_API_KEYS;
let activeGeminiApiKey = 'NO_GEMINI_KEY_CONFIGURED'; // Default if no keys are found

if (geminiApiKeysString) {
  const geminiApiKeys = geminiApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  if (geminiApiKeys.length > 0) {
    activeGeminiApiKey = geminiApiKeys[0]; // Use the first key in the list
    console.log(`Using Gemini API Key (1 of ${geminiApiKeys.length}) from the list.`);
  } else {
    console.warn(
      'GEMINI_API_KEYS is set in .env but contains no valid keys after parsing. AI features requiring Gemini will not work.'
    );
  }
} else {
  console.warn(
    'GEMINI_API_KEYS is not set in the .env file. AI features requiring Gemini will not work.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: activeGeminiApiKey,
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});

