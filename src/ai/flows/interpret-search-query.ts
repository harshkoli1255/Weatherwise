
'use server';

/**
 * @fileOverview An AI flow to interpret a user's natural language search query.
 *
 * - interpretSearchQuery - The primary exported function.
 * - InterpretSearchQueryInput - Zod schema for input.
 * - InterpretSearchQueryOutput - Zod schema for output.
 */

import {
  InterpretSearchQueryInputSchema,
  type InterpretSearchQueryInput,
  InterpretSearchQueryOutputSchema,
  type InterpretSearchQueryOutput,
} from '@/lib/types';
import { generateWithFallback } from '@/services/aiGenerationService';

const interpretQueryPromptTemplate = `You are an expert in natural language understanding and geocoding. Your task is to interpret a user's free-form search query and convert it into a structured format optimized for a weather geocoding API.

User's raw query: "{{query}}"

Instructions:
1.  **Analyze the Intent**: Determine if the user is asking for a city/region (e.g., "London", "California") or a specific point of interest (POI) like a landmark, business, or university (e.g., "Eiffel Tower", "Statue of Liberty", "Vivekananda Global University Jaipur").
2.  **Handle Abbreviations and Typos**: Correct spelling mistakes and expand common abbreviations. For example, "VGU" should be interpreted as "Vivekananda Global University", "Lodon" should become "London".
3.  **Extract Entities**:
    *   If it's a specific POI, extract the **name of the place** and the **containing city**.
    *   If it's just a city, the place name is not needed.
4.  **Format for Geocoding API**: Create a \`searchQueryForApi\` string. The best format is "Place, City" or just "City".
    *   For "weather at the Eiffel Tower", \`searchQueryForApi\` should be "Eiffel Tower, Paris".
    *   For "VGU jaipur", \`searchQueryForApi\` should be "Vivekananda Global University, Jaipur".
    *   For "capital of spain", \`searchQueryForApi\` should be "Madrid".
    *   For "new yrok", \`searchQueryForApi\` should be "New York".
5.  **Set Output Fields**:
    *   \`isSpecificLocation\`: Set to \`true\` if it's a POI, \`false\` otherwise.
    *   \`locationName\`: The name of the POI, if applicable.
    *   \`cityName\`: The name of the city, if one can be determined.
6.  **Final Output**: Your response must be only the JSON object in the specified format. Do not add any other text or markdown formatting like \`\`\`json.
`;


export async function interpretSearchQuery(input: InterpretSearchQueryInput): Promise<InterpretSearchQueryOutput> {
  const sanitizedQuery = input.query.trim();
  if (!sanitizedQuery) {
    return { searchQueryForApi: '', isSpecificLocation: false };
  }
  
  try {
    const result = await generateWithFallback({
      prompt: interpretQueryPromptTemplate,
      input: { query: sanitizedQuery },
      output: {
          schema: InterpretSearchQueryOutputSchema
      },
      temperature: 0.1,
      source: 'interpret-search-query',
    });
    return result;
  } catch (err) {
    console.error(`[AI] Search query interpretation failed, returning original query. Error:`, err);
    // Failsafe: return a simplified version of the original query.
    return { searchQueryForApi: sanitizedQuery, isSpecificLocation: false };
  }
}
