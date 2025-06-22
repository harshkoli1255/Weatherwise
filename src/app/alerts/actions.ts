
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/services/emailService';

export type SaveAlertsFormState = {
  message: string | null;
  error: boolean;
};

const AlertPreferencesSchema = z.object({
  city: z.string().min(1, 'City is required for alerts.'),
  alertsEnabled: z.preprocess((val) => val === 'on', z.boolean()),
  notifyExtremeTemp: z.preprocess((val) => val === 'on', z.boolean()),
  highTempThreshold: z.coerce.number().optional(),
  lowTempThreshold: z.coerce.number().optional(),
  notifyHeavyRain: z.preprocess((val) => val === 'on', z.boolean()),
  notifyStrongWind: z.preprocess((val) => val === 'on', z.boolean()),
  windSpeedThreshold: z.coerce.number().optional(),
});

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to save preferences.', error: true };
  }

  const validatedFields = AlertPreferencesSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return {
      message: firstError || 'Invalid data provided. Please check the form and try again.',
      error: true,
    };
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!email) {
      return { message: 'Could not find your email address. Please ensure you have a primary email set on your account.', error: true };
    }

    const newPreferences: AlertPreferences = {
      ...validatedFields.data,
      email,
    };

    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        alertPreferences: newPreferences,
      },
    });
    
    revalidatePath('/alerts');
    return { message: 'Your alert preferences have been saved successfully!', error: false };
  } catch (error) {
    console.error('Failed to save alert preferences:', error);
    return { message: 'An unexpected error occurred while saving your preferences. Please try again later.', error: true };
  }
}


export async function sendTestEmailAction(
  prevState: { message: string | null; error: boolean },
  formData: FormData
): Promise<{ message: string | null; error: boolean }> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to send a test email.', error: true };
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const emailAddress = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!emailAddress) {
      return { message: 'Primary email address not found on your profile.', error: true };
    }

    const subject = 'Weatherwise: Test Email';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const alertsUrl = new URL('/alerts', baseUrl).toString();

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #0056b3;">Hello from Weatherwise!</h2>
          <p>This is a test email to confirm your alert settings are working correctly.</p>
          <p>If you received this, it means Weatherwise can successfully send emails to <strong>${emailAddress}</strong>.</p>
          <p>You can now save your alert preferences and be notified about important weather conditions.</p>
          <br/>
          <a href="${alertsUrl}" style="background-color: #007bff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Your Alert Settings
          </a>
          <br/><br/>
          <hr style="border: none; border-top: 1px solid #eee;"/>
          <p style="font-size: 0.8em; color: #666;">
            To stop receiving weather alerts, you can disable them at any time in your Weatherwise account settings.
            This is a one-time test email and you will not be subscribed to any list.
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
    });

    if (result.success) {
      return { message: `Test email sent successfully to ${emailAddress}! Please check your inbox.`, error: false };
    } else {
      return { message: `Failed to send test email: ${result.error}`, error: true };
    }
  } catch (error: any) {
    console.error('Failed to send test email action:', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    return { message: `Failed to send test email. ${errorMessage}`, error: true };
  }
}
