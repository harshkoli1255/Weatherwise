
'use server';

/**
 * @fileOverview A centralized service for making resilient calls to the Gemini API.
 * This service encapsulates the logic for model fallback and API key rotation,
 * ensuring that AI generation requests are robust and efficient.
 */

import { genkit, GenerateOptions } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { modelAvailabilityService } from '@/services/modelAvailabilityService';
import { apiKeyManager } from '@/services/apiKeyManager';
import { z } from 'zod';

const PREFERRED_MODELS = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
];

// This interface defines the parameters for our centralized generation function.
// It mirrors the structure of Genkit's `ai.generate()` options for familiarity.
interface GenerationParams<I extends z.ZodType, O extends z.ZodType> extends Omit<GenerateOptions, 'model' | 'output' | 'input'> {
    prompt: string;
    input: z.infer<I>;
    output: {
        schema: O;
    };
    source: string; // A unique identifier for the calling flow, e.g., 'weather-summary', for logging.
}

/**
 * Makes a call to the Gemini API using an intelligent fallback strategy.
 * It iterates through preferred models and available API keys, handling quota errors
 * and other failures gracefully.
 *
 * @param params The generation parameters, including prompt, input, and output schema.
 * @returns A promise that resolves with the generated output.
 * @throws An error if all model and key combinations fail.
 */
export async function generateWithFallback<I extends z.ZodType, O extends z.ZodType>(
    params: GenerationParams<I, O>
): Promise<z.infer<O>> {
    const { prompt, input, output, source, ...restOfConfig } = params;

    const keysToTry = apiKeyManager.getKeysToTry();
    if (keysToTry.length === 0) {
        const errorMsg = 'AI service is not configured or no keys are available.';
        console.warn(`[AI/${source}] Skipped: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    let modelsToTry = PREFERRED_MODELS.filter(model => modelAvailabilityService.isAvailable(model));
    if (modelsToTry.length === 0) {
        console.log(`[AI/${source}] All preferred models are currently cached as unavailable. Re-attempting all.`);
        modelsToTry = [...PREFERRED_MODELS];
    }
    console.log(`[AI/${source}] Models to attempt: ${modelsToTry.join(', ')}`);

    let lastError: any = new Error('All Gemini models and API keys failed.');

    for (const model of modelsToTry) {
        console.log(`[AI/${source}] Attempting with model: ${model}`);

        for (const { key: apiKey, index: keyIndex } of keysToTry) {
            try {
                console.log(`[AI/${source}] Using Gemini API key with index ${keyIndex} for model ${model}.`);

                const localAi = genkit({
                    plugins: [googleAI({ apiKey })],
                    logLevel: 'warn',
                    enableTracingAndMetrics: true,
                });
                
                const { output: generatedOutput } = await localAi.generate({
                    model,
                    prompt,
                    input,
                    output,
                    ...restOfConfig
                });
                
                if (!generatedOutput) {
                    throw new Error(`AI generation for ${source} failed to produce a valid output.`);
                }
                
                console.log(`[AI/${source}] Successful with model ${model} and key index ${keyIndex}.`);
                apiKeyManager.reportSuccess(keyIndex);
                return generatedOutput;

            } catch (err: any) {
                lastError = err;
                const errorMessage = (err.message || '').toLowerCase();
                const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || (err as any).status === 429;

                if (isQuotaError) {
                    console.warn(`[AI/${source}] Key index ${keyIndex} for model ${model} failed with quota error. Trying next key...`);
                    apiKeyManager.reportFailure(keyIndex);
                    continue; // Continue to the next API key
                } else {
                    console.error(`[AI/${source}] A non-retryable error occurred with model ${model} and key index ${keyIndex}. Failing fast for this model.`, err);
                    break; // Break from the key loop and try the next model
                }
            }
        }
        console.log(`[AI/${source}] All available keys for model ${model} failed. Reporting model as unavailable.`);
        modelAvailabilityService.reportFailure(model);
    }

    console.error(`[AI/${source}] Flow failed with all models and keys:`, lastError);
  
    const finalErrorMessage = (lastError.message || '').toLowerCase();
    const isQuotaFailure = finalErrorMessage.includes('quota') || finalErrorMessage.includes('billing') || finalErrorMessage.includes('resource has been exhausted');
    if (isQuotaFailure) {
        throw new Error('AI features unavailable. All configured Gemini API keys have exceeded their free tier quota.');
    }

    if (finalErrorMessage.includes('safety') || finalErrorMessage.includes('recitation')) {
        throw new Error('AI generation was blocked by content filters.');
    }

    throw new Error(`AI generation failed for ${source}. Please check server logs for details.`);
}
