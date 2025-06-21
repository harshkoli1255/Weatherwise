
'use server';
/**
 * @fileOverview A Genkit flow to correct potential misspellings in a city search query.
 *
 * - correctCitySearchQuery - A function that takes a user's search query and returns a potentially corrected city name.
 * - CorrectCitySearchQueryInput - The input type for the correctCitySearchQuery function.
 * - CorrectCitySearchQueryOutput - The return type for the correctCitySearchQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CorrectCitySearchQueryInputSchema = z.object({
  query: z.string().describe('The user-entered city search query, which may contain typos or spacing issues.'),
});
export type CorrectCitySearchQueryInput = z.infer<typeof CorrectCitySearchQueryInputSchema>;

const CorrectCitySearchQueryOutputSchema = z.object({
  correctedQuery: z.string().describe('The corrected city name. If no correction is confident, returns the original query.'),
  wasCorrected: z.boolean().describe('True if the query was corrected, false otherwise.'),
});
export type CorrectCitySearchQueryOutput = z.infer<typeof CorrectCitySearchQueryOutputSchema>;

export async function correctCitySearchQuery(input: CorrectCitySearchQueryInput): Promise<CorrectCitySearchQueryOutput> {
  if (!input.query || input.query.trim().length === 0) {
    return { correctedQuery: input.query, wasCorrected: false };
  }
  return correctCitySearchQueryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'correctCitySearchQueryPrompt',
  input: {schema: CorrectCitySearchQueryInputSchema},
  output: {schema: CorrectCitySearchQueryOutputSchema},
  prompt: `You are an expert geographer and typist. A user has entered a city name: "{{query}}".
This query might contain spelling mistakes, typos, or incorrect spacing for multi-word city names.
Your task is to correct it to the most likely valid city name.
Pay special attention to multi-word city names that might be concatenated without spaces (e.g., "NewYork" should become "New York").
If the query is already a common and correctly spelled city name, or if you are not highly confident in a correction, return the original query and set 'wasCorrected' to false.
Otherwise, return the corrected city name and set 'wasCorrected' to true.
Only return the city name. Do not add any other explanations.

Examples:
Query: "Londno" -> Corrected: "London", wasCorrected: true
Query: "New Yrok" -> Corrected: "New York", wasCorrected: true
Query: "NewYork" -> Corrected: "New York", wasCorrected: true
Query: "losangeles" -> Corrected: "Los Angeles", wasCorrected: true
Query: "Paris" -> Corrected: "Paris", wasCorrected: false
Query: "Calofornia" -> Corrected: "California", wasCorrected: true (even if it's a state, it's a common geographic term)
Query: "asdfgh" -> Corrected: "asdfgh", wasCorrected: false

User query: "{{query}}"
`,
  config: {
    temperature: 0.2, // Lower temperature for more deterministic corrections
     safetySettings: [ // Relax safety settings slightly if needed for city names
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const correctCitySearchQueryFlow = ai.defineFlow(
  {
    name: 'correctCitySearchQueryFlow',
    inputSchema: CorrectCitySearchQueryInputSchema,
    outputSchema: CorrectCitySearchQueryOutputSchema,
  },
  async (flowInput: CorrectCitySearchQueryInput) => {
    try {
      const plainInput = { ...flowInput }; // Clone input
      const result = await prompt(plainInput); // Get the full result
      const output = result.output;
      // console.log('[AI DEBUG - correctCitySearchQueryFlow] Raw AI output:', output); // For debugging

      if (output) {
        // Basic validation: if the corrected query is empty, revert.
        if (output.correctedQuery.trim().length === 0) {
            console.log('[AI INFO - correctCitySearchQueryFlow] AI returned empty correctedQuery, reverting to original.');
            return { correctedQuery: flowInput.query, wasCorrected: false };
        }
        return output;
      }
      // If prompt output is null, fallback to original query
      console.log('[AI WARN - correctCitySearchQueryFlow] AI prompt output was null, reverting to original query.');
      return { correctedQuery: flowInput.query, wasCorrected: false };
    } catch (error) {
      console.error('Error in correctCitySearchQueryFlow:', error);
      // If the AI call fails, return the original query
      return { correctedQuery: flowInput.query, wasCorrected: false };
    }
  }
);

