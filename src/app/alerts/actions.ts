
'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { AlertPreferences } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/services/emailService';
import { fetchWeatherAndSummaryAction } from '@/app/actions';

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

    const subject = `Your Weatherwise Alert for ${weatherData.city}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const alertsUrl = new URL('/alerts', baseUrl).toString();
    const iconUrl = `https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f0f4f8; color: #1e293b;}
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background-color: #4A90E2; color: #ffffff; padding: 24px; text-align: center; border-bottom: 5px solid #357ABD; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .content { padding: 32px; }
        .weather-main { text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
        .weather-main h2 { margin: 0 0 8px 0; font-size: 24px; color: #1e293b; }
        .weather-main .description { margin: 0 0 16px 0; font-size: 18px; color: #475569; text-transform: capitalize; }
        .weather-main .temperature { font-size: 72px; font-weight: bold; color: #1e293b; margin: 0; line-height: 1; }
        .weather-main img { margin: -10px 0; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }
        .weather-details { display: table; width: 100%; border-spacing: 10px; }
        .detail-item { display: table-cell; width: 33.3%; background-color: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0;}
        .detail-item .label { font-size: 14px; color: #64748b; margin-bottom: 8px; display: block; }
        .detail-item .value { font-size: 18px; font-weight: 600; color: #1e293b; }
        .ai-summary { margin-top: 32px; background-color: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; }
        .ai-summary h3 { margin: 0 0 10px 0; font-size: 16px; color: #334155; }
        .ai-summary p { margin: 0; font-size: 15px; color: #475569; line-height: 1.6; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .footer a.button { color: #4A90E2; text-decoration: none; }
        .footer .button-cta { background-color: #4A90E2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px; font-weight: bold; }

    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weatherwise Alert</h1>
        </div>
        <div class="content">
            <div class="weather-main">
                <h2>${weatherData.city}, ${weatherData.country}</h2>
                <p class="description">${weatherData.description}</p>
                <img src="${iconUrl}" alt="${weatherData.description}" width="150" height="150">
                <p class="temperature">${weatherData.temperature}°C</p>
            </div>
            <div class="weather-details">
                <div class="detail-item">
                    <span class="label">Feels Like</span>
                    <span class="value">${weatherData.feelsLike}°C</span>
                </div>
                <div class="detail-item">
                    <span class="label">Humidity</span>
                    <span class="value">${weatherData.humidity}%</span>
                </div>
                <div class="detail-item">
                    <span class="label">Wind</span>
                    <span class="value">${weatherData.windSpeed} km/h</span>
                </div>
            </div>
            <div class="ai-summary">
                <h3>AI Summary</h3>
                <p>${weatherData.aiSummary}</p>
            </div>
        </div>
        <div class="footer">
            <p>To manage your notification preferences or to unsubscribe, please visit your settings.</p>
            <a href="${alertsUrl}" class="button-cta">
                Manage Alerts
            </a>
            <p style="margin-top: 16px;">© ${new Date().getFullYear()} Weatherwise</p>
        </div>
    </div>
</body>
</html>`;

    const result = await sendEmail({
      to: emailAddress,
      subject,
      html,
    });

    if (result.success) {
      return { message: `Test weather alert for ${weatherData.city} sent successfully to ${emailAddress}!`, error: false };
    } else {
      return { message: `Failed to send test email: ${result.error}`, error: true };
    }
  } catch (error: any) {
    console.error('Failed to send test email action:', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    return { message: `Failed to send test email. ${errorMessage}`, error: true };
  }
}
