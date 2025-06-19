
'use server';

import { z } from 'zod';
import type { AlertPreferences } from '@/lib/types';
import { sendEmail } from '@/services/emailService';

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
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay

    // Send a confirmation email
    const emailSubject = `Weather Alert Preferences Saved for ${preferences.city}`;
    const emailHtml = `
      <h1>Weather Alert Preferences Confirmed</h1>
      <p>Hello,</p>
      <p>Your weather alert preferences for <strong>${preferences.city}</strong> have been successfully saved with Weatherwise.</p>
      <p>You have opted to be notified for:</p>
      <ul>
        ${preferences.notifyExtremeTemp ? '<li>Extreme Temperatures</li>' : ''}
        ${preferences.notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
        ${preferences.notifyStrongWind ? '<li>Strong Winds</li>' : ''}
      </ul>
      ${!(preferences.notifyExtremeTemp || preferences.notifyHeavyRain || preferences.notifyStrongWind) ? '<p>You have not selected any specific conditions for notifications.</p>' : ''}
      <p>Thank you for using Weatherwise!</p>
      <p><small>Note: This is a confirmation email. Actual weather alert emails will be sent if your configured conditions are met. Ongoing weather monitoring and alerting is a backend feature and may not be fully implemented in this prototype.</small></p>
    `;

    const emailResult = await sendEmail({
      to: preferences.email,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailResult.success) {
      return {
        message: `Alert preferences saved for ${preferences.city}! A confirmation email has been sent to ${preferences.email}.`,
        error: false,
        fieldErrors: {},
      };
    } else {
      // Email sending failed, but preferences were "saved" (logged)
      return {
        message: `Alert preferences saved for ${preferences.city}, but we couldn't send a confirmation email: ${emailResult.error}. Please check your email configuration.`,
        error: true, // Consider this a partial success, but flag an error for email
        fieldErrors: {},
      };
    }

  } catch (e) {
    console.error("Error saving alert preferences or sending email:", e);
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
    return {
      message: `Failed to save alert preferences: ${errorMessage}`,
      error: true,
      fieldErrors: {},
    };
  }
}
