
'use server';

/**
 * @fileOverview An AI flow to decide if a weather alert should be sent based on
 * current conditions AND the hourly forecast.
 *
 * - shouldSendWeatherAlert - The primary exported function to call the AI flow.
 * - AlertDecisionInput - The Zod schema for the input data.
 * - AlertDecisionOutput - The Zod schema for the output data.
 */

import {
  AlertDecisionInputSchema,
  type AlertDecisionInput,
  AlertDecisionOutputSchema,
  type AlertDecisionOutput,
} from '@/lib/types';
import { generateWithFallback } from '@/services/aiGenerationService';

const alertDecisionPromptTemplate = `You are an intelligent weather alert assistant. Your task is to decide if the current OR upcoming weather conditions are significant enough to warrant sending a notification to a user. Prioritize future changes. For example, if it's clear now but will rain in 2 hours, send an alert about the upcoming rain.

Analyze the following weather data for {{city}}:

Current Conditions:
- Temperature: {{temperature}}°C
- Feels Like: {{feelsLike}}°C
- Condition: {{condition}} ({{description}})
- Humidity: {{humidity}}%
- Wind Speed: {{windSpeed}} km/h

{{#if hourlyForecast}}
Upcoming Hourly Forecast:
{{#each hourlyForecast}}
- {{condition}} with {{precipitationChance}}% chance of rain, Temp: {{temp}}°C.
{{/each}}
{{/if}}

Decision Criteria:
1.  **Prioritize Upcoming Changes:** Your primary goal is to warn the user about significant changes. If the weather is pleasant now but will become severe (rain, snow, high wind, extreme temperature) within the next few hours, you MUST send an alert about the UPCOMING condition.
2.  **Extreme Weather is a Priority (Current or Upcoming):** Always trigger an alert for significant conditions. Look for these conditions now or in the hourly forecast:
    -   Temperature forecast to go above 30°C or below 5°C.
    -   Wind speed forecast to be above 30 km/h.
    -   Any form of upcoming precipitation with a chance > 40%: **Rain, Drizzle, Thunderstorm, Snow, Tornado, Hail, Squall**.
    -   Significant changes, e.g., a 10°C temperature drop.
3.  **Be Helpful, Not Annoying:** Do not send alerts for normal, pleasant, or slightly overcast weather that is not changing.
4.  **Generate a Clear Reason:** If you send an alert, the reason MUST be specific and actionable.
    - If it's for an upcoming event, state it clearly. Examples: "<strong>Light rain</strong> starting in the next few hours." or "Temperature will drop to <strong>4°C</strong> later today."
    - If it's for a current condition, use: "Risk of <strong>light rain</strong> now." or "Strong winds at <strong>35 km/h</strong>."
    - Format the reason with HTML strong tags for emphasis.
5.  **Final Output:** Your response must be only the JSON object in the specified format with \`shouldSendAlert\` (boolean) and \`reason\` (string). If \`shouldSendAlert\` is false, the \`reason\` must be an empty string. Do not add any other text or markdown formatting like \`\`\`json.
`;


export async function shouldSendWeatherAlert(input: AlertDecisionInput): Promise<AlertDecisionOutput> {
  try {
    return await generateWithFallback({
      prompt: alertDecisionPromptTemplate,
      input,
      output: {
        schema: AlertDecisionOutputSchema,
      },
      temperature: 0.1,
      source: 'alert-decision',
    });
  } catch (err) {
    console.error(`[AI] Alert decision failed, returning failsafe 'false'. Error:`, err);
    // Failsafe for any errors during generation
    return { shouldSendAlert: false, reason: '' };
  }
}
