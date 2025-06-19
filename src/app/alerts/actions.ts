
'use server';

import { z } from 'zod';
import type { AlertPreferences } from '@/lib/types';
import { sendEmail } from '@/services/emailService';

const AlertPreferencesSchema = z.object({
  alertsEnabled: z.preprocess(value => value === 'on' || value === true, z.boolean().default(true)),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  city: z.string().min(1, { message: "City name cannot be empty." }).optional().or(z.literal('')),
  notifyExtremeTemp: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyHeavyRain: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyStrongWind: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
});

interface SaveAlertsFormState {
  message: string | null;
  error: boolean;
  fieldErrors?: Partial<Record<keyof AlertPreferences, string[] | undefined>>;
  alertsCleared?: boolean; // Flag to indicate client-side localStorage should be cleared
}

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const rawData = {
    alertsEnabled: formData.get('alertsEnabled'),
    email: formData.get('email'),
    city: formData.get('city'),
    notifyExtremeTemp: formData.get('notifyExtremeTemp'),
    notifyHeavyRain: formData.get('notifyHeavyRain'),
    notifyStrongWind: formData.get('notifyStrongWind'),
  };

  const validationResult = AlertPreferencesSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Partial<Record<keyof AlertPreferences, string[] | undefined>>;
    return {
      message: "Please correct the errors in the form.",
      error: true,
      fieldErrors: fieldErrors,
    };
  }

  const preferences = validationResult.data;

  // If alerts are disabled or email is empty, treat as disabling alerts
  if (!preferences.alertsEnabled || !preferences.email) {
    console.log("Disabling alert preferences due to alertsEnabled=false or empty email.");
    // In a real app, you would remove/disable these preferences in a database.
    return {
      message: "Weather alerts have been disabled.",
      error: false,
      alertsCleared: true, // Signal to client to clear localStorage
    };
  }
  
  // City is required if alerts are enabled and email is provided
  if (!preferences.city) {
    return {
        message: "Please correct the errors in the form.",
        error: true,
        fieldErrors: { city: ["City name is required to enable alerts."] },
    };
  }


  try {
    // In a real application, you would save these preferences to a database.
    console.log("Saving alert preferences:", preferences);
    
    // Simulate async operation if any DB interaction were here.
    // await new Promise(resolve => setTimeout(resolve, 300)); 

    const emailSubject = `Weather Alert Preferences Updated for ${preferences.city}`;
    const emailHtml = `
      <h1>Weather Alert Preferences Confirmed</h1>
      <p>Hello,</p>
      <p>Your weather alert preferences for <strong>${preferences.city}</strong> have been successfully updated with Weatherwise.</p>
      <p>You are set to receive alerts for:</p>
      <ul>
        ${preferences.notifyExtremeTemp ? '<li>Extreme Temperatures</li>' : ''}
        ${preferences.notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
        ${preferences.notifyStrongWind ? '<li>Strong Winds</li>' : ''}
      </ul>
      ${!(preferences.notifyExtremeTemp || preferences.notifyHeavyRain || preferences.notifyStrongWind) ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : ''}
      <p>If you wish to disable these alerts, you can update your preferences on the Weatherwise app.</p>
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
      };
    } else {
      // Refined error message construction
      let finalMessage = `Alert preferences saved for ${preferences.city}, but we couldn't send a confirmation email.`;
      if (emailResult.error) {
        // The error from emailService for missing .env vars is specific enough.
        finalMessage += ` Reason: ${emailResult.error}`;
      } else {
        finalMessage += ` An unknown error occurred during email sending.`;
      }
      // Only add generic "Please check your email configuration" if the specific error doesn't already guide the user.
      if (emailResult.error && !emailResult.error.toLowerCase().includes('email server not configured') && !emailResult.error.toLowerCase().includes('.env file')) {
        finalMessage += ' Please check your email server configuration.';
      }
      return {
        message: finalMessage,
        error: true, 
      };
    }

  } catch (e) {
    console.error("Error saving alert preferences or sending email:", e);
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
    return {
      message: `Failed to save alert preferences: ${errorMessage}`,
      error: true,
    };
  }
}
