
'use server';

/**
 * @fileOverview A weather summary AI agent with API key rotation.
 *
 * - summarizeWeather - A function that handles the weather summary process, rotating Gemini API keys on failure.
 * - WeatherSummaryInput - The input type for the summarizeWeather function.
 * - WeatherSummaryOutput - The return type for the summarizeWeather function.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';
import { geminiApiKeys } from '@/ai/genkit'; // Import the list of keys

const WeatherSummaryInputSchema = z.object({
  city: z.string().describe('The city to get the weather summary for.'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  feelsLike: z.number().describe('The current feels like temperature in Celsius.'),
  humidity: z.number().describe('The current humidity percentage.'),
  windSpeed: z.number().describe('The current wind speed in kilometers per hour.'),
  condition: z.string().describe('The current weather condition (e.g., sunny, cloudy, rainy).'),
});
export type WeatherSummaryInput = z.infer<typeof WeatherSummaryInputSchema>;

const WeatherSummaryOutputSchema = z.object({
  summary: z.string().describe('A short summary of the weather conditions.'),
  weatherSentiment: z.enum(['good', 'bad', 'neutral']).describe("The overall sentiment of the weather: 'good', 'bad', or 'neutral'.")
});
export type WeatherSummaryOutput = z.infer<typeof WeatherSummaryOutputSchema>;

// This function constructs the prompt text dynamically.
const getWeatherSummaryPromptText = (input: WeatherSummaryInput) => `You are a helpful weather assistant. Your task is to provide a concise summary of the weather conditions for ${input.city} and determine the overall weather sentiment.

Current weather data for ${input.city}:
- Temperature: ${input.temperature}°C
- Feels Like: ${input.feelsLike}°C
- Condition: ${input.condition}
- Humidity: ${input.humidity}%
- Wind Speed: ${input.windSpeed} km/h

Instructions:
1.  Analyze the provided weather data.
2.  If the 'feels like' temperature is significantly different from the actual temperature (a difference of more than 5 degrees), you should mention it in your summary (e.g., "it feels like X°C"). Otherwise, do not mention the 'feels like' temperature.
3.  Based on all conditions (temperature, the actual condition, humidity, wind speed), determine if the overall weather sentiment is 'good', 'bad', or 'neutral'.
    -   'Bad' weather: Extreme temperatures (e.g., below 5°C or above 30°C), significant precipitation (rain, snow, storm), high winds (above 30 km/h).
    -   'Good' weather: Pleasant temperatures (e.g., 15°C-25°C), clear or partly cloudy skies, light winds.
    -   'Neutral' weather: Conditions that don't strongly fit 'good' or 'bad'.
4.  Set the 'weatherSentiment' field in your output schema to 'good', 'bad', or 'neutral'.
5.  Craft a summary that is easy to understand, focuses on the most important aspects, and does not exceed 50 words.

Your response MUST be a valid JSON object that strictly conforms to the output schema. Do not add any explanatory text or markdown formatting before or after the JSON object.
`;

export async function summarizeWeather(input: WeatherSummaryInput): Promise<WeatherSummaryOutput> {
  if (!geminiApiKeys || geminiApiKeys.length === 0) {
    throw new Error('AI summary service is not configured (Gemini API key missing).');
  }

  let lastError: any = null;

  for (const [index, apiKey] of geminiApiKeys.entries()) {
    try {
      console.log(`Attempting AI summary with Gemini API key ${index + 1} of ${geminiApiKeys.length}.`);

      // Create a temporary, local Genkit instance for this attempt
      const tempAi = genkit({
        plugins: [
          googleAI({ apiKey }),
        ],
      });

      const result = await tempAi.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        prompt: getWeatherSummaryPromptText(input),
        output: {
          schema: WeatherSummaryOutputSchema,
        },
        config: {
          temperature: 0.5,
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      const output = result.output;

      if (!output) {
        const finishReason = result.candidates[0]?.finishReason;
        const safetyRatings = result.candidates[0]?.safetyRatings;
        let errorMessage = `AI summary generation failed with key ${index + 1}. Finish Reason: ${finishReason || 'Unknown'}`;
        if (safetyRatings) {
          console.error(`Safety Ratings (Key ${index + 1}):`, JSON.stringify(safetyRatings, null, 2));
        }
        if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
            // These are content errors, not key errors. Fail fast as another key won't help.
            throw new Error(errorMessage + ' The response was blocked by content filters.');
        }
        // Throw a generic error to be caught by the outer catch block.
        throw new Error(errorMessage);
      }

      console.log(`AI summary successfully generated with key ${index + 1}.`);
      return output; // Success! Exit the loop and return.

    } catch (err: any) {
      lastError = err;
      const errorMessage = (err.message || '').toLowerCase();
      
      // These are typical error messages for invalid keys, quota issues, or billing problems.
      const isKeyRelatedError = 
        errorMessage.includes('api key not valid') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('billing') ||
        errorMessage.includes('resource has been exhausted');

      if (isKeyRelatedError) {
        console.warn(`Gemini API key ${index + 1} failed with a key-related error: ${err.message}. Trying next key.`);
        continue; // Key-related error, so try the next key in the loop.
      } else {
        // It's a different kind of error (e.g., network, content safety), so we shouldn't retry.
        console.error(`AI summary failed with a non-key-related error using key ${index + 1}:`, err);
        throw err; // Fail fast
      }
    }
  }

  // If the loop completes, it means all keys have failed.
  console.error('All configured Gemini API keys failed to generate a summary.', lastError);
  throw new Error('AI summary service unavailable. All configured Gemini API keys failed.');
}
