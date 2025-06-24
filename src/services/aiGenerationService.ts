
'use server';

/**
 * @fileOverview A centralized service for making resilient calls to the Gemini API.
 * This service encapsulates the logic for model fallback and API key rotation,
 * ensuring that AI generation requests are robust and efficient.
 */

import { ai } from '@/ai/genkit';
import { GenerateOptions } from 'genkit';
import { modelAvailabilityService } from '@/services/modelAvailabilityService';
import { z } from 'zod';

const PREFERRED_MODELS = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
];

// A simple in-memory cache for failing API keys.
const keyFailureTimestamps = new Map<string, number>();
const KEY_FAILURE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// This interface defines the parameters for our centralized generation function.
// It mirrors the structure of Genkit's `ai.generate()` options for familiarity.
interface GenerationParams<I extends z.ZodType, O extends z.ZodType> extends Omit<GenerateOptions, 'model' | 'output' | 'prompt' | 'input'> {
    prompt: string;
    input: z.infer<I>;
    output: {
        schema: O;
    };
    source: string; // A unique identifier for the calling flow, e.g., 'weather-summary', for logging.
}

/**
 * Makes a call to the Gemini API using an intelligent model fallback and API key rotation strategy.
 *
 * @param params The generation parameters, including prompt, input, and output schema.
 * @returns A promise that resolves with the generated output.
 * @throws An error if all model and key combinations fail.
 */
export async function generateWithFallback<I extends z.ZodType, O extends z.ZodType>(
    params: GenerationParams<I, O>
): Promise<z.infer<O>> {
    const { prompt: promptTemplate, input, output, source, ...restOfConfig } = params;

    const renderPrompt = (template: string, data: Record<string, any>): string => {
        let rendered = template;
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(data[key]));
            }
        }
        return rendered;
    };
    const finalPrompt = renderPrompt(promptTemplate, input);

    let modelsToTry = PREFERRED_MODELS.filter(model => modelAvailabilityService.isAvailable(model));
    if (modelsToTry.length === 0) {
        console.log(`[AI/${source}] All preferred models are currently cached as unavailable. Re-attempting all.`);
        modelsToTry = [...PREFERRED_MODELS];
    }
    
    const allApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (allApiKeys.length === 0) {
        throw new Error("No Gemini API keys are configured in GEMINI_API_KEYS environment variable.");
    }

    let lastError: any = new Error('All Gemini models and API keys failed.');

    for (const model of modelsToTry) {
        const now = Date.now();
        const availableKeys = allApiKeys.filter(key => {
            const failureTime = keyFailureTimestamps.get(key);
            if (!failureTime) return true;
            const isExpired = (now - failureTime > KEY_FAILURE_TTL_MS);
            if (isExpired) {
              keyFailureTimestamps.delete(key); // Clean up expired entry
            }
            return isExpired;
        });

        if (availableKeys.length === 0) {
            console.warn(`[AI/${source}] All API keys are temporarily unavailable due to recent failures. Skipping model ${model}.`);
            continue;
        }

        for (const apiKey of availableKeys) {
            try {
                console.log(`[AI/${source}] Attempting with model: ${model}`);
                
                const { output: generatedOutput } = await ai.generate({
                    model,
                    prompt: finalPrompt,
                    output: {
                        ...output,
                        format: 'json',
                    },
                    ...restOfConfig,
                    config: { apiKey }, // Override the key for this specific call.
                });
                
                if (!generatedOutput) {
                    throw new Error(`AI generation for ${source} failed to produce a valid output.`);
                }
                
                console.log(`[AI/${source}] Successful with model ${model}.`);
                return generatedOutput;

            } catch (err: any) {
                lastError = err;
                const errorMessage = (err.message || '').toLowerCase();
                const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429');
                const isInvalidKeyError = errorMessage.includes('api key not valid');

                if (isQuotaError || isInvalidKeyError) {
                    console.warn(`[AI/${source}] Key failed for model ${model} with ${isQuotaError ? 'quota' : 'invalid key'} error. Trying next key...`);
                    keyFailureTimestamps.set(apiKey, Date.now());
                    continue; // Try next available key
                } else {
                    console.error(`[AI/${source}] A non-key-related error occurred with model ${model}.`, err);
                    modelAvailabilityService.reportFailure(model);
                    break; // Break from key loop, try next model
                }
            }
        }
        // If we exhausted all keys for this model, report the model as failed.
        modelAvailabilityService.reportFailure(model);
    }
    
    console.error(`[AI/${source}] Flow failed with all models and keys:`, lastError);
  
    const finalErrorMessage = (lastError.message || '').toLowerCase();
    if (finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted')) {
        throw new Error('AI features unavailable. All configured Gemini API keys may have exceeded their free tier quota.');
    }
    if (finalErrorMessage.includes('api key not valid')) {
        throw new Error('AI features unavailable. All configured Gemini API keys appear to be invalid.');
    }

    throw new Error(`AI generation failed for ${source}. Please check server logs for details.`);
}
