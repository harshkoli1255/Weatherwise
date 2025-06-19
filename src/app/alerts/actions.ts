
'use server';

import { z } from 'zod';
import type { AlertPreferences } from '@/lib/types';

const AlertPreferencesSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  city: z.string().min(1, { message: "City name cannot be empty." }),
  notifyExtremeTemp: z.preprocess(value => value === 'on', z.boolean().default(false)),
  notifyHeavyRain: z.preprocess(value => value === 'on', z.boolean().default(false)),
  notifyStrongWind: z.preprocess(value => value === 'on', z.boolean().default(false)),
});

interface SaveAlertsFormState {
  message: string | null;
  error: boolean;
  fieldErrors?: Record<keyof AlertPreferences, string[] | undefined>;
}

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const rawData = {
    email: formData.get('email'),
    city: formData.get('city'),
    notifyExtremeTemp: formData.get('notifyExtremeTemp'),
    notifyHeavyRain: formData.get('notifyHeavyRain'),
    notifyStrongWind: formData.get('notifyStrongWind'),
  };

  const validationResult = AlertPreferencesSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Record<keyof AlertPreferences, string[] | undefined>;
    return {
      message: "Please correct the errors in the form.",
      error: true,
      fieldErrors: fieldErrors,
    };
  }

  const preferences: AlertPreferences = validationResult.data;

  try {
    // In a real application, you would save these preferences to a database.
    // For this prototype, we'll just log them.
    console.log("Saving alert preferences:", preferences);
    
    // Simulate a save operation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      message: "Alert preferences saved successfully! (Email sending is a backend feature and not implemented in this prototype.)",
      error: false,
      fieldErrors: {},
    };
  } catch (e) {
    console.error("Error saving alert preferences:", e);
    return {
      message: "Failed to save alert preferences. Please try again.",
      error: true,
      fieldErrors: {},
    };
  }
}
