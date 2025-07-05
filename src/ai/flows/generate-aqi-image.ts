
'use server';
/**
 * @fileOverview An AI flow to generate a visual representation of the air quality in a city.
 *
 * - generateAqiImage - The primary exported function.
 */
import { ai } from '@/ai/genkit';
import { type AqiImageInput, AqiImageInputSchema, type AqiImageOutput, AqiImageOutputSchema } from '@/lib/types';

// This is similar to the weather image flow, so I'll reuse the key rotation logic.
const keyFailureTimestamps = new Map<string, number>();
const KEY_FAILURE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const generateAqiImageFlow = ai.defineFlow(
  {
    name: 'generateAqiImageFlow',
    inputSchema: AqiImageInputSchema,
    outputSchema: AqiImageOutputSchema,
  },
  async (input) => {
    const imagePrompt = `Create a single, visually compelling, artistic image that conveys the feeling of the air quality in a city, taking into account the current weather.
- Scene: The city of ${input.city}.
- Atmosphere: The air quality is currently rated as '${input.aqiLevel}'.
- Current Weather: The weather is '${input.condition}'.

Instructions for the AI:
- Combine the mood of the air quality with the current weather. For example, 'Poor' air quality on a 'sunny' day might look like a hazy, bright sky with muted colors. 'Moderate' air quality during 'rain' might be a moody, atmospheric city street with reflections on wet pavement.
- Evoke the atmosphere. For 'Poor' or 'Very Poor', this might mean a hazy, subdued, or somewhat obscured cityscape.
- Do NOT show people wearing masks or anything overly dystopian. The style should be artistic and evocative, not a literal public health announcement.
- The style should be a vibrant and artistic digital illustration or a moody, atmospheric digital painting. Make it aesthetically pleasing and premium, even if the subject is haze.`;

    console.log(`[AI/Image/AQI] Generating image with prompt: "${imagePrompt}"`);
    
    const allApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (allApiKeys.length === 0) {
        console.error("[AI/Image/AQI] No Gemini API keys are configured. Cannot generate image.");
        return { imageUrl: '' };
    }

    let lastError: any = new Error('All Gemini API keys failed for AQI image generation.');

    const now = Date.now();
    const availableKeys = allApiKeys.filter(key => {
        const failureTime = keyFailureTimestamps.get(key);
        if (!failureTime) return true;
        const isExpired = (now - failureTime > KEY_FAILURE_TTL_MS);
        if (isExpired) {
            keyFailureTimestamps.delete(key);
        }
        return isExpired;
    });

    if (availableKeys.length === 0) {
        console.warn(`[AI/Image/AQI] All API keys are temporarily unavailable due to recent failures.`);
        return { imageUrl: '' };
    }

    for (const apiKey of availableKeys) {
        try {
            console.log(`[AI/Image/AQI] Attempting image generation with a key.`);
            const { media } = await ai.generate({
              model: 'googleai/gemini-2.0-flash-preview-image-generation',
              prompt: imagePrompt,
              config: {
                responseModalities: ['TEXT', 'IMAGE'],
                apiKey,
              },
            });
            
            if (!media?.url) {
                lastError = new Error("Generation returned no media object.");
                console.warn(`[AI/Image/AQI] Generation returned no media object.`);
                continue;
            }
            
            console.log(`[AI/Image/AQI] Successfully generated image.`);
            return { imageUrl: media.url };

        } catch(err) {
            lastError = err;
            const errorMessage = (err.message || '').toLowerCase();
            const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429');
            const isInvalidKeyError = errorMessage.includes('api key not valid');

            if (isQuotaError || isInvalidKeyError) {
                console.warn(`[AI/Image/AQI] Key failed with ${isQuotaError ? 'quota' : 'invalid key'} error. Trying next key...`);
                keyFailureTimestamps.set(apiKey, Date.now());
                continue;
            } else {
                console.error(`[AI/Image/AQI] A non-key-related error occurred.`, err);
                break;
            }
        }
    }

    console.error(`[AI/Image/AQI] Image generation flow failed with all keys. Last error:`, lastError);
    return { imageUrl: '' };
  }
);


export async function generateAqiImage(input: AqiImageInput): Promise<AqiImageOutput> {
  try {
    return await generateAqiImageFlow(input);
  } catch (error) {
    console.error("Error executing generateAqiImageFlow:", error);
    return { imageUrl: '' };
  }
}
