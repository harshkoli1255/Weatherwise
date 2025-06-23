'use server';

/**
 * @fileOverview An AI flow to correct misspelled city names.
 *
 * This file defines the AI flow for taking a potentially misspelled city name
 * and returning a corrected version suitable for an API call.
 *
 * - correctCitySpelling - The primary exported function to call the AI flow.
 * - CityCorrectionInput - The Zod schema for the input data.
 * - CityCorrectionOutput - The Zod schema for the output data.
 */

import { ai } from '@/ai/genkit';
import {
  CityCorrectionInputSchema,
  type CityCorrectionInput,
  CityCorrectionOutputSchema,
  type CityCorrectionOutput,
} from '@/lib/types';

// Define the reusable prompt for correcting city names.
const correctionPrompt = ai.definePrompt(
  {
    name: 'cityCorrectionPrompt',
    input: { schema: CityCorrectionInputSchema },
    output: { schema: CityCorrectionOutputSchema },
    prompt: `You are an expert geographer and data cleaner. A user has provided a search query for a city. The query might contain typos, extra spaces, or non-alphabetic characters.

Your task is to sanitize, correct, and simplify this query to make it a valid, specific city name suitable for a weather API.

User's query: "{{query}}"

Instructions:
1.  **Simplify First:** Your most important task is to remove any conversational words or phrases that are not part of the location name itself. For example, "weather of Rudrapur" must become "Rudrapur", and "Weather Mumbai" must become "Mumbai". Other examples to remove include "weather in", "what is the forecast for", "weather", "forecast".
2.  **Sanitize:** After simplifying, remove any leading/trailing whitespace. Then, remove any special characters that are not part of a valid city name (e.g., remove \`!@#$%^&*()_+=[]{}\\|;:'",.<>/?\` but preserve hyphens or apostrophes if they are part of a name like "Saint-Étienne").
3.  **Correct Spelling:** Based on the simplified and sanitized text, identify the most likely city the user intended to search for. Fix any obvious spelling mistakes. For example, "Lodon" becomes "London", "PAris" becomes "Paris", and "New Yrok" becomes "New York". For a jumbled query like "reirbge", a plausible correction could be "Freiburg".
4.  **Output:** Return *only* the JSON object with the corrected city name in the 'correctedQuery' field. If you are absolutely unable to make a sensible correction from the input, return the original, simplified and sanitized query. Do not add any explanations or markdown formatting like \`\`\`json.
`,
    model: 'googleai/gemini-pro',
    temperature: 0.2, // Keep temperature low for deterministic corrections
  }
);

// Define the main flow that uses the prompt.
const cityCorrectionFlow = ai.defineFlow(
  {
    name: 'cityCorrectionFlow',
    inputSchema: CityCorrectionInputSchema,
    outputSchema: CityCorrectionOutputSchema,
  },
  async (input) => {
    // Sanitize input before sending to AI, just in case.
    const sanitizedQuery = input.query.trim();
    if (!sanitizedQuery) {
      return { correctedQuery: '' };
    }

    const { output } = await correctionPrompt({ query: sanitizedQuery });

    if (!output) {
        console.error("Failed to get AI output for city correction");
        return { correctedQuery: sanitizedQuery }; // Failsafe
    }
    return output;
  }
);

// The primary exported function that server actions will call.
export async function correctCitySpelling(input: CityCorrectionInput): Promise<CityCorrectionOutput> {
  const geminiApiKey = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k)[0];
  if (!geminiApiKey) {
    // If AI is not configured, we cannot correct spelling, so return the original query.
    console.warn('AI spelling correction skipped: Gemini API key missing.');
    return { correctedQuery: input.query };
  }

  try {
    return await cityCorrectionFlow(input);
  } catch (err: any) {
    console.error(`AI spelling correction failed:`, err);
    // If the flow fails, return the original query to not break the user's search attempt.
    return { correctedQuery: input.query };
  }
}
