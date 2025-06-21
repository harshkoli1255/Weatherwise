
'use server';

/**
 * @fileOverview A weather summary AI agent.
 *
 * - summarizeWeather - A function that handles the weather summary process.
 * - WeatherSummaryInput - The input type for the summarizeWeather function.
 * - WeatherSummaryOutput - The return type for the summarizeWeather function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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

export async function summarizeWeather(input: WeatherSummaryInput): Promise<WeatherSummaryOutput> {
  return weatherSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weatherSummaryPrompt',
  input: {schema: WeatherSummaryInputSchema},
  output: {schema: WeatherSummaryOutputSchema},
  prompt: `You are a helpful weather assistant. Your task is to provide a concise summary of the weather conditions for {{city}} and determine the overall weather sentiment.

Current weather data for {{city}}:
- Temperature: {{temperature}}°C
- Feels Like: {{feelsLike}}°C
- Condition: {{condition}}
- Humidity: {{humidity}}%
- Wind Speed: {{windSpeed}} km/h

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
`,
  config: {
    temperature: 0.5,
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }
});

const weatherSummaryFlow = ai.defineFlow(
  {
    name: 'weatherSummaryFlow',
    inputSchema: WeatherSummaryInputSchema,
    outputSchema: WeatherSummaryOutputSchema,
  },
  async (flowInput: WeatherSummaryInput) => {
    const plainInput = { ...flowInput };
    // Explicitly pass the model in the call options to ensure it's used.
    const result = await prompt(plainInput, {
        model: 'googleai/gemini-1.5-flash-latest'
    });
    const output = result.output;

    if (!output) {
      const finishReason = result.candidates[0]?.finishReason;
      const safetyRatings = result.candidates[0]?.safetyRatings;
      console.error('AI summary generation failed. Finish Reason:', finishReason);
      if (safetyRatings) {
        console.error('Safety Ratings:', JSON.stringify(safetyRatings, null, 2));
      }
      
      let errorMessage = 'AI failed to generate weather summary.';
      if (finishReason === 'SAFETY') {
        errorMessage += ' The response was blocked by safety filters. Check server logs for details.';
      } else if (finishReason === 'RECITATION') {
        errorMessage += ' The response was blocked due to recitation concerns.';
      } else {
        errorMessage += ' The model response did not conform to the required format.';
      }
      
      throw new Error(errorMessage);
    }
    return output;
  }
);
