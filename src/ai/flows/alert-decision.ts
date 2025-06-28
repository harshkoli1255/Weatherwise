
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

const alertDecisionPromptTemplate = `You are an intelligent weather alert assistant. Your task is to analyze weather data and decide if a notification is warranted. You must be precise and follow the rules strictly. Prioritize alerting on upcoming changes.

**Analyze the following weather data for {{city}}:**

**Current Conditions:**
- Temperature: {{temperature}}°C
- Feels Like: {{feelsLike}}°C
- Condition: {{condition}} ({{description}})
- Humidity: {{humidity}}%
- Wind Speed: {{windSpeed}} km/h

{{#if hourlyForecast}}
**Upcoming Hourly Forecast (next 24 hours):**
{{#each hourlyForecast}}
- Condition: {{condition}}, Temp: {{temp}}°C, Wind: {{windSpeed}} km/h, Rain Chance: {{precipitationChance}}%
{{/each}}
{{/if}}

**Decision Rules (Must follow):**
You MUST set \`shouldSendAlert\` to \`true\` if ANY of the following conditions are met. Check both current and forecast data.

1.  **Precipitation Alert:**
    - Is the **current** \`condition\` one of: **Rain, Drizzle, Thunderstorm, Snow, Tornado, Hail, Squall**?
    - OR, is any **hourly forecast** \`precipitationChance\` greater than 40%?

2.  **Temperature Alert:**
    - Is the **current** \`temperature\` or \`feelsLike\` temperature greater than 30°C or less than 5°C?
    - OR, is any **hourly forecast** \`temp\` predicted to be greater than 30°C or less than 5°C?

3.  **Wind Alert:**
    - Is the **current** \`windSpeed\` greater than 30 km/h?
    - OR, is any **hourly forecast** \`windSpeed\` predicted to be greater than 30 km/h?

**Reason for Alert:**
- If you are sending an alert, the \`reason\` field MUST be clear and specific, using HTML \`<strong>\` tags for emphasis.
- If the alert is for an upcoming event, state it. Examples: "<strong>Light rain</strong> starting in the next few hours." or "Temperature will drop to <strong>4°C</strong> later today."
- If the alert is for a current condition, state that. Examples: "Active now: <strong>Light rain</strong>." or "Strong winds at <strong>35 km/h</strong>."
- If multiple conditions are met, combine them concisely. Example: "<strong>Heavy rain</strong> and <strong>strong winds</strong> expected soon."

**Final Output:**
Your response must be ONLY the JSON object in the specified format with \`shouldSendAlert\` (boolean) and \`reason\` (string). If \`shouldSendAlert\` is false, the \`reason\` MUST be an empty string. Do not add any other text or markdown formatting.
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
