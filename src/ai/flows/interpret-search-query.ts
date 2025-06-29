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
1.  **Analyze the Intent**: Determine if the user is asking for a city/region, a specific point of interest (POI) like a landmark or business, or using conversational language.
2.  **Handle Ambiguity**: Correct spelling mistakes, expand abbreviations, and remove conversational filler (like "weather at...").
3.  **Prioritize the City**: If the query is a POI, your most important job is to identify the **containing city**. The geocoding API works best with city names.
    - For "weather at the eiffel tower", identify the POI as "Eiffel Tower" and the city as **Paris**.
    - For "VGU", expand it to "Vivekananda Global University" and identify its city as **Jaipur**.
    - For "scaler school of technology", identify the POI as "Scaler School of Technology" and its city as **Bengaluru**.
    - For a typo like "new yrok", correct it to **New York**.
4.  **Set Output Fields**:
    *   \`isSpecificLocation\`: Set to \`true\` if the original query was a POI, \`false\` otherwise.
    *   \`locationName\`: The full, proper name of the POI if one was identified (e.g., "Eiffel Tower", "Scaler School of Technology").
    *   \`cityName\`: The name of the city you extracted (e.g., "Paris", "Bengaluru"). This is the most critical field.
    *   \`searchQueryForApi\`: This should be the extracted \`cityName\` if available. Otherwise, use your best judgment to provide the most searchable term.
5.  **Final Output**: Your response must be only the JSON object in the specified format. Do not add any other text or markdown formatting like \`\`\`json.
`;


export async function interpretSearchQuery(input: InterpretSearchQueryInput): Promise<InterpretSearchQueryOutput> {
  const sanitizedQuery = input.query.trim();
  if (!sanitizedQuery) {
    return { searchQueryForApi: '', isSpecificLocation: false, cityName: '' };
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
    } else if (result.cityName) {
        result.searchQueryForApi = result.cityName;
    }
    return result;
  } catch (err) {
    console.error(`[AI] Search query interpretation failed, returning original query. Error:`, err);
    // Failsafe: return a simplified version of the original query.
    return { searchQueryForApi: sanitizedQuery, isSpecificLocation: false, cityName: sanitizedQuery };
  }
}
