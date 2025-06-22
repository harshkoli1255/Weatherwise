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
