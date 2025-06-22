
'use server';

/**
 * @fileOverview A weather summary AI agent.
 *
 * - summarizeWeather - A function that handles the weather summary process.
 * - WeatherSummaryInput - The input type for the summarizeWeather function.
 * - WeatherSummaryOutput - The return type for the summarizeWeather function.
 */

import { ai, hasGeminiConfig } from '@/ai/genkit';
import { z } from 'zod';

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
  summary: z.string().describe('A professional and friendly summary of the weather conditions for the body of an email. It should be a short paragraph.'),
  subjectLine: z.string().describe('A detailed and engaging email subject line, starting with one or more relevant weather emojis (e.g., ☀️, 🌧️, 💨).'),
  weatherSentiment: z.enum(['good', 'bad', 'neutral']).describe("The overall sentiment of the weather: 'good', 'bad', or 'neutral'."),
  activitySuggestion: z.string().describe('A friendly and professional suggestion for activities based on the weather (e.g., "A beautiful day for outdoor activities," "Ideal weather for travel," "A good day to focus on indoor tasks."). Keep it to a single, concise sentence.')
});
export type WeatherSummaryOutput = z.infer<typeof WeatherSummaryOutputSchema>;

const weatherSummaryPrompt = ai.definePrompt({
    name: 'weatherSummaryPrompt',
    model: 'googleai/gemini-1.5-flash-latest',
    input: { schema: WeatherSummaryInputSchema },
    output: { schema: WeatherSummaryOutputSchema },
    prompt: `You are a professional weather communication service. Your task is to provide a professional, friendly summary of the weather conditions for {{{city}}}, determine the overall weather sentiment, create a detailed, emoji-enhanced email subject line, and provide a lifestyle activity suggestion.

Current weather data for {{{city}}}:
- Temperature: {{{temperature}}}°C
- Feels Like: {{{feelsLike}}}°C
- Condition: {{{condition}}}
- Humidity: {{{humidity}}}%
- Wind Speed: {{{windSpeed}}} km/h

Instructions:
1.  **Analyze the Data:** Thoroughly review the provided weather data.
2.  **Determine Sentiment:** Based on all conditions, determine if the overall weather sentiment is 'good', 'bad', or 'neutral'. Set the 'weatherSentiment' field accordingly.
    -   'Bad' weather: Extreme temperatures (e.g., below 5°C or above 30°C), significant precipitation, high winds (above 30 km/h).
    -   'Good' weather: Pleasant temperatures (e.g., 15°C-25°C), clear or partly cloudy skies, light winds.
    -   'Neutral': Conditions that don't strongly fit 'good' or 'bad'.
3.  **Craft the Summary:** Write a professional and friendly summary for the body of an email. It should be easy to understand, focus on the most important aspects, and adopt a helpful tone. If the 'feels like' temperature is significantly different from the actual temperature (a difference of more than 5 degrees), mention it. Otherwise, do not mention it. This summary will be labeled "AI Weather Summary" in the email.
4.  **Generate the Subject Line:** Create a detailed and engaging email subject line. It must start with one or more relevant weather emojis (e.g., "☀️ Clear Skies & 22°C in London"). You can also include an emoji that hints at the activity suggestion, like 💡 or 🏠.
5.  **Create Activity Suggestion:** Based on the weather, generate a concise, one-sentence suggestion for activities. For example: "A beautiful day for outdoor activities and travel.", "Weather is ideal for staying productive indoors.", or "Exercise caution if traveling due to high winds." Set this in the 'activitySuggestion' field.
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

const weatherSummaryFlow = ai.defineFlow(
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


export async function summarizeWeather(input: WeatherSummaryInput): Promise<WeatherSummaryOutput> {
  if (!hasGeminiConfig) {
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
