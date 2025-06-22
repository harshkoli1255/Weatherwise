
'use server';

// The state type for the form, if needed in the future.
// For now, it's simplified.
export type SaveAlertsFormState = {
  message: string | null;
  error: boolean;
};

// Clerk/auth related functionality is temporarily disabled.
// These actions now return an error message immediately.

export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  return {
    message: "Cannot save preferences. The authentication system is temporarily disabled.",
    error: true,
  };
}

export async function sendTestEmailAction(
  prevState: { message: string | null, error: boolean },
  formData: FormData
): Promise<{ message: string | null, error: boolean }> {
  return {
    message: "Cannot send test email. The authentication system is temporarily disabled.",
    error: true,
  };
}
