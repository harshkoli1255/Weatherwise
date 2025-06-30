
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

Rules:
1.  **Keep it Simple:** Avoid technical jargon. The user should understand the information at a glance.
2.  **Be Reassuring:** Even for poor air quality, maintain a calm and helpful tone.
3.  **Summary Field:** This field must contain *only* a single, short sentence explaining the current air quality (e.g., "The air quality is excellent right now."). Do not include recommendations here.
4.  **Recommendation Field:** This field must contain *only* a single, short, actionable health recommendation (e.g., "It's a perfect day for outdoor activities!"). Do not repeat the summary here.

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
  - Summary: "The air quality is excellent right now."
  - Recommendation: "It's a perfect day for outdoor activities!"
- If AQI is 3 (Moderate):
  - Summary: "The air contains a moderate level of pollutants."
  - Recommendation: "Sensitive groups should consider reducing strenuous outdoor activities."
- If AQI is 5 (Very Poor):
  - Summary: "The air quality is currently very poor."
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
