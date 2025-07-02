
'use server';

/**
 * @fileOverview An AI flow to interpret air quality data and provide a user-friendly summary and health recommendation.
 *
 * - summarizeAirQuality - The primary exported function.
 * - SummarizeAirQualityInput - Zod schema for input.
 * - SummarizeAirQualityOutput - Zod schema for output.
 */

import { generateWithFallback } from '@/services/aiGenerationService';
import {
  type SummarizeAirQualityInput,
  SummarizeAirQualityInputSchema,
  type SummarizeAirQualityOutput,
  SummarizeAirQualityOutputSchema,
} from '@/lib/types';


const summarizeAirQualityPromptTemplate = `You are a helpful and reassuring health & environment advisor for a weather app. Your task is to interpret the provided Air Quality Index (AQI) data and convert it into a simple, easy-to-understand summary and an actionable health recommendation.

**Important Context for the AI:** The app uses a simplified AQI scale from 1 to 5, where 1 is 'Good' and 5 is 'Very Poor'. This is different from the 0-500 scale some users might see on other services. Your summary MUST clarify this to prevent confusion.

Rules:
1.  **Explain the Scale:** Your summary must start by clearly explaining the scale. Example: "The air quality is rated 3 out of 5 ('Fair')."
2.  **Keep it Simple:** Avoid technical jargon. The user should understand the information at a glance.
3.  **Be Reassuring:** Even for poor air quality, maintain a calm and helpful tone.
4.  **Summary Field:** This field must contain *only* a single, short sentence explaining the current air quality, including the 1-5 rating (e.g., "The air quality is rated 1 out of 5, which is considered 'Good'.") Do not include recommendations here.
5.  **Recommendation Field:** This field must contain *only* a single, short, actionable health recommendation (e.g., "It's a perfect day for outdoor activities!"). Do not repeat the summary here.

Here is the data:
- AQI Index: {{aqi}} (A scale from 1 to 5, where 1 is 'Good' and 5 is 'Very Poor')
- AQI Level: "{{level}}"
- Dominant Pollutants (in µg/m³):
  - PM2.5 (Fine Particulates): {{components.pm2_5}}
  - O3 (Ozone): {{components.o3}}
  - NO2 (Nitrogen Dioxide): {{components.no2}}
  - CO (Carbon Monoxide): {{components.co}}

Examples:
- If AQI is 1 (Good):
  - Summary: "The air quality is currently rated 1 out of 5, which is considered 'Good'."
  - Recommendation: "It's a perfect day for outdoor activities!"
- If AQI is 3 (Fair):
  - Summary: "The air quality is rated 3 out of 5 ('Fair'), indicating some pollutants are present."
  - Recommendation: "Sensitive groups may want to consider reducing strenuous outdoor activities."
- If AQI is 5 (Very Poor):
  - Summary: "The air quality is currently rated 5 out of 5 ('Very Poor')."
  - Recommendation: "It's advisable to limit time outdoors, especially for sensitive individuals."

Your response MUST be a valid JSON object matching the requested schema. Do not add any other text or markdown formatting.`;

export async function summarizeAirQuality(input: SummarizeAirQualityInput): Promise<SummarizeAirQualityOutput> {
  try {
    const result = await generateWithFallback({
      prompt: summarizeAirQualityPromptTemplate,
      input,
      output: {
          schema: SummarizeAirQualityOutputSchema
      },
      temperature: 0.3,
      source: 'summarize-air-quality',
    });
    return result;
  } catch (err) {
    console.error(`[AI] Air quality summarization failed, returning failsafe message. Error:`, err);
    return { 
        summary: "Could not retrieve AI-powered air quality summary.", 
        recommendation: "Please refer to local health advisories for guidance." 
    };
  }
}
