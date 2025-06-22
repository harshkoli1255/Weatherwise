
'use server';

/**
 * @fileOverview A weather summary AI agent.
 *
 * - summarizeWeather - A function that handles the weather summary process.
 * - WeatherSummaryInput - The input type for the summarizeWeather function.
 * - WeatherSummaryOutput - The return type for the summarizeWeather function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { geminiApiKeys } from '@/ai/genkit';

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
  subjectLine: z.string().describe('A detailed and engaging email subject line about the current weather. It should be as descriptive and long as possible within typical subject line limits, summarizing the most important conditions like temperature, feel, wind, and precipitation.'),
  weatherSentiment: z.enum(['good', 'bad', 'neutral']).describe("The overall sentiment of the weather: 'good', 'bad', or 'neutral'.")
});
export type WeatherSummaryOutput = z.infer<typeof WeatherSummaryOutputSchema>;

const hasGeminiConfig = geminiApiKeys && geminiApiKeys.length > 0;

let weatherSummaryFlow: ((input: WeatherSummaryInput) => Promise<WeatherSummaryOutput>) | undefined;

if (hasGeminiConfig) {
  const weatherSummaryPrompt = ai.definePrompt({
      name: 'weatherSummaryPrompt',
      model: 'googleai/gemini-1.5-flash-latest',
      input: { schema: WeatherSummaryInputSchema },
      output: { schema: WeatherSummaryOutputSchema },
      prompt: `You are a helpful weather assistant. Your task is to provide a concise summary of the weather conditions for {{{city}}}, determine the overall weather sentiment, and create a detailed email subject line.

Current weather data for {{{city}}}:
- Temperature: {{{temperature}}}°C
- Feels Like: {{{feelsLike}}}°C
- Condition: {{{condition}}}
- Humidity: {{{humidity}}}%
- Wind Speed: {{{windSpeed}}} km/h

Instructions:
1.  Analyze the provided weather data.
2.  If the 'feels like' temperature is significantly different from the actual temperature (a difference of more than 5 degrees), you should mention it in your summary (e.g., "it feels like X°C"). Otherwise, do not mention the 'feels like' temperature.
3.  Based on all conditions (temperature, the actual condition, humidity, wind speed), determine if the overall weather sentiment is 'good', 'bad', or 'neutral'.
    -   'Bad' weather: Extreme temperatures (e.g., below 5°C or above 30°C), significant precipitation (rain, snow, storm), high winds (above 30 km/h).
    -   'Good' weather: Pleasant temperatures (e.g., 15°C-25°C), clear or partly cloudy skies, light winds.
    -   'Neutral' weather: Conditions that don't strongly fit 'good' or 'bad'.
4.  Set the 'weatherSentiment' field in your output schema to 'good', 'bad', or 'neutral'.
5.  Craft a summary that is easy to understand, focuses on the most important aspects, and does not exceed 50 words.
6.  Generate a detailed and engaging email subject line. It should be as long as is reasonable for a subject line, summarizing the most important aspects of the weather like temperature, feels like, wind, and overall conditions to give the user a full picture before they open the email. For example: "Mild 22°C in London with a gentle breeze, but feels cooler at 19°C - a perfect day for a walk!".
`,
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

  weatherSummaryFlow = ai.defineFlow(
    {
      name: 'weatherSummaryFlow',
      inputSchema: WeatherSummaryInputSchema,
      outputSchema: WeatherSummaryOutputSchema,
    },
    async (input) => {
      const { output } = await weatherSummaryPrompt(input);
      if (!output) {
        throw new Error("AI summary generation failed to produce an output.");
      }
      return output;
    }
  );
}

export async function summarizeWeather(input: WeatherSummaryInput): Promise<WeatherSummaryOutput> {
  if (!hasGeminiConfig || !weatherSummaryFlow) {
    throw new Error('AI summary service is not configured (Gemini API key missing).');
  }

  try {
    return await weatherSummaryFlow(input);
  } catch (err: any) {
    // Simplify error handling. Let the caller handle UI presentation.
    console.error(`AI summary generation failed:`, err);
    // Re-throw a more user-friendly error to be caught by the action.
    const errorMessage = (err.message || '').toLowerCase();
    if (
        errorMessage.includes('api key not valid') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('billing') ||
        errorMessage.includes('resource has been exhausted')
    ) {
        throw new Error('AI summary service unavailable. The configured Gemini API key may be invalid or have billing/quota issues.');
    }
    if (errorMessage.includes('safety') || errorMessage.includes('recitation')) {
        throw new Error('AI summary generation was blocked by content filters.');
    }
    throw new Error(`AI summary generation failed. Please check server logs for details.`);
  }
}
