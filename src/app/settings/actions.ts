'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import type { UnitPreferences, CitySuggestion } from '@/lib/types';

export async function saveUnitPreferences(newUnits: Partial<UnitPreferences>) {
  const { userId } = auth();
  if (!userId) {
    // This case is handled client-side for guests, but provides a server-side guard.
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const existingPublicMetadata = user.publicMetadata || {};

    await clerkClient().users.updateUser(userId, {
      publicMetadata: {
        ...existingPublicMetadata,
        unitPreferences: {
          ...((existingPublicMetadata.unitPreferences as object) || {}),
          ...newUnits,
        },
      },
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to save unit preferences:', error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: `Failed to save preferences: ${message}` };
  }
}

export async function saveDefaultLocation(location: CitySuggestion | null) {
  const { userId } = auth();
  if (!userId) {
     // This case is handled client-side for guests, but provides a server-side guard.
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const existingPublicMetadata = user.publicMetadata || {};
    
    await clerkClient().users.updateUser(userId, {
      publicMetadata: {
        ...existingPublicMetadata,
        defaultLocation: location,
      },
    });
    
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to save default location:', error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: `Failed to save default location: ${message}` };
  }
}

export async function saveSavedLocations(locations: CitySuggestion[]) {
  const { userId } = auth();
  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    const user = await clerkClient().users.getUser(userId);
    const existingPublicMetadata = user.publicMetadata || {};

    await clerkClient().users.updateUser(userId, {
      publicMetadata: {
        ...existingPublicMetadata,
        // Clerk metadata can't store undefined, so ensure it's an array.
        savedLocations: locations || [],
      },
    });

    // Revalidate paths where saved locations might be displayed to ensure consistency
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to save saved locations:', error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { success: false, error: `Failed to save locations: ${message}` };
  }
}
