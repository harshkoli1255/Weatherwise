
'use server';

/**
 * @fileOverview An AI flow to correct misspelled city names.
 *
 * - correctCitySpelling - A function that takes a potentially misspelled city name and returns a corrected version.
 * - CityCorrectionInput - The input type for the correctCitySpelling function.
 * - CityCorrectionOutput - The return type for the correctCitySpelling function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { geminiApiKeys } from '@/ai/genkit';


const CityCorrectionInputSchema = z.object({
  query: z.string().describe('A potentially misspelled city name.'),
});
export type CityCorrectionInput = z.infer<typeof CityCorrectionInputSchema>;

const CityCorrectionOutputSchema = z.object({
  correctedQuery: z
    .string()
    .describe(
      'The corrected spelling of the city name. If the input was correct or unfixable, return the original query.'
    ),
});
export type CityCorrectionOutput = z.infer<typeof CityCorrectionOutputSchema>;

export async function correctCitySpelling(input: CityCorrectionInput): Promise<CityCorrectionOutput> {
   const hasGeminiConfig = geminiApiKeys && geminiApiKeys.length > 0;
  if (!hasGeminiConfig) {
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

const cityCorrectionPrompt = ai.definePrompt({
  name: 'cityCorrectionPrompt',
  model: 'googleai/gemini-1.5-flash-latest',
  input: { schema: CityCorrectionInputSchema },
  output: { schema: CityCorrectionOutputSchema },
  prompt: `You are a geography expert who is excellent at correcting misspelled city names.
A user has provided the following city name: {{{query}}}.

Your task is to correct the spelling of this city name.
- If the spelling is clearly wrong (e.g., "Lodon", "PAris", "New Yrok"), return the corrected name (e.g., "London", "Paris", "New York").
- If the name appears correct or you are unsure of the correction, return the original query.
- Do not provide any explanation, just the corrected city name in the 'correctedQuery' field.
- If the input is ambiguous (e.g. "berlin"), just return the original input. Let the geocoding service handle ambiguity. Your primary job is fixing clear typos.
`,
  config: {
    temperature: 0.1, // Low temperature for high confidence corrections
  },
});

const cityCorrectionFlow = ai.defineFlow(
  {
    name: 'cityCorrectionFlow',
    inputSchema: CityCorrectionInputSchema,
    outputSchema: CityCorrectionOutputSchema,
  },
  async (input) => {
    const { output } = await cityCorrectionPrompt(input);
    if (!output) {
      // If AI fails to produce an output, return the original query to avoid breaking the chain.
      return { correctedQuery: input.query };
    }
    return output;
  }
);
