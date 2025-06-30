
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences, CitySuggestion, SaveAlertsFormState } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { processUserForAlerts } from '@/services/alertProcessing';
import { fetchWeatherAndSummaryAction } from '../actions';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';
import { sendEmail } from '@/services/emailService';

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to save preferences.', error: true };
  }
  
  const BaseAlertPreferencesSchema = z.object({
    city: z.string().optional(),
    alertsEnabled: z.boolean(),
    notificationFrequency: z.enum(['everyHour', 'balanced', 'oncePerDay']).default('balanced'),
    timezone: z.string().optional(),
    schedule: z.object({
      enabled: z.boolean(),
      days: z.array(z.number().min(0).max(6)),
      startHour: z.coerce.number().min(0).max(23),
      endHour: z.coerce.number().min(0).max(23),
    }),
  });

  const AlertPreferencesSchema = BaseAlertPreferencesSchema.refine(
    (data) => {
      if (data.alertsEnabled && (!data.city || data.city.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'City is required when alerts are enabled.',
      path: ['city'],
    }
  ).refine(
    (data) => {
      if (data.schedule.enabled && (!data.timezone || data.timezone.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'A valid timezone is required when a custom schedule is enabled.',
      path: ['timezone'],
    }
  );
  
  const scheduleDays = [0, 1, 2, 3, 4, 5, 6]
    .filter(day => formData.get(`scheduleDay${day}`) === 'on')
    .map(Number);
    
  const dataToValidate = {
    city: formData.get('city') as string,
    alertsEnabled: formData.get('alertsEnabled') === 'on',
    notificationFrequency: formData.get('notificationFrequency'),
    timezone: formData.get('timezone') as string,
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
    const user = await clerkClient().users.getUser(userId);
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!email) {
      return { message: 'Could not find your email address. Please ensure you have a primary email set on your account.', error: true };
    }

    const existingPrefs = user.privateMetadata?.alertPreferences 
        ? (JSON.parse(JSON.stringify(user.privateMetadata.alertPreferences)) as Partial<AlertPreferences>)
        : {};

    const newPreferences: AlertPreferences = {
      ...existingPrefs,
      ...validatedFields.data,
      city: validatedFields.data.city || '',
      email,
      timezone: validatedFields.data.timezone || '',
      // Reset timestamp if frequency changes, to allow immediate alerts on the new setting
      lastAlertSentTimestamp: existingPrefs.notificationFrequency !== validatedFields.data.notificationFrequency 
        ? 0 
        : existingPrefs.lastAlertSentTimestamp || 0,
    };
    
    await clerkClient().users.updateUserMetadata(userId, {
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

export async function testAlertsAction(): Promise<{ message: string; error: boolean }> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to test alerts.', error: true };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const prefsRaw = user.privateMetadata?.alertPreferences;
    if (!prefsRaw) {
        return { message: 'Please save your alert preferences before sending a test.', error: true };
    }
    const preferences = JSON.parse(JSON.stringify(prefsRaw)) as AlertPreferences;
    if (!preferences.alertsEnabled || !preferences.city) {
        return { message: 'Please enable alerts and set a city before sending a test.', error: true };
    }

    const errors: string[] = [];
    const alertsSentCount = await processUserForAlerts(user, errors);

    if (errors.length > 0) {
      // Check for specific, user-facing errors from email service
      const emailError = errors.find(e => e.includes('Could not connect') || e.includes('Authentication failed'));
      if (emailError) {
         return { message: `Email sending failed. Please check your email configuration in the .env file. Details: ${emailError}`, error: true };
      }
      return { message: `Test failed with an unexpected error: ${errors[0]}`, error: true };
    }

    if (alertsSentCount > 0) {
      return {
        message: 'Test successful! An alert matching your criteria was sent to your email.',
        error: false,
      };
    } else {
      return {
        message: 'Test complete. Your settings are working, but no significant weather conditions were met for your city right now.',
        error: false,
      };
    }
  } catch (error) {
    console.error('Failed to run test alert:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `An unexpected error occurred while running the test: ${message}`, error: true };
  }
}

export async function forceTestAlertAction(): Promise<{ message: string; error: boolean }> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to perform this action.', error: true };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const prefsRaw = user.privateMetadata?.alertPreferences;
    if (!prefsRaw) {
        return { message: 'Please save your alert preferences before sending a test.', error: true };
    }
    const preferences = JSON.parse(JSON.stringify(prefsRaw)) as AlertPreferences;
    const email = preferences.email;

    if (!preferences.alertsEnabled || !preferences.city || !email) {
        return { message: 'Please enable alerts and set a city before sending a test.', error: true };
    }

    const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
    if (weatherResult.error || !weatherResult.data) {
      return { message: `Could not fetch weather data for your city. Error: ${weatherResult.error}`, error: true };
    }
    
    const emailHtml = generateWeatherAlertEmailHtml({ 
        weatherData: weatherResult.data, 
        alertTriggers: ["This is a <strong>manually requested</strong> test alert from Weatherwise."]
    });
    const emailSubject = `[Test] Weatherwise Alert for ${weatherResult.data.city}`;

    const emailResult = await sendEmail({ to: email, subject: emailSubject, html: emailHtml });
    
    if (emailResult.success) {
      return { message: 'A test alert has been successfully sent to your email.', error: false };
    } else {
      return { message: `Email sending failed. Please check your server configuration. Details: ${emailResult.error}`, error: true };
    }

  } catch (error) {
    console.error('Failed to run forced test alert:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { message: `An unexpected error occurred: ${message}`, error: true };
  }
}

export async function getAlertPreferencesAction(): Promise<{ preferences: AlertPreferences | null; error: string | null }> {
  const { userId } = auth();
  if (!userId) {
    return { preferences: null, error: 'User not authenticated.' };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ?? '';

    const defaultPreferences: AlertPreferences = {
      email: primaryEmail,
      city: '',
      alertsEnabled: false,
      notificationFrequency: 'balanced',
      timezone: '',
      schedule: {
        enabled: false,
        days: [0, 1, 2, 3, 4, 5, 6],
        startHour: 0,
        endHour: 23,
      },
      lastAlertSentTimestamp: 0,
    };
    
    const savedPreferencesRaw = user.privateMetadata?.alertPreferences;
    const savedPreferences = savedPreferencesRaw 
      ? JSON.parse(JSON.stringify(savedPreferencesRaw)) as Partial<AlertPreferences> 
      : {};

    const preferences: AlertPreferences = {
      ...defaultPreferences,
      ...savedPreferences,
      email: primaryEmail,
      timezone: savedPreferences?.timezone || '',
      schedule: {
        ...defaultPreferences.schedule,
        ...(savedPreferences?.schedule || {}),
      },
    };

    return { preferences, error: null };
  } catch (error) {
    console.error('Failed to get alert preferences:', error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return { preferences: null, error: `Failed to load preferences: ${message}` };
  }
}

export async function setAlertCityAction(
  city: CitySuggestion
): Promise<{ success: boolean; message: string }> {
  const { userId } = auth();
  if (!userId) {
    return { success: false, message: 'You must be signed in to perform this action.' };
  }

  if (!city || !city.name) {
    return { success: false, message: 'Invalid city data provided.' };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!email) {
      return { success: false, message: 'Could not find your email address.' };
    }

    const existingPrefs = user.privateMetadata?.alertPreferences
      ? (JSON.parse(JSON.stringify(user.privateMetadata.alertPreferences)) as Partial<AlertPreferences>)
      : {};

    const newPreferences: AlertPreferences = {
      email: email,
      city: city.name, // Set the new city
      alertsEnabled: true, // Enable alerts by default when setting a city this way
      notificationFrequency: existingPrefs.notificationFrequency ?? 'balanced',
      timezone: existingPrefs.timezone ?? '',
      schedule: existingPrefs.schedule ?? {
        enabled: false,
        days: [0, 1, 2, 3, 4, 5, 6],
        startHour: 0,
        endHour: 23,
      },
      lastAlertSentTimestamp: existingPrefs.lastAlertSentTimestamp ?? 0,
    };
    
    await clerkClient().users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        alertPreferences: newPreferences,
      },
    });
    
    revalidatePath('/alerts');
    return { success: true, message: `Alert city has been set to ${city.name}.` };
  } catch (error) {
    console.error('Failed to set alert city:', error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, message: `Failed to set alert city: ${message}` };
  }
}
