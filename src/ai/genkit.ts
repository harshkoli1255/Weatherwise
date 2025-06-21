
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Read the comma-separated list of Gemini API keys from .env
const geminiApiKeysString = process.env.GEMINI_API_KEYS;
let activeGeminiApiKey = 'NO_GEMINI_KEY_CONFIGURED'; // Default if no keys are found
let geminiKeysAvailable = 0;

if (geminiApiKeysString) {
  const geminiApiKeys = geminiApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  geminiKeysAvailable = geminiApiKeys.length;
  if (geminiKeysAvailable > 0) {
    console.log(`Found ${geminiKeysAvailable} Gemini API key(s) in GEMINI_API_KEYS environment variable.`);
    activeGeminiApiKey = geminiApiKeys[0]; // Use the first key in the list
    console.log(`Initializing Genkit with the first Gemini API Key (1 of ${geminiKeysAvailable}): ...${activeGeminiApiKey.slice(-4)}`);
  } else {
    console.warn(
      'GEMINI_API_KEYS is set in .env but contains no valid keys after parsing. AI features requiring Gemini will not work.'
    );
  }
} else {
  console.warn(
    'GEMINI_API_KEYS is not set in the .env file. AI features requiring Gemini will not work. Please set it to enable AI summaries.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: activeGeminiApiKey,
    }),
  ],
});

if (geminiKeysAvailable === 0 && !geminiApiKeysString) { // Check if GEMINI_API_KEYS was not set at all
    console.log("No Gemini API keys configured (GEMINI_API_KEYS environment variable not set). AI summarization will be disabled.");
}

