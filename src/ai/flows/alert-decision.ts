
'use server';

/**
 * @fileOverview An AI flow to decide if a weather alert should be sent based on
 * current conditions. This flow includes logic to rotate Gemini API keys on quota failure
 * and dynamically fall back to a secondary model if the primary model is unavailable.
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
  const geminiApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);

  if (geminiApiKeys.length === 0) {
    console.warn('AI alert decision skipped: Gemini API key missing.');
    return { shouldSendAlert: false, reason: '' };
  }

  const modelsToTry = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
  ];
  let lastError: any = new Error('All Gemini models and API keys failed.');

  for (const model of modelsToTry) {
    console.log(`[AI] Attempting alert decision with model: ${model}`);

    for (const [index, apiKey] of geminiApiKeys.entries()) {
      try {
        console.log(`[AI] Using Gemini key ${index + 1}/${geminiApiKeys.length} for model ${model}.`);

        const localAi = genkit({
          plugins: [googleAI({ apiKey })],
          logLevel: 'warn',
          enableTracingAndMetrics: true,
        });

        const alertDecisionPrompt = localAi.definePrompt({
          name: `alertDecisionPrompt_${model.replace(/[^a-zA-Z0-9]/g, '_')}_key${index}`,
          input: { schema: AlertDecisionInputSchema },
          output: { schema: AlertDecisionOutputSchema },
          prompt: alertDecisionPromptTemplate,
          model,
          temperature: 0.1,
        });

        const alertDecisionFlow = localAi.defineFlow(
          {
            name: `alertDecisionFlow_${model.replace(/[^a-zA-Z0-9]/g, '_')}_key${index}`,
            inputSchema: AlertDecisionInputSchema,
            outputSchema: AlertDecisionOutputSchema,
          },
          async (flowInput) => {
            const { output } = await alertDecisionPrompt(flowInput);
            if (!output) {
              console.error("Failed to get AI output for alert decision");
              return { shouldSendAlert: false, reason: '' };
            }
            return output;
          }
        );
        
        const result = await alertDecisionFlow(input);
        console.log(`[AI] Alert decision successful with model ${model} and key ${index + 1}.`);
        return result;

      } catch (err: any) {
        lastError = err;
        const errorMessage = (err.message || '').toLowerCase();
        const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || (err as any).status === 429;

        if (isQuotaError) {
          console.warn(`[AI] Key ${index + 1} for model ${model} failed with quota error. Trying next key...`);
          continue; // Continue to the next API key
        } else {
          // This is a non-quota, non-retryable error for this key. We should fail fast.
          console.error(`[AI] A non-retryable error occurred with model ${model}. Failing fast.`, err);
          throw err;
        }
      }
    }
    console.log(`[AI] All keys for model ${model} failed due to quota errors. Trying fallback model...`);
  }

  console.error('AI alert decision flow failed with all models and keys:', lastError);
  
  const finalErrorMessage = (lastError.message || '').toLowerCase();
  const isQuotaFailure = finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted');
  if (isQuotaFailure) {
    throw new Error('AI features unavailable. All configured Gemini API keys have exceeded their free tier quota. Please wait or add new keys.');
  }

  // Failsafe for other errors if we somehow get here without throwing earlier
  return { shouldSendAlert: false, reason: '' };
}
