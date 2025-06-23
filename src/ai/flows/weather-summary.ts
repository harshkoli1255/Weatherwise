'use server';

/**
 * @fileOverview A weather summary AI agent.
 * This flow includes logic to rotate Gemini API keys on quota failure.
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

  let lastError: any = new Error('All Gemini API keys failed.');

  for (const [index, apiKey] of geminiApiKeys.entries()) {
    try {
      console.log(`[AI] Attempting weather summary with Gemini key ${index + 1}/${geminiApiKeys.length}.`);
      
      const localAi = genkit({
        plugins: [googleAI({ apiKey })],
        logLevel: 'warn',
        enableTracingAndMetrics: true,
      });

      const summaryPrompt = localAi.definePrompt(
        {
          name: `weatherSummaryPrompt_key${index}`,
          input: { schema: WeatherSummaryInputSchema },
          output: { schema: WeatherSummaryOutputSchema },
          prompt: summaryPromptTemplate,
          model: 'googleai/gemini-1.5-pro-latest',
          temperature: 0.6,
          safetySettings: [
              { category: 'HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
              { category: 'DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      );

      const weatherSummaryFlow = localAi.defineFlow(
        {
          name: `weatherSummaryFlow_key${index}`,
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
      console.log(`[AI] Weather summary successful with Gemini key ${index + 1}.`);
      return result;

    } catch (err: any) {
      lastError = err;
      const errorMessage = (err.message || '').toLowerCase();
      const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || err.status === 429;

      if (isQuotaError) {
        console.warn(`[AI] Gemini key ${index + 1} failed with quota error. Retrying with next key...`);
        continue;
      } else {
        console.error(`[AI] Gemini key ${index + 1} failed with non-retryable error.`, err);
        break;
      }
    }
  }
  
  console.error(`[AI] All Gemini API keys failed for weather summary.`);
  const finalErrorMessage = (lastError.message || '').toLowerCase();
  if (
      finalErrorMessage.includes('api key not valid') ||
      finalErrorMessage.includes('permission denied') ||
      finalErrorMessage.includes('quota') ||
      finalErrorMessage.includes('billing') ||
      finalErrorMessage.includes('resource has been exhausted')
  ) {
      throw new Error('AI summary service unavailable. All configured Gemini API keys have failed, likely due to billing or quota issues.');
  }
  if (finalErrorMessage.includes('safety') || finalErrorMessage.includes('recitation')) {
      throw new Error('AI summary generation was blocked by content filters.');
  }
  throw new Error(`AI summary generation failed. Please check server logs for details.`);
}
