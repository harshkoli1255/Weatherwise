
'use server';

/**
 * @fileOverview A centralized service for making resilient calls to the Gemini API.
 * This service encapsulates the logic for model fallback, ensuring that
 * AI generation requests are robust and efficient. API key rotation is handled
 * natively by the configured Genkit googleAI plugin.
 */

import { ai } from '@/ai/genkit';
import { GenerateOptions } from 'genkit';
import { modelAvailabilityService } from '@/services/modelAvailabilityService';
import { z } from 'zod';

const PREFERRED_MODELS = [
    'googleai/gemini-1.5-pro-latest',
    'googleai/gemini-1.5-flash-latest',
];

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
 * Makes a call to the Gemini API using an intelligent model fallback strategy.
 * It iterates through preferred models, handling quota errors and other failures gracefully.
 *
 * @param params The generation parameters, including prompt, input, and output schema.
 * @returns A promise that resolves with the generated output.
 * @throws An error if all model and key combinations fail.
 */
export async function generateWithFallback<I extends z.ZodType, O extends z.ZodType>(
    params: GenerationParams<I, O>
): Promise<z.infer<O>> {
    const { prompt: promptTemplate, input, output, source, ...restOfConfig } = params;

    // Helper to replace {{...}} placeholders in the prompt template.
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
    console.log(`[AI/${source}] Models to attempt: ${modelsToTry.join(', ')}`);

    let lastError: any = new Error('All Gemini models and API keys failed.');

    for (const model of modelsToTry) {
        try {
            console.log(`[AI/${source}] Attempting with model: ${model}`);
            
            const { output: generatedOutput } = await ai.generate({
                model,
                prompt: finalPrompt,
                output: {
                    ...output,
                    format: 'json',
                },
                ...restOfConfig
            });
            
            if (!generatedOutput) {
                throw new Error(`AI generation for ${source} failed to produce a valid output.`);
            }
            
            console.log(`[AI/${source}] Successful with model ${model}.`);
            return generatedOutput;

        } catch (err: any) {
            lastError = err;
            const errorMessage = (err.message || '').toLowerCase();
            const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429') || (err as any).status === 429;

            if (isQuotaError) {
                console.warn(`[AI/${source}] Model ${model} failed with quota error. Trying next model...`);
                // Mark this model as unavailable for a while.
                modelAvailabilityService.reportFailure(model);
                // The underlying googleAI plugin will handle trying the next key automatically.
                // If all keys for this model fail, we'll hit this catch block, and then try the next model.
                continue; 
            } else {
                console.error(`[AI/${source}] A non-retryable error occurred with model ${model}.`, err);
                modelAvailabilityService.reportFailure(model);
                continue; // Still try the next model, as it might be a model-specific issue.
            }
        }
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
