'use server';

/**
 * @fileOverview An AI flow to correct misspelled city names.
 * This flow includes logic to rotate Gemini API keys on quota failure.
 *
 * - correctCitySpelling - The primary exported function to call the AI flow.
 * - CityCorrectionInput - The Zod schema for the input data.
 * - CityCorrectionOutput - The Zod schema for the output data.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  CityCorrectionInputSchema,
  type CityCorrectionInput,
  CityCorrectionOutputSchema,
  type CityCorrectionOutput,
} from '@/lib/types';

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
  const geminiApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

  if (geminiApiKeys.length === 0) {
    console.warn('AI spelling correction skipped: Gemini API key missing.');
    return { correctedQuery: input.query };
  }
  
  const sanitizedQuery = input.query.trim();
  if (!sanitizedQuery) {
    return { correctedQuery: '' };
  }

  let lastError: any = new Error('All Gemini API keys failed.');

  for (const [index, apiKey] of geminiApiKeys.entries()) {
    try {
      console.log(`[AI] Attempting city correction with Gemini key ${index + 1}/${geminiApiKeys.length}.`);

      const localAi = genkit({
        plugins: [googleAI({ apiKey })],
        logLevel: 'warn',
        enableTracingAndMetrics: true,
      });

      const correctionPrompt = localAi.definePrompt(
        {
          name: `cityCorrectionPrompt_key${index}`,
          input: { schema: CityCorrectionInputSchema },
          output: { schema: CityCorrectionOutputSchema },
          prompt: correctionPromptTemplate,
        },
        {
          model: 'googleai/gemini-1.5-pro-latest',
          temperature: 0.2,
        }
      );

      const cityCorrectionFlow = localAi.defineFlow(
        {
          name: `cityCorrectionFlow_key${index}`,
          inputSchema: CityCorrectionInputSchema,
          outputSchema: CityCorrectionOutputSchema,
        },
        async (flowInput) => {
          const { output } = await correctionPrompt(flowInput);
          if (!output) {
              console.error("Failed to get AI output for city correction");
              return { correctedQuery: sanitizedQuery }; // Failsafe
          }
          return output;
        }
      );

      const result = await cityCorrectionFlow({ query: sanitizedQuery });
      console.log(`[AI] City correction successful with Gemini key ${index + 1}.`);
      return result;
      
    } catch (err: any) {
      lastError = err;
      const errorMessage = (err.message || '').toLowerCase();
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || (err as any).status === 429;

      if (isQuotaError) {
        console.warn(`[AI] Gemini key ${index + 1} failed with quota error. Retrying with next key...`);
        continue;
      } else {
        console.error(`[AI] Gemini key ${index + 1} failed with non-retryable error.`, err);
        break;
      }
    }
  }

  console.error(`AI spelling correction failed with all keys:`, lastError);

  const finalErrorMessage = (lastError.message || '').toLowerCase();
  const isQuotaFailure = finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted');
  if (isQuotaFailure) {
    throw new Error('AI features unavailable. All configured Gemini API keys have exceeded their free tier quota. Please wait or add new keys.');
  }

  return { correctedQuery: input.query }; // Failsafe for other errors
}
