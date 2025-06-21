
'use server';

import type { SaveAlertsFormState } from './actions';

// Clerk/auth related functionality is temporarily disabled to debug startup issues.
// These actions now return an error message immediately.

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  return {
    message: "Cannot save preferences. Authentication system is temporarily disabled for maintenance.",
    error: true,
  };
}

export async function sendTestEmailAction(
  prevState: { message: string | null, error: boolean },
  formData: FormData
): Promise<{ message: string | null, error: boolean }> {
  return {
    message: "Cannot send test email. Authentication system is temporarily disabled for maintenance.",
    error: true,
  };
}
