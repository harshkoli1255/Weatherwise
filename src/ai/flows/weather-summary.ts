
'use server';

/**
 * @fileOverview A weather summary AI agent.
 * This flow includes logic to rotate Gemini API keys on quota failure
 * and dynamically fall back to a secondary model if the primary model is unavailable.
 * It also uses a model availability cache to avoid retrying a known-failing model.
 *
 * - summarizeWeather - The primary exported function to call the AI flow.
 * - WeatherSummaryInput - The Zod schema for the input data.
 * - WeatherSummaryOutput - The Zod schema for the output data.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  WeatherSummaryInputSchema,
  type WeatherSummaryInput,
  WeatherSummaryOutputSchema,
  type WeatherSummaryOutput,
} from '@/lib/types';
import { modelAvailabilityService } from '@/services/modelAvailabilityService';

// Define models in order of preference.
const PREFERRED_MODELS = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
];

const summaryPromptTemplate = `You are Weatherwise, a friendly and insightful AI weather assistant. Your task is to provide an enhanced, conversational summary for {{city}}, determine the weather sentiment, create an engaging email subject line, and provide a creative lifestyle activity suggestion.

Current weather data for {{city}}:
- Temperature: {{temperature}}°C
- Feels Like: {{feelsLike}}°C
- Condition: {{condition}}
- Humidity: {{humidity}}%
- Wind Speed: {{windSpeed}} km/h

Your response MUST be a valid JSON object matching the requested schema. Do not add any other text or markdown formatting like \`\`\`json.

Instructions:
1.  **Analyze the Data:** Thoroughly review the provided weather data.
2.  **Determine Sentiment:** Based on all conditions, determine if the overall weather sentiment is 'good', 'bad', or 'neutral'. Set the 'weatherSentiment' field accordingly.
    -   'Bad' weather: Extreme temperatures (e.g., below 5°C or above 30°C), significant precipitation, high winds (above 30 km/h).
    -   'Good' weather: Pleasant temperatures (e.g., 15°C-25°C), clear or partly cloudy skies, light winds.
    -   'Neutral': Conditions that don't strongly fit 'good' or 'bad'.
3.  **Craft an Enhanced Summary:** Write a conversational and helpful summary. Start with a friendly greeting. Explain the key weather points clearly. **You must highlight the most impactful piece of weather information using \`<strong>\` tags.** For example, you might highlight a significant "feels like" temperature difference, high winds, or precipitation. The highlight makes it easy for users to spot the most critical detail. Example: "While it's 10°C, a strong breeze makes it <strong>feel more like 6°C</strong>, so a good jacket is recommended." Use these highlights for only the most important 1-2 pieces of information to ensure they stand out.
4.  **Generate the Subject Line:** Create a detailed and engaging email subject line. It must start with one or more relevant weather emojis (e.g., "☀️ Clear Skies & 22°C in London"). You can also include an emoji that hints at the activity suggestion, like 💡 or 🏃.
5.  **Create a Creative Activity Suggestion:** Provide a creative and specific activity suggestion. Instead of generic advice, offer a concrete idea that fits the weather. For example, for a sunny day, suggest 'It's a perfect afternoon for a picnic in the park or reading a book on a coffee shop patio.' For a rainy day, suggest 'A great opportunity to visit a <strong>local museum</strong> or cozy up with a movie marathon at home.' Keep it to a single, encouraging sentence. You can use \`<strong>\` tags here as well to highlight a key part of the suggestion.
`;


export async function summarizeWeather(input: WeatherSummaryInput): Promise<WeatherSummaryOutput> {
  const geminiApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

  if (geminiApiKeys.length === 0) {
    throw new Error('AI summary service is not configured (Gemini API key missing).');
  }
  
  let modelsToTry = PREFERRED_MODELS.filter(model => modelAvailabilityService.isAvailable(model));
  if (modelsToTry.length === 0) {
      console.log("[AI] All preferred models for summary are currently cached as unavailable. Re-attempting all to check for quota reset.");
      modelsToTry = [...PREFERRED_MODELS];
  }
  console.log(`[AI] Models to attempt for weather summary: ${modelsToTry.join(', ')}`);

  let lastError: any = new Error('All Gemini models and API keys failed.');

  for (const model of modelsToTry) {
    console.log(`[AI] Attempting weather summary with model: ${model}`);

    for (const [index, apiKey] of geminiApiKeys.entries()) {
      try {
        console.log(`[AI] Using Gemini key ${index + 1}/${geminiApiKeys.length} for model ${model}.`);
        
        const localAi = genkit({
          plugins: [googleAI({ apiKey })],
          logLevel: 'warn',
          enableTracingAndMetrics: true,
        });

        const summaryPrompt = localAi.definePrompt({
          name: `weatherSummaryPrompt_${model.replace(/[^a-zA-Z0-9]/g, '_')}_key${index}`,
          input: { schema: WeatherSummaryInputSchema },
          output: { schema: WeatherSummaryOutputSchema },
          prompt: summaryPromptTemplate,
          model,
          temperature: 0.6,
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        });

        const weatherSummaryFlow = localAi.defineFlow(
          {
            name: `weatherSummaryFlow_${model.replace(/[^a-zA-Z0-9]/g, '_')}_key${index}`,
            inputSchema: WeatherSummaryInputSchema,
            outputSchema: WeatherSummaryOutputSchema,
          },
          async (flowInput) => {
            const { output } = await summaryPrompt(flowInput);
            if (!output) {
              throw new Error('AI summary generation failed to produce a valid output.');
            }
            return output;
          }
        );
        
        const result = await weatherSummaryFlow(input);
        console.log(`[AI] Weather summary successful with model ${model} and key ${index + 1}.`);
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
     // If we exhausted all keys for a model due to quota, report it as a failure.
     modelAvailabilityService.reportFailure(model);
  }
  
  console.error(`[AI] All models and keys failed for weather summary.`);

  const finalErrorMessage = (lastError.message || '').toLowerCase();
  const isQuotaFailure = finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted');
  if (isQuotaFailure) {
    throw new Error('AI features unavailable. All configured Gemini models have exceeded their free tier quota. Please wait or add new keys.');
  }

  if (finalErrorMessage.includes('safety') || finalErrorMessage.includes('recitation')) {
      throw new Error('AI summary generation was blocked by content filters.');
  }
  
  throw new Error(`AI summary generation failed. Please check server logs for details.`);
}
