
'use server';
/**
 * @fileOverview An AI flow to generate a visual representation of the weather and a suggested activity.
 *
 * - generateWeatherImage - The primary exported function.
 */
import { ai } from '@/ai/genkit';
import {
  type WeatherImageInput,
  WeatherImageInputSchema,
  type WeatherImageOutput,
  WeatherImageOutputSchema,
} from '@/lib/types';

// A simple in-memory cache for failing API keys for image generation.
const keyFailureTimestamps = new Map<string, number>();
const KEY_FAILURE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const generateWeatherImageFlow = ai.defineFlow(
  {
    name: 'generateWeatherImageFlow',
    inputSchema: WeatherImageInputSchema,
    outputSchema: WeatherImageOutputSchema,
  },
  async (input) => {
    // Sanitize the activity suggestion to get the core activity.
    // Example: "A great opportunity to visit a <strong>local museum</strong> or cozy up with a movie marathon at home." -> "visit a local museum"
    const sanitizedActivity = input.activitySuggestion.replace(/<[^>]*>/g, '').split(/ or |,/)[0].trim();

    // New, more artistic and descriptive prompt for better image quality.
    const imagePrompt = `Create a single, visually compelling, artistic image that tells a story.
- Scene: The city of ${input.city}.
- Weather: The current weather is ${input.condition}.
- Activity: This weather inspired a suggestion to '${sanitizedActivity}'.

Instructions for the AI:
- Combine the atmosphere of the city, the mood of the weather, and the essence of the activity into one beautiful picture.
- For indoor activities, you could show a view from a window looking out at the weather, or creatively hint at the weather's influence on the indoor scene (e.g., people reading in a cozy cafe as rain streams down the window).
- The style should be a vibrant and artistic digital illustration, not a plain photograph. Make it pop with color and light, even if the weather is gloomy.
- Focus on creating an aesthetically pleasing and evocative image that feels premium and well-crafted.`;

    console.log(`[AI/Image] Generating image with prompt: "${imagePrompt}"`);
    
    const allApiKeys = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (allApiKeys.length === 0) {
        console.error("[AI/Image] No Gemini API keys are configured. Cannot generate image.");
        return { imageUrl: '' };
    }

    let lastError: any = new Error('All Gemini API keys failed for image generation.');

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
        console.warn(`[AI/Image] All API keys are temporarily unavailable due to recent failures.`);
        return { imageUrl: '' };
    }

    for (const apiKey of availableKeys) {
        try {
            console.log(`[AI/Image] Attempting image generation with a key.`);
            const { media } = await ai.generate({
              model: 'googleai/gemini-2.0-flash-preview-image-generation',
              prompt: imagePrompt,
              config: {
                // Per documentation, both TEXT and IMAGE are required for this model.
                responseModalities: ['TEXT', 'IMAGE'],
                apiKey,
              },
            });
            
            if (!media?.url) {
                lastError = new Error("Generation returned no media object.");
                console.warn(`[AI/Image] Generation returned no media object.`);
                continue;
            }
            
            console.log(`[AI/Image] Successfully generated image.`);
            return { imageUrl: media.url };

        } catch(err) {
            lastError = err;
            const errorMessage = (err.message || '').toLowerCase();
            const isQuotaError = errorMessage.includes('quota') || errorMessage.includes('429');
            const isInvalidKeyError = errorMessage.includes('api key not valid');

            if (isQuotaError || isInvalidKeyError) {
                console.warn(`[AI/Image] Key failed with ${isQuotaError ? 'quota' : 'invalid key'} error. Trying next key...`);
                keyFailureTimestamps.set(apiKey, Date.now());
                continue; // Try next available key
            } else {
                console.error(`[AI/Image] A non-key-related error occurred.`, err);
                // Don't try other keys if it's a content filter or other non-recoverable error
                break;
            }
        }
    }

    // If we get here, all keys failed.
    console.error(`[AI/Image] Image generation flow failed with all keys. Last error:`, lastError);
    return { imageUrl: '' };
  }
);


export async function generateWeatherImage(input: WeatherImageInput): Promise<WeatherImageOutput> {
  // Since image generation can fail for various reasons (e.g., safety filters),
  // we'll wrap this in a try-catch to ensure it doesn't crash the main weather fetch action.
  try {
    return await generateWeatherImageFlow(input);
  } catch (error) {
    console.error("Error executing generateWeatherImageFlow:", error);
    return { imageUrl: '' };
  }
}
