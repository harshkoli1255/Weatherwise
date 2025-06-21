
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Read the comma-separated list of Gemini API keys from .env
const geminiApiKeysString = process.env.GEMINI_API_KEYS;
export let geminiApiKeys: string[] = [];
let activeGeminiApiKey = 'NO_GEMINI_KEY_CONFIGURED'; // Default if no keys are found

if (geminiApiKeysString) {
  geminiApiKeys = geminiApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  if (geminiApiKeys.length > 0) {
    console.log(`Found ${geminiApiKeys.length} Gemini API key(s) in GEMINI_API_KEYS environment variable.`);
    activeGeminiApiKey = geminiApiKeys[0]; // Use the first key for the default instance
    console.log(`Initializing default Genkit instance with the first Gemini API Key (1 of ${geminiApiKeys.length}): ...${activeGeminiApiKey.slice(-4)}`);
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

// Default instance for simple flows or other parts of the app
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: activeGeminiApiKey,
    }),
  ],
});

if (geminiApiKeys.length === 0 && !geminiApiKeysString) { // Check if GEMINI_API_KEYS was not set at all
    console.log("No Gemini API keys configured (GEMINI_API_KEYS environment variable not set). AI summarization will be disabled.");
}
