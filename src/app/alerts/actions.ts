
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences, SaveAlertsFormState } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const { userId } = auth();
  if (!userId) {
    return { message: 'You must be signed in to save preferences.', error: true };
  }
  
  // Zod schema is for validation after we process the FormData,
  // as FormData doesn't directly map to complex objects/arrays.
  const AlertPreferencesSchema = z.object({
    city: z.string().min(1, 'City is required for alerts.'),
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
  
  // Manually construct the object from FormData
  const scheduleDays = [0, 1, 2, 3, 4, 5, 6]
    .filter(day => formData.get(`scheduleDay${day}`) === 'on')
    .map(Number);
    
  const dataToValidate = {
    city: formData.get('city'),
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
    // A more specific error message if possible
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
