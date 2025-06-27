
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

const interpretQueryPromptTemplate = `You are an expert in natural language understanding and geocoding, specifically for an API that is good at finding cities but not specific landmarks. Your task is to interpret a user's free-form search query and convert it into a structured format optimized for this weather geocoding API.

User's raw query: "{{query}}"

Instructions:
1.  **Analyze the Intent**: Determine if the user is asking for a city/region (e.g., "London") or a specific point of interest (POI) like a landmark, business, or university (e.g., "Eiffel Tower", "Vivekananda Global University Jaipur").
2.  **Handle Abbreviations and Typos**: Correct spelling mistakes and expand common abbreviations.
3.  **Prioritize the City**: If the query is a POI, your most important job is to identify the **containing city**. The geocoding API works best with city names.
    - For a query like "weather at the eiffel tower", you must identify that the Eiffel Tower is in **Paris**.
    - For a query like "VGU", you must expand it to "Vivekananda Global University" and identify its city as **Jaipur**.
    - For a query with a typo like "new yrok", you must correct it to **New York**.
4.  **Format for Geocoding API**: Create a \`searchQueryForApi\` string. This string MUST BE ONLY the city name you identified.
    - For "Eiffel Tower", \`searchQueryForApi\` should be "Paris".
    - For "VGU", \`searchQueryForApi\` should be "Jaipur".
    - For "London", \`searchQueryForApi\` should be "London".
5.  **Set Output Fields**:
    *   \`isSpecificLocation\`: Set to \`true\` if the original query was a POI, \`false\` otherwise.
    *   \`locationName\`: The full, proper name of the specific location if one was identified (e.g., "Eiffel Tower").
    *   \`cityName\`: The name of the city you extracted (e.g., "Paris").
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
    // Ensure that if a specific location is identified, the API query is the city name.
    if (result.isSpecificLocation && result.cityName) {
        result.searchQueryForApi = result.cityName;
    }
    return result;
  } catch (err) {
    console.error(`[AI] Search query interpretation failed, returning original query. Error:`, err);
    // Failsafe: return a simplified version of the original query.
    return { searchQueryForApi: sanitizedQuery, isSpecificLocation: false };
  }
}
