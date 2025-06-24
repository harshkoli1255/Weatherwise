
'use server';

/**
 * @fileOverview An AI flow to interpret natural language search queries for cities.
 * This flow can handle simple city names, misspelled names, and complex queries like "capital of Italy".
 *
 * - interpretSearchQuery - The primary exported function to call the AI flow.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  InterpretSearchQueryInputSchema,
  type InterpretSearchQueryInput,
  InterpretSearchQueryOutputSchema,
  type InterpretSearchQueryOutput,
} from '@/lib/types';
import { modelAvailabilityService } from '@/services/modelAvailabilityService';

// Define models in order of preference.
const PREFERRED_MODELS = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
];

const interpretationPromptTemplate = `You are a master geographer and data extraction specialist. Your task is to analyze a user's search query and extract the specific city they are interested in. The query could be a simple city name, a misspelled name, a conversational phrase, or a natural language question.

User's query: "{{query}}"

Instructions:
1.  **Analyze the Query:** Understand the user's intent. Are they asking for a capital city, the largest city in a region, or just providing a name?
2.  **Simplify First:** Remove any conversational words or phrases that are not part of the location name itself. For example, "weather of Rudrapur" must become "Rudrapur", and "Weather Mumbai" must become "Mumbai". Other examples to remove include "weather in", "what is the forecast for", "weather", "forecast".
3.  **Correct Spelling:** Fix any obvious spelling mistakes in the remaining text. "Lodon" becomes "London". "New Yrok" becomes "New York".
4.  **Identify the Core Location:** After simplifying and correcting, extract the most specific city name possible.
    *   If the query is "what's the forecast in the capital of France", the city is "Paris".
    *   If the query is "the biggest city in california", the city is "Los Angeles".
5.  **Handle Ambiguity:** If a query is ambiguous (e.g., "Springfield"), return the most well-known one (e.g., "Springfield, Illinois"). Our geocoding service will handle further disambiguation.
6.  **Final Output:** Your response MUST be ONLY the JSON object with the identified city name in the 'city' field. Do not add any explanations, apologies, or markdown formatting like \`\`\`json. If you cannot determine a city, return the original simplified query.
`;


export async function interpretSearchQuery(input: InterpretSearchQueryInput): Promise<InterpretSearchQueryOutput> {
  const geminiApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

  if (geminiApiKeys.length === 0) {
    console.warn('AI search interpretation skipped: Gemini API key missing.');
    return { city: input.query };
  }
  
  const sanitizedQuery = input.query.trim();
  if (!sanitizedQuery) {
    return { city: '' };
  }

  let modelsToTry = PREFERRED_MODELS.filter(model => modelAvailabilityService.isAvailable(model));
  if (modelsToTry.length === 0) {
      console.log("[AI] All preferred models for search interpretation are currently cached as unavailable. Re-attempting all to check for quota reset.");
      modelsToTry = [...PREFERRED_MODELS];
  }
  console.log(`[AI] Models to attempt for search interpretation: ${modelsToTry.join(', ')}`);
  
  let lastError: any = new Error('All Gemini models and API keys failed for search interpretation.');

  for (const model of modelsToTry) {
    console.log(`[AI] Attempting search interpretation with model: ${model}`);

    for (const [index, apiKey] of geminiApiKeys.entries()) {
      try {
        console.log(`[AI] Using Gemini key ${index + 1}/${geminiApiKeys.length} for model ${model}.`);

        const localAi = genkit({
          plugins: [googleAI({ apiKey })],
          logLevel: 'warn',
          enableTracingAndMetrics: true,
        });

        const interpretationPrompt = localAi.definePrompt({
          name: `searchInterpretationPrompt_${model.replace(/[^a-zA-Z0-9]/g, '_')}_key${index}`,
          input: { schema: InterpretSearchQueryInputSchema },
          output: { schema: InterpretSearchQueryOutputSchema },
          prompt: interpretationPromptTemplate,
          model,
          temperature: 0.1,
        });

        const interpretationFlow = localAi.defineFlow(
          {
            name: `searchInterpretationFlow_${model.replace(/[^a-zA-Z0-9]/g, '_')}_key${index}`,
            inputSchema: InterpretSearchQueryInputSchema,
            outputSchema: InterpretSearchQueryOutputSchema,
          },
          async (flowInput) => {
            const { output } = await interpretationPrompt(flowInput);
            if (!output) {
                console.error("Failed to get AI output for search interpretation");
                return { city: sanitizedQuery }; // Failsafe
            }
            return output;
          }
        );

        const result = await interpretationFlow({ query: sanitizedQuery });
        console.log(`[AI] Search interpretation successful with model ${model} and key ${index + 1}.`);
        return result;
        
      } catch (err: any) {
        lastError = err;
        const errorMessage = (err.message || '').toLowerCase();
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || (err as any).status === 429;

        if (isQuotaError) {
          console.warn(`[AI] Key ${index + 1} for model ${model} failed with quota error. Trying next key...`);
          continue; // Continue to the next API key
        } else {
           // This is a non-quota, non-retryable error for this key. We should fail fast.
          console.error(`[AI] A non-retryable error occurred with model ${model}. Failing fast.`, err);
          throw err;
        }
      }
    }
     console.log(`[AI] All keys for model ${model} failed due to quota errors. Reporting model as unavailable.`);
     modelAvailabilityService.reportFailure(model);
  }

  console.error(`AI search interpretation failed with all models and keys:`, lastError);

  const finalErrorMessage = (lastError.message || '').toLowerCase();
  const isQuotaFailure = finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted');
  if (isQuotaFailure) {
    throw new Error('AI features unavailable. All configured Gemini API keys have exceeded their free tier quota. Please wait or add new keys.');
  }

  return { city: input.query }; // Failsafe for other errors
}
