
'use server';

/**
 * @fileOverview An AI flow to correct misspelled city names.
 *
 * - correctCitySpelling - The primary exported function to call the AI flow.
 * - CityCorrectionInput - The Zod schema for the input data.
 * - CityCorrectionOutput - The Zod schema for the output data.
 */

import {
  CityCorrectionInputSchema,
  type CityCorrectionInput,
  CityCorrectionOutputSchema,
  type CityCorrectionOutput,
} from '@/lib/types';
import { generateWithFallback } from '@/services/aiGenerationService';

const correctionPromptTemplate = `You are an expert geographer and data cleaner. A user has provided a search query for a city. The query might contain typos, extra spaces, or non-alphabetic characters.

Your task is to sanitize, correct, and simplify this query to make it a valid, specific city name suitable for a weather API.

User's query: "{{query}}"

Instructions:
1.  **Simplify First:** Your most important task is to remove any conversational words or phrases that are not part of the location name itself. For example, "weather of Rudrapur" must become "Rudrapur", and "Weather Mumbai" must become "Mumbai". Other examples to remove include "weather in", "what is the forecast for", "weather", "forecast".
2.  **Sanitize:** After simplifying, remove any leading/trailing whitespace. Then, remove any special characters that are not part of a valid city name (e.g., remove \`!@#$%^&*()_+=[]{}\\|;:'",.<>/?\` but preserve hyphens or apostrophes if they are part of a name like "Saint-Étienne").
3.  **Correct Spelling:** Based on the simplified and sanitized text, identify the most likely city the user intended to search for. Fix any obvious spelling mistakes. For example, "Lodon" becomes "London", "PAris" becomes "Paris", and "New Yrok" becomes "New York". For a jumbled query like "reirbge", a plausible correction could be "Freiburg".
4.  **Output:** Return *only* the JSON object with the corrected city name in the 'correctedQuery' field. If you are absolutely unable to make a sensible correction from the input, return the original, simplified and sanitized query. Do not add any explanations or markdown formatting like \`\`\`json.
`;


export async function correctCitySpelling(input: CityCorrectionInput): Promise<CityCorrectionOutput> {
  const sanitizedQuery = input.query.trim();
  if (!sanitizedQuery) {
    return { correctedQuery: '' };
  }

  try {
    const result = await generateWithFallback({
      prompt: correctionPromptTemplate,
      input: { query: sanitizedQuery },
      output: {
          schema: CityCorrectionOutputSchema
      },
      temperature: 0.2,
      source: 'city-correction',
    });
    return result;
  } catch (err) {
    console.error(`[AI] City correction failed, returning original query. Error:`, err);
    // Failsafe for any errors during generation
    return { correctedQuery: input.query };
  }
}
