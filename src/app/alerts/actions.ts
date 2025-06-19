
'use server';

import { z } from 'zod';
import type { AlertPreferences } from '@/lib/types';
import { sendEmail } from '@/services/emailService';
import { generateVerificationCode } from '@/lib/utils';

const AlertPreferencesSchema = z.object({
  alertsEnabled: z.preprocess(value => value === 'on' || value === true, z.boolean().default(true)),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  city: z.string().min(1, { message: "City name cannot be empty." }).optional().or(z.literal('')),
  notifyExtremeTemp: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyHeavyRain: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyStrongWind: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
});

// Used for managing state between form submissions for verification flow
export interface SaveAlertsFormState {
  message: string | null;
  error: boolean;
  fieldErrors?: Partial<Record<keyof AlertPreferences | 'verificationCode', string[] | undefined>>;
  alertsCleared?: boolean;
  verificationSentTo?: string | null; // Email to which verification code was sent
  generatedCode?: string | null; // The code sent (for prototype, pass back to client)
  needsVerification?: boolean;
  emailVerified?: boolean;
}

export async function saveAlertPreferencesAction(
  // We don't use prevState directly for verification flow, but keep signature for useActionState
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
  const isAlreadyVerifiedClientHint = formData.get('isAlreadyVerified') === 'true'; // Client hints if it thinks email is verified

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

  if (!preferences.alertsEnabled || !preferences.email) {
    console.log("Disabling alert preferences due to alertsEnabled=false or empty email.");
    return {
      message: "Weather alerts have been disabled.",
      error: false,
      alertsCleared: true,
    };
  }
  
  if (!preferences.city) {
    return {
        message: "Please correct the errors in the form.",
        error: true,
        fieldErrors: { city: ["City name is required to enable alerts."] },
    };
  }

  // If client thinks email is verified, proceed to save and send confirmation.
  // In a real app, server would re-verify this status from DB.
  if (isAlreadyVerifiedClientHint) {
    try {
      console.log("Saving alert preferences for already verified email:", preferences);
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
          emailVerified: true, // Confirming it's treated as verified
        };
      } else {
        let finalMessage = `Alert preferences saved for ${preferences.city}, but we couldn't send a confirmation email.`;
        if (emailResult.error && emailResult.error.includes('GOOGLE_SMTP_USER') && emailResult.error.includes('GOOGLE_SMTP_PASSWORD')) {
            finalMessage += ` Reason: ${emailResult.error}`;
        } else if (emailResult.error) {
            finalMessage += ` Reason: ${emailResult.error}`;
        } else {
            finalMessage += ` An unknown error occurred during email sending.`;
        }
        return { message: finalMessage, error: true, emailVerified: true };
      }
    } catch (e) {
      console.error("Error saving alert preferences or sending email:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      return { message: `Failed to save alert preferences: ${errorMessage}`, error: true };
    }
  } else {
    // Email is not yet verified by client's perspective; send verification code
    const verificationCode = generateVerificationCode();
    const emailSubject = "Verify Your Email for Weatherwise Alerts";
    const emailHtml = `
      <h1>Weatherwise Email Verification</h1>
      <p>Hello,</p>
      <p>Thank you for setting up weather alerts with Weatherwise for the city: <strong>${preferences.city}</strong>.</p>
      <p>Your verification code is: <strong>${verificationCode}</strong></p>
      <p>Please enter this code on the Weatherwise alerts page to activate your notifications.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you for using Weatherwise!</p>
    `;

    try {
      const emailResult = await sendEmail({
        to: preferences.email,
        subject: emailSubject,
        html: emailHtml,
      });

      if (emailResult.success) {
        return {
          message: `A verification code has been sent to ${preferences.email}. Please enter it below.`,
          error: false,
          verificationSentTo: preferences.email,
          generatedCode: verificationCode, // For prototype: sending code back to client. In Prod: store server-side.
          needsVerification: true,
        };
      } else {
        let finalMessage = `We couldn't send a verification email to ${preferences.email}.`;
         if (emailResult.error && emailResult.error.includes('GOOGLE_SMTP_USER') && emailResult.error.includes('GOOGLE_SMTP_PASSWORD')) {
            finalMessage += ` Reason: ${emailResult.error}`;
        } else if (emailResult.error) {
            finalMessage += ` Reason: ${emailResult.error}`;
        } else {
            finalMessage += ` An unknown error occurred during email sending.`;
        }
        return { message: finalMessage, error: true };
      }
    } catch (e) {
      console.error("Error sending verification email:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      return { message: `Failed to send verification email: ${errorMessage}`, error: true };
    }
  }
}


const VerifyCodeSchema = z.object({
  email: z.string().email(),
  verificationCode: z.string().length(6, { message: "Verification code must be 6 digits." }),
  expectedCode: z.string().length(6), // The code that was actually sent
});

export async function verifyCodeAction(
  prevState: SaveAlertsFormState, // Re-using state type for consistency
  formData: FormData
): Promise<SaveAlertsFormState> {
  const rawData = {
    email: formData.get('email'), // Email being verified
    verificationCode: formData.get('verificationCode'), // Code entered by user
    expectedCode: formData.get('expectedCode') // Code originally generated and sent
  };

  const validationResult = VerifyCodeSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Partial<Record<'email' | 'verificationCode' | 'expectedCode', string[] | undefined>>;
    return {
      message: "Invalid verification data.",
      error: true,
      fieldErrors: fieldErrors, // This will include errors for verificationCode too
      verificationSentTo: rawData.email as string | null,
      generatedCode: rawData.expectedCode as string | null,
      needsVerification: true, // Still needs verification
    };
  }

  const { email, verificationCode, expectedCode } = validationResult.data;

  if (verificationCode === expectedCode) {
    // In a real app, mark email as verified in DB.
    // For prototype, client will handle storing this email as verified in localStorage.
    // Now, implicitly, the preferences related to this email can be considered active.
    // We can re-trigger a "save" or rely on client to re-submit original preferences.
    // For simplicity, just confirm verification. Client will then know to save with 'isAlreadyVerifiedClientHint'.
    
    // Send a final confirmation email that alerts are active (optional, but good UX)
    const city = formData.get('city') as string; // Get city from original form data passed through
    const notifyExtremeTemp = formData.get('notifyExtremeTemp') === 'on';
    const notifyHeavyRain = formData.get('notifyHeavyRain') === 'on';
    const notifyStrongWind = formData.get('notifyStrongWind') === 'on';


    const emailSubject = `Email Verified - Weather Alerts Active for ${city}`;
    const emailHtml = `
      <h1>Email Verified & Alerts Active!</h1>
      <p>Hello,</p>
      <p>Your email <strong>${email}</strong> has been successfully verified for Weatherwise alerts for the city: <strong>${city}</strong>.</p>
      <p>Your alert preferences are now active. You are set to receive alerts for:</p>
      <ul>
        ${notifyExtremeTemp ? '<li>Extreme Temperatures</li>' : ''}
        ${notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
        ${notifyStrongWind ? '<li>Strong Winds</li>' : ''}
      </ul>
      ${!(notifyExtremeTemp || notifyHeavyRain || notifyStrongWind) ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : ''}
      <p>Thank you for using Weatherwise!</p>
    `;
    try {
        await sendEmail({to: email, subject: emailSubject, html: emailHtml});
    } catch (e) {
        console.error("Failed to send post-verification confirmation email:", e);
        // Non-critical, proceed with verification success
    }


    return {
      message: `Email ${email} verified successfully! Alerts are now active for the configured city.`,
      error: false,
      emailVerified: true,
      verificationSentTo: null, // Clear these as verification is done
      generatedCode: null,
      needsVerification: false,
    };
  } else {
    return {
      message: "Invalid verification code. Please try again.",
      error: true,
      fieldErrors: { verificationCode: ["Incorrect code."] },
      verificationSentTo: email,
      generatedCode: expectedCode, // Keep passing the expected code for retries
      needsVerification: true,
    };
  }
}
