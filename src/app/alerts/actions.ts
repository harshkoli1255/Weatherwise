'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences, SaveAlertsFormState } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to save preferences.', error: true };
  }
  
  const BaseAlertPreferencesSchema = z.object({
    city: z.string().optional(), // City is optional at the base level
    alertsEnabled: z.boolean(),
    notifyExtremeTemp: z.boolean(),
    highTempThreshold: z.coerce.number().optional(),
    lowTempThreshold: z.coerce.number().optional(),
    notifyHeavyRain: z.boolean(),
    notifyStrongWind: z.boolean(),
    windSpeedThreshold: z.coerce.number().optional(),
    schedule: z.object({
      enabled: z.boolean(),
      days: z.array(z.number().min(0).max(6)),
      startHour: z.coerce.number().min(0).max(23),
      endHour: z.coerce.number().min(0).max(23),
    }),
  });

  // Refine the schema to make `city` required only if `alertsEnabled` is true
  const AlertPreferencesSchema = BaseAlertPreferencesSchema.refine(
    (data) => {
      if (data.alertsEnabled && (!data.city || data.city.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'City is required when alerts are enabled.',
      path: ['city'], // specify the path of the error
    }
  );
  
  const scheduleDays = [0, 1, 2, 3, 4, 5, 6]
    .filter(day => formData.get(`scheduleDay${day}`) === 'on')
    .map(Number);
    
  const dataToValidate = {
    city: formData.get('city') as string,
    alertsEnabled: formData.get('alertsEnabled') === 'on',
    notifyExtremeTemp: formData.get('notifyExtremeTemp') === 'on',
    highTempThreshold: formData.get('highTempThreshold'),
    lowTempThreshold: formData.get('lowTempThreshold'),
    notifyHeavyRain: formData.get('notifyHeavyRain') === 'on',
    notifyStrongWind: formData.get('notifyStrongWind') === 'on',
    windSpeedThreshold: formData.get('windSpeedThreshold'),
    schedule: {
      enabled: formData.get('scheduleEnabled') === 'on',
      days: scheduleDays,
      startHour: formData.get('scheduleStartHour'),
      endHour: formData.get('scheduleEndHour'),
    },
  };

  const validatedFields = AlertPreferencesSchema.safeParse(dataToValidate);

  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    const path = validatedFields.error.errors[0]?.path.join('.');
    const message = path ? `Error in ${path}: ${firstError}` : firstError;
    
    return {
      message: message || 'Invalid data provided. Please check the form and try again.',
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
      city: validatedFields.data.city || '', // Ensure city is a string
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

export async function sendSampleAlertAction(): Promise<{ message: string; error: boolean; }> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to send a sample alert.', error: true };
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!email) {
      return { message: 'Could not find your email address.', error: true };
    }

    const prefsRaw = user.privateMetadata?.alertPreferences;
    const preferences = prefsRaw ? JSON.parse(JSON.stringify(prefsRaw)) as Partial<AlertPreferences> : {};
    
    const city = preferences.city;
    if (!city) {
      return { message: 'Please save a city in your preferences before sending a sample alert.', error: true };
    }

    const weatherResult = await fetchWeatherAndSummaryAction({ city });
    if (weatherResult.error || !weatherResult.data) {
        return { message: `Could not fetch weather for "${city}". Error: ${weatherResult.error || 'Unknown weather API error.'}`, error: true };
    }

    const weatherData = weatherResult.data;

    // Create sample triggers to demonstrate how they look in the email.
    const sampleTriggers = [
        `High temperature of <strong>${Math.round(weatherData.temperature + 5)}°C</strong> (your current setting: >${preferences.highTempThreshold || 30}°C)`,
        `Strong wind of <strong>${Math.round(weatherData.windSpeed + 15)} km/h</strong> (your current setting: >${preferences.windSpeedThreshold || 40} km/h)`,
        `<strong>Rain is forecasted</strong> based on current conditions (${weatherData.description}).`,
    ];

    const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers: sampleTriggers });
    const emailSubject = `[SAMPLE] ${weatherData.aiSubject}`;

    const emailResult = await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailResult.success) {
      return { message: `Sample alert has been sent to ${email}. Please check your inbox.`, error: false };
    } else {
      return { message: `Failed to send sample alert. Reason: ${emailResult.error || 'Unknown email service error.'}`, error: true };
    }

  } catch (error) {
    console.error('Failed to send sample alert:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return { message, error: true };
  }
}
