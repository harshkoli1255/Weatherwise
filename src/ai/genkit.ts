
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Read the comma-separated list of Gemini API keys from .env
const geminiApiKeysString = process.env.GEMINI_API_KEYS;
let activeGeminiApiKey = 'NO_GEMINI_KEY_CONFIGURED'; // Default if no keys are found
let geminiKeysAvailable = 0;

if (geminiApiKeysString) {
  const geminiApiKeys = geminiApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  geminiKeysAvailable = geminiApiKeys.length;
  if (geminiApiKeys.length > 0) {
    activeGeminiApiKey = geminiApiKeys[0]; // Use the first key in the list
    console.log(`Genkit initialized with Gemini API Key (1 of ${geminiApiKeys.length}): ...${activeGeminiApiKey.slice(-4)}`);
  } else {
    console.warn(
      'GEMINI_API_KEYS is set in .env but contains no valid keys after parsing. AI features requiring Gemini will not work.'
    );
  }
} else {
  console.warn(
    'GEMINI_API_KEYS is not set in the .env file. AI features requiring Gemini will not work. Please set it to enable AI summaries and typo correction.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: activeGeminiApiKey,
      // You could specify a default model here if all your flows use the same one,
      // or specify it in each ai.definePrompt or ai.generate call.
      // model: 'gemini-1.5-flash-latest', 
    }),
  ],
  // flowStateStore: 'firebase', // Example if using Firebase for flow state storage
  // traceStore: 'firebase',     // Example if using Firebase for trace storage
  // logSink: 'firebase',        // Example if using Firebase for logging
});

if (geminiKeysAvailable === 0 && !geminiApiKeysString) { // Check if GEMINI_API_KEYS was not set at all
    console.log("No Gemini API keys configured (GEMINI_API_KEYS environment variable not set). AI summarization and search correction will be disabled.");
} else if (activeGeminiApiKey === 'NO_GEMINI_KEY_CONFIGURED' && geminiKeysAvailable > 0) {
    console.warn("Gemini API keys were provided in GEMINI_API_KEYS, but none could be successfully parsed for use. AI features may not work as expected.");
} else if (activeGeminiApiKey === 'NO_GEMINI_KEY_CONFIGURED' && geminiKeysAvailable === 0 && geminiApiKeysString) { // Was set but empty
    console.warn("GEMINI_API_KEYS was set but is empty or contains only whitespace. AI features will be disabled.");
}
// The successful initialization message is now part of the initial block.
