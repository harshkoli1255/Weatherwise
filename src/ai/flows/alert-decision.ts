
'use server';

/**
 * @fileOverview An AI flow to decide if a weather alert should be sent based on
 * current conditions.
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

const alertDecisionPromptTemplate = `You are an intelligent weather alert assistant. Your task is to decide if the current weather conditions are significant enough to warrant sending a notification to a user.

Analyze the following weather data for {{city}}:
- Temperature: {{temperature}}°C
- Feels Like: {{feelsLike}}°C
- Condition: {{condition}} ({{description}})
- Humidity: {{humidity}}%
- Wind Speed: {{windSpeed}} km/h

Decision Criteria:
1.  **Extreme Weather is a Priority:** Always trigger an alert for clear extreme conditions.
    -   Temperature above 30°C.
    -   Temperature below 5°C.
    -   Wind speed above 30 km/h.
    -   Conditions like "Thunderstorm", "Snow", "Tornado", or "Hail".
2.  **Combined Conditions Matter:** Trigger an alert if a combination of factors makes the weather notable, even if no single factor is extreme. For example, 10°C with 25 km/h winds and rain is more significant than just 10°C.
3.  **Be Helpful, Not Annoying:** Do not send alerts for normal, pleasant, or slightly overcast weather (e.g., 22°C and partly cloudy). The user expects alerts for weather that might impact their plans or require preparation.
4.  **Generate a Reason:** If you decide to send an alert (\`shouldSendAlert: true\`), provide a concise, user-facing reason. The reason should be formatted with HTML strong tags for emphasis, for example: "High temperature: <strong>32°C</strong>" or "Strong winds at <strong>35 km/h</strong>.". If multiple conditions are met, you can combine them like "High temperature and strong winds."
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
