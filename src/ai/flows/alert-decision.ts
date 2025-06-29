
'use server';

/**
 * @fileOverview An AI-assisted flow to decide if a weather alert should be sent.
 * This file contains both deterministic checks for weather conditions and an AI call
 * to synthesize the reasons for an alert into a human-readable message.
 *
 * - shouldSendWeatherAlert - The primary exported function.
 * - AlertDecisionInput - The Zod schema for the input data.
 * - AlertDecisionOutput - The Zod schema for the output data.
 */

import {
  type AlertDecisionInput,
  type AlertDecisionOutput,
} from '@/lib/types';
import { generateWithFallback } from '@/services/aiGenerationService';
import { z } from 'zod';

const summarizeAlertTriggersPromptTemplate = `You are a professional and friendly meteorologist. Your task is to combine a list of raw weather alert triggers into a single, concise, and clear sentence for a user notification.

The user is in {{city}}.

Combine the following triggers into one coherent reason:
{{#each triggers}}
- {{this}}
{{/each}}

Rules for Significant Weather:
- Use HTML <strong> tags to highlight the most critical information.
- If there's an upcoming event, mention the timing (e.g., "by this evening", "in the next 2 hours").
- If multiple conditions are met, combine them naturally (e.g., "Heavy rain and strong winds are expected...").
- Example: "<strong>Heavy rain and strong winds</strong> (40 km/h) are expected soon, with a <strong>70% chance of precipitation</strong>."

Rules for Good Weather:
- If the trigger is about pleasant weather, craft a friendly and positive message.
- Example: "Enjoy the beautiful weather in {{city}}! It's currently <strong>22°C with clear skies</strong>."

Final Output Rule:
- The output MUST be just the JSON object with the 'reason' field. Do not add any other text or markdown.
`;

// Input for the new summarization prompt
const SummarizeTriggersInputSchema = z.object({
  city: z.string(),
  triggers: z.array(z.string()),
});
type SummarizeTriggersInput = z.infer<typeof SummarizeTriggersInputSchema>;

// Output for the new summarization prompt (just the reason)
const SummarizeTriggersOutputSchema = z.object({
  reason: z
    .string()
    .describe(
      'A concise, user-facing reason why the alert was triggered. For example, "High temperature: 32°C" or "High winds and rain." If no alert, this should be empty.'
    ),
});


export async function shouldSendWeatherAlert(input: AlertDecisionInput): Promise<AlertDecisionOutput> {
  const triggers: string[] = [];

  // --- Deterministic Weather Checks ---

  // 1. Significant Precipitation Event
  const severePrecipitationKeywords = ["rain", "thunderstorm", "snow", "drizzle", "hail", "tornado", "squall", "sleet"];
  if (severePrecipitationKeywords.some(keyword => input.description.toLowerCase().includes(keyword))) {
    triggers.push(`Current condition is significant: ${input.description}`);
  }

  // 2. Extreme Temperature Alert
  if (input.feelsLike < 2) {
    triggers.push(`Current 'feels like' temperature is very cold: ${input.feelsLike}°C`);
  }
  if (input.feelsLike > 32) {
    triggers.push(`Current 'feels like' temperature is very hot: ${input.feelsLike}°C`);
  }
  
  // 3. High Wind Alert
  if (input.windSpeed > 35) {
    triggers.push(`Current wind speed is high: ${input.windSpeed} km/h`);
  }

  // 4. Analyze Hourly Forecast (if available)
  if (input.hourlyForecast && input.hourlyForecast.length > 0) {
    const forecast = input.hourlyForecast;

    // Check each forecast point
    forecast.forEach((hour, index) => {
        const hourLabel = `in the next ${ (index + 1) * 3 } hours`;

        if (severePrecipitationKeywords.some(keyword => hour.condition.toLowerCase().includes(keyword))) {
             triggers.push(`Forecast of ${hour.condition} ${hourLabel}`);
        }
        if (hour.precipitationChance > 60) {
            triggers.push(`High chance of rain (${hour.precipitationChance}%) forecast ${hourLabel}`);
        }
        if (hour.temp < 2) {
            triggers.push(`Forecast temperature is very cold (${hour.temp}°C) ${hourLabel}`);
        }
        if (hour.temp > 32) {
            triggers.push(`Forecast temperature is very hot (${hour.temp}°C) ${hourLabel}`);
        }
        if (hour.windSpeed > 35) {
            triggers.push(`High wind speed (${hour.windSpeed} km/h) forecast ${hourLabel}`);
        }
    });

    // 5. Rapid Temperature Change (needs at least 2 forecast points, i.e., 6 hours)
    if (forecast.length >= 2) {
        const tempNow = input.temperature;
        const tempIn6Hours = forecast[1].temp;

        if (tempIn6Hours - tempNow < -8) {
            triggers.push(`Rapid temperature drop of ${tempNow - tempIn6Hours}°C expected in the next 6 hours.`);
        }
        if (tempIn6Hours - tempNow > 10) {
            triggers.push(`Rapid temperature rise of ${tempIn6Hours - tempNow}°C expected in the next 6 hours.`);
        }
    }
  }

  // --- Decision and AI-Powered Summarization ---
  
  // Remove duplicate triggers to keep the list clean
  let uniqueTriggers = [...new Set(triggers)];

  // --- Good Weather Check (if no significant weather found) ---
  if (uniqueTriggers.length === 0) {
      const isPleasantTemp = input.temperature >= 18 && input.temperature <= 25;
      const isPleasantFeelsLike = input.feelsLike >= 18 && input.feelsLike <= 25;
      const isLightWind = input.windSpeed < 15;
      const isClearSkies = input.description.toLowerCase().includes('clear') || input.description.toLowerCase().includes('few clouds');
      
      // Check if rain is unlikely in the near future
      let isRainUnlikely = true;
      if (input.hourlyForecast && input.hourlyForecast.length > 0) {
          // Check next 6 hours (2 points)
          const immediateForecast = input.hourlyForecast.slice(0, 2);
          if (immediateForecast.some(hour => hour.precipitationChance > 30)) {
              isRainUnlikely = false;
          }
      }

      if (isPleasantTemp && isPleasantFeelsLike && isLightWind && isClearSkies && isRainUnlikely) {
          console.log(`[Alerts] Good weather conditions met for ${input.city}.`);
          uniqueTriggers.push(`It's a beautiful day! Currently ${input.temperature}°C and ${input.description}.`);
      }
  }

  if (uniqueTriggers.length === 0) {
    // No significant weather, no need to call AI.
    console.log(`[Alerts] No triggers met for ${input.city}. No alert will be sent.`);
    return { shouldSendAlert: false, reason: '' };
  }

  console.log(`[Alerts] Triggers met for ${input.city}:`, uniqueTriggers);
  
  // Call AI to create a nice summary of the triggers.
  try {
    const aiInput: SummarizeTriggersInput = { city: input.city, triggers: uniqueTriggers };
    const result = await generateWithFallback({
      prompt: summarizeAlertTriggersPromptTemplate,
      input: aiInput,
      output: {
        schema: SummarizeTriggersOutputSchema,
      },
      temperature: 0.3, // Lower temperature for more deterministic summarization
      source: 'alert-decision-summary',
    });

    return { shouldSendAlert: true, reason: result.reason };

  } catch (err) {
    console.error(`[AI] Alert reason summarization failed for ${input.city}, returning failsafe 'true' with a basic reason. Error:`, err);
    // Failsafe: if the AI fails, still send an alert with a basic, unformatted reason.
    return { shouldSendAlert: true, reason: uniqueTriggers.join(', ') };
  }
}
