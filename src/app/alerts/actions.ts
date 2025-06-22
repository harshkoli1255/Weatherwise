'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences, SaveAlertsFormState } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/services/emailService';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';
import { checkAndSendAlerts } from '@/services/alertProcessing';

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to save preferences.', error: true };
  }
  
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
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to send a test email.', error: true };
  }

  const schema = z.object({ city: z.string().min(1, 'No city provided for the test alert.') });
  const validation = schema.safeParse({ city: formData.get('city') });
  
  if (!validation.success) {
      return { message: "Please save a city in your preferences before sending a test alert.", error: true };
  }
  const city = validation.data.city;

  try {
    const user = await clerkClient.users.getUser(userId);
    const emailAddress = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!emailAddress) {
      return { message: 'Primary email address not found on your profile.', error: true };
    }

    // Fetch weather for the city
    const weatherResult = await fetchWeatherAndSummaryAction({ city });
    if (weatherResult.error || !weatherResult.data) {
        return { message: `Could not fetch weather for ${city}. Error: ${weatherResult.error}`, error: true };
    }
    const weatherData = weatherResult.data;

    const subject = `SAMPLE: ${weatherData.aiSubject}`;
    const html = generateWeatherAlertEmailHtml({ weatherData, isTest: true });

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
    });

    if (result.success) {
      return { message: `Sample weather alert for ${weatherData.city} sent successfully to ${emailAddress}!`, error: false };
    } else {
      return { message: `Failed to send sample email: ${result.error}`, error: true };
    }
  } catch (error: any) {
    console.error('Failed to send test email action:', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    return { message: `Failed to send sample email. ${errorMessage}`, error: true };
  }
}

export async function testAllAlertsAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to perform this test.', error: true };
  }

  console.log(`Manual hourly alert system test triggered by user: ${userId}`);

  try {
    const result = await checkAndSendAlerts();
    const successMessage = `Test finished. Processed ${result.processedUsers} users. Found ${result.eligibleUsers} with alerts enabled. Sent ${result.alertsSent} alerts. Errors: ${result.errors.length}.`;
    console.log(successMessage);
    
    if (result.errors.length > 0) {
        const fullMessage = `${successMessage} | Errors encountered: ${result.errors.join('; ')}`;
        return { message: fullMessage, error: true };
    }

    return { message: successMessage, error: false };
  } catch (error) {
    console.error("Manual hourly alert system test failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { message: `Test failed catastrophically: ${errorMessage}`, error: true };
  }
}
