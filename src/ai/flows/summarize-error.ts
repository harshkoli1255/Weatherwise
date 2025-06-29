'use server';

/**
 * @fileOverview An AI flow to convert technical error messages into user-friendly explanations.
 *
 * - summarizeError - The primary exported function.
 * - SummarizeErrorInput - The Zod schema for the input.
 * - SummarizeErrorOutput - The Zod schema for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateWithFallback } from '@/services/aiGenerationService';

export const SummarizeErrorInputSchema = z.object({
  errorMessage: z.string().describe('The technical error message caught by the application.'),
});
export type SummarizeErrorInput = z.infer<typeof SummarizeErrorInputSchema>;

export const SummarizeErrorOutputSchema = z.object({
  userFriendlyMessage: z.string().describe('A polite, easy-to-understand message for the user that explains the issue without technical jargon.'),
});
export type SummarizeErrorOutput = z.infer<typeof SummarizeErrorOutputSchema>;

const summarizeErrorPromptTemplate = `You are a helpful UX writer for a modern weather application called Weatherwise. Your task is to convert a technical, internal error message into a user-friendly, polite, and helpful message for a toast notification.

The user should understand that something went wrong, but should not be alarmed or confused by technical details.

Rules:
1.  **Do Not Expose Technical Details:** Never include stack traces, API key errors, or server-side jargon.
2.  **Be Reassuring:** Let the user know it's a temporary issue if possible.
3.  **Be Concise:** The message is for a small toast notification. Keep it brief.
4.  **Suggest an Action:** If applicable, suggest a simple action like "Please try again in a moment." or "Please check your connection."
5.  **Special Cases:**
    - If the error mentions "quota", "billing", or "API key", the user-friendly message should be something like: "Our AI service is currently experiencing high demand. Please try again in a few minutes."
    - If the error mentions "404", "not found", or "geocoding", the message should be: "We couldn't find that location. Please check the spelling and try again."
    - If the error mentions "network", "failed to fetch", or "connection", suggest: "Could not connect to our services. Please check your internet connection."

Technical Error Message:
"{{errorMessage}}"

Your response MUST be a valid JSON object matching the requested schema. Do not add any other text or markdown formatting.`;


export async function summarizeError(input: SummarizeErrorInput): Promise<SummarizeErrorOutput> {
    // If the error is simple, we can bypass the AI call.
    if (!input.errorMessage) {
        return { userFriendlyMessage: 'An unknown error occurred. Please try again.' };
    }
    
    // Simple, common errors that don't need AI.
    if (input.errorMessage.toLowerCase().includes('user not authenticated')) {
        return { userFriendlyMessage: 'You need to be signed in to do that. Please sign in and try again.' };
    }


  try {
    const result = await generateWithFallback({
      prompt: summarizeErrorPromptTemplate,
      input: input,
      output: {
          schema: SummarizeErrorOutputSchema
      },
      temperature: 0.2,
      source: 'summarize-error',
    });
    return result;
  } catch (err) {
    console.error(`[AI] Error summarization flow failed, returning a generic message. Error:`, err);
    // Failsafe: return a generic message if the AI itself fails.
    return { userFriendlyMessage: 'An unexpected error occurred. Please refresh the page and try again.' };
  }
}
