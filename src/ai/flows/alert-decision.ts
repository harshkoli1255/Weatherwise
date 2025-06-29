
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

const alertDecisionPromptTemplate = `You are an expert meteorologist and weather alert assistant. Your task is to analyze detailed weather data with scientific precision and decide if a notification to the user is warranted. You must prioritize alerting on significant *changes* or *extreme conditions* that could impact a person's day.

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

**Scientific Decision Rules (Must follow strictly):**
You MUST set \`shouldSendAlert\` to \`true\` if ANY of the following criteria are met. Analyze both current and forecast data.

1.  **Significant Precipitation Event:**
    - Is the **current \`description\`** or any **forecast \`condition\`** indicative of **heavy** or **severe** precipitation (e.g., "heavy rain", "thunderstorm", "snow", "freezing rain", "hail", "tornado", "squall")?
    - OR, is any **hourly forecast \`precipitationChance\`** greater than **60%**?
    - OR, is there a high likelihood (**>30%**) of a change from no precipitation to precipitation (e.g., from "clear" to "rain")?

2.  **Extreme Temperature Alert:**
    - Is the **current \`feelsLike\`** temperature or any **forecast \`temp\`** outside the range of **2°C to 32°C**? (i.e., less than 2°C or greater than 32°C). The 'feels like' temperature is critical here.

3.  **Rapid Temperature Change:**
    - Will the temperature **drop** by more than **8°C** within the next 6 hours?
    - Will the temperature **rise** by more than **10°C** within the next 6 hours?
    (Check the hourly forecast data to determine this).

4.  **High Wind Alert:**
    - Is the **current \`windSpeed\`** or any **forecast \`windSpeed\`** predicted to be greater than **35 km/h**? This indicates conditions that could be disruptive.

**Reasoning for the Alert (Critically Important):**
- If you are sending an alert, the \`reason\` field MUST be clear, specific, and use HTML \`<strong>\` tags for emphasis on the most critical information.
- The reason should sound like it comes from a professional meteorologist.
- **If for an upcoming event, state the timing.** Examples: "Temperature will drop sharply to <strong>-2°C</strong> by this evening." or "<strong>Heavy rain</strong> with a <strong>70% chance</strong> starting in the next 2 hours."
- **If for a current condition, state that.** Examples: "Active now: <strong>Strong winds at 40 km/h</strong>." or "Extreme heat warning: Feels like <strong>35°C</strong> currently."
- **If multiple conditions are met, combine them.** Example: "<strong>Heavy rain and strong winds</strong> expected soon."

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
