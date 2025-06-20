
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The application will attempt to use GEMINI_API_KEY_1 by default.
// If you encounter quota issues with this key,
// you can update your .env file to make another key primary
// (e.g., copy the value of GEMINI_API_KEY_2 to GEMINI_API_KEY_1)
// and then restart the application.
const primaryGeminiApiKey = process.env.GEMINI_API_KEY_1;

if (!primaryGeminiApiKey) {
  console.warn(
    'GEMINI_API_KEY_1 is not set in the .env file. AI features requiring Gemini will not work.'
  );
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: primaryGeminiApiKey || 'NO_GEMINI_KEY_CONFIGURED', // Provide a fallback to prevent crash if undefined
    }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
