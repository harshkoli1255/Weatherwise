
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Read the comma-separated list of Gemini API keys from .env
const geminiApiKeysString = process.env.GEMINI_API_KEYS;
export let geminiApiKeys: string[] = [];
let activeGeminiApiKey: string | undefined = undefined;

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

// Conditionally initialize the googleAI plugin
const plugins = [];
if (activeGeminiApiKey) {
    plugins.push(googleAI({ apiKey: activeGeminiApiKey }));
}

if (plugins.length === 0) {
    console.log("No Gemini API keys configured. AI features will be disabled.");
}

// Initialize Genkit with plugins that are properly configured
export const ai = genkit({
  plugins,
});
