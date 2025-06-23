
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences, SaveAlertsFormState } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { processUserForAlerts } from '@/services/alertProcessing';

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
    const user = await clerkClient.users.getUser(userId);
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

export async function testAlertsAction(): Promise<{ message: string; error: boolean }> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to test alerts.', error: true };
  }

  try {
    const user = await clerkClient.users.getUser(userId);
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
