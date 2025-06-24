
'use server';

/**
 * @fileOverview An AI flow to decide if a weather alert should be sent based on
 * current conditions. This flow includes logic to rotate Gemini API keys on quota failure
 * and dynamically fall back to a secondary model if the primary model is unavailable.
 * It also uses a model availability cache to avoid retrying a known-failing model.
 *
 * - shouldSendWeatherAlert - The primary exported function to call the AI flow.
 * - AlertDecisionInput - The Zod schema for the input data.
 * - AlertDecisionOutput - The Zod schema for the output data.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  AlertDecisionInputSchema,
  type AlertDecisionInput,
  AlertDecisionOutputSchema,
  type AlertDecisionOutput,
} from '@/lib/types';
import { modelAvailabilityService } from '@/services/modelAvailabilityService';
import { apiKeyManager } from '@/services/apiKeyManager';
import { fill } from 'genkit/cohere';

// Define models in order of preference.
const PREFERRED_MODELS = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
];

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
  const keysToTry = apiKeyManager.getKeysToTry();

  if (keysToTry.length === 0) {
    console.warn('AI alert decision skipped: No configured or available Gemini API keys.');
    return { shouldSendAlert: false, reason: '' };
  }

  let modelsToTry = PREFERRED_MODELS.filter(model => modelAvailabilityService.isAvailable(model));
  if (modelsToTry.length === 0) {
      console.log("[AI] All preferred models for alert decision are currently cached as unavailable. Re-attempting all to check for quota reset.");
      modelsToTry = [...PREFERRED_MODELS];
  }
  console.log(`[AI] Models to attempt for alert decision: ${modelsToTry.join(', ')}`);

  let lastError: any = new Error('All Gemini models and API keys failed.');

  for (const model of modelsToTry) {
    console.log(`[AI] Attempting alert decision with model: ${model}`);

    for (const { key: apiKey, index: keyIndex } of keysToTry) {
      try {
        console.log(`[AI] Using Gemini API key with index ${keyIndex} for model ${model}.`);

        const localAi = genkit({
          plugins: [googleAI({ apiKey })],
          logLevel: 'warn',
          enableTracingAndMetrics: true,
        });
        
        const { output } = await localAi.generate({
          model,
          prompt: alertDecisionPromptTemplate,
          input: input,
          output: {
            schema: AlertDecisionOutputSchema,
          },
          temperature: 0.1,
        });
        
        if (!output) {
            throw new Error("AI alert decision generation failed to produce a valid output.");
        }
        
        console.log(`[AI] Alert decision successful with model ${model} and key index ${keyIndex}.`);
        apiKeyManager.reportSuccess(keyIndex);
        return output;

      } catch (err: any) {
        lastError = err;
        const errorMessage = (err.message || '').toLowerCase();
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || (err as any).status === 429;

        if (isQuotaError) {
          console.warn(`[AI] Key index ${keyIndex} for model ${model} failed with quota error. Reporting failure and trying next key...`);
          apiKeyManager.reportFailure(keyIndex);
          continue; // Continue to the next API key
        } else {
          // This is a non-quota, non-retryable error for this key with this model.
          console.error(`[AI] A non-retryable error occurred with model ${model} and key index ${keyIndex}. Failing fast for this model.`, err);
          break; // Break from the key loop and try the next model
        }
      }
    }
    // If we're here, all available keys failed for this model.
    console.log(`[AI] All available keys for model ${model} failed. Reporting model as unavailable.`);
    modelAvailabilityService.reportFailure(model);
  }

  console.error('AI alert decision flow failed with all models and keys:', lastError);
  
  const finalErrorMessage = (lastError.message || '').toLowerCase();
  const isQuotaFailure = finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted');
  if (isQuotaFailure) {
    throw new Error('AI features unavailable. All configured Gemini API keys have exceeded their free tier quota. Please wait or add new keys.');
  }

  // Failsafe for other errors
  return { shouldSendAlert: false, reason: '' };
}
