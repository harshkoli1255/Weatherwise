
'use server';
/**
 * @fileOverview An AI flow to generate a visual representation of the weather and a suggested activity.
 *
 * - generateWeatherImage - The primary exported function.
 * - WeatherImageInput - The Zod schema for the input.
 * - WeatherImageOutput - The Zod schema for the output.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';

const WeatherImageInputSchema = z.object({
  condition: z.string().describe('The current weather condition, e.g., "sunny", "light rain".'),
  activitySuggestion: z.string().describe('The AI-generated activity suggestion, e.g., "a great day for a picnic".'),
  city: z.string().describe('The name of the city.'),
});
export type WeatherImageInput = z.infer<typeof WeatherImageInputSchema>;

const WeatherImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI, or an empty string if generation fails.'),
});
export type WeatherImageOutput = z.infer<typeof WeatherImageOutputSchema>;

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

    const imagePrompt = `A beautiful, photorealistic image representing this scene: In ${input.city}, the weather is ${input.condition}. It's a perfect moment to ${sanitizedActivity}. Capture the mood and environment accurately.`;

    console.log(`[AI/Image] Generating image with prompt: "${imagePrompt}"`);
    
    try {
        const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-preview-image-generation',
          prompt: imagePrompt,
          config: {
            // Per documentation, both TEXT and IMAGE are required for this model.
            responseModalities: ['TEXT', 'IMAGE'],
          },
        });
        
        if (!media?.url) {
            console.warn(`[AI/Image] Generation returned no media object for prompt: "${imagePrompt}"`);
            return { imageUrl: '' };
        }

        return { imageUrl: media.url };
    } catch(err) {
        console.error(`[AI/Image] Image generation flow failed for city ${input.city}.`, err);
        // Return an empty URL on failure so the UI can handle it gracefully.
        return { imageUrl: '' };
    }
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
