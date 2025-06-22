
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

    const subject = weatherData.aiSubject;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const alertsUrl = new URL('/alerts', baseUrl).toString();
    const iconUrl = `https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="background-color: #0A0F1E; background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px); background-size: 16px 16px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 24px; margin: 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
        <tr>
            <td align="center">
                <!--[if mso]>
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                <td>
                <![endif]-->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background-color: #111827; border-radius: 16px; border: 1px solid #374151; padding: 24px 32px; max-width: 600px;">
                    
                    <!-- Header: City & Description -->
                    <tr>
                        <td align="center" style="padding-bottom: 24px; text-align: center;">
                            <p style="font-size: 28px; font-weight: bold; color: #60A5FA; margin: 0;">${weatherData.city}, ${weatherData.country}</p>
                            <p style="font-size: 16px; color: #9CA3AF; margin: 4px 0 0 0; text-transform: capitalize;">${weatherData.description}</p>
                        </td>
                    </tr>

                    <!-- Main Weather: Temperature & Icon -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    <td width="55%" align="left" valign="middle">
                                        <p style="margin: 0; font-size: 80px; font-weight: bold; color: #60A5FA; line-height: 1;">
                                            ${weatherData.temperature}<span style="font-size: 40px; color: #9CA3AF; vertical-align: 30px; margin-left: 4px;">°C</span>
                                        </p>
                                    </td>
                                    <td width="45%" align="right" valign="middle">
                                        <img src="${iconUrl}" alt="${weatherData.description}" width="160" height="160" style="display: block; border: 0;">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Weather Details Cards -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    <td width="33.33%" style="padding-right: 6px;">
                                        <div style="background-color: #1F2937; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #9CA3AF; margin: 0 0 8px 0;">Feels Like</p>
                                            <p style="font-size: 20px; font-weight: bold; color: #ffffff; margin: 0;">${weatherData.feelsLike}°C</p>
                                        </div>
                                    </td>
                                    <td width="33.33%" style="padding-left: 3px; padding-right: 3px;">
                                        <div style="background-color: #1F2937; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #9CA3AF; margin: 0 0 8px 0;">Humidity</p>
                                            <p style="font-size: 20px; font-weight: bold; color: #ffffff; margin: 0;">${weatherData.humidity}%</p>
                                        </div>
                                    </td>
                                    <td width="33.33%" style="padding-left: 6px;">
                                        <div style="background-color: #1F2937; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #9CA3AF; margin: 0 0 8px 0;">Wind</p>
                                            <p style="font-size: 20px; font-weight: bold; color: #ffffff; margin: 0;">${weatherData.windSpeed} km/h</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Hourly Forecast -->
                    ${weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 ? `
                    <tr>
                        <td style="padding-top: 16px; padding-bottom: 16px;">
                            <p style="font-size: 18px; font-weight: bold; color: #60A5FA; margin: 0 0 16px 0;">Hourly Forecast</p>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    ${weatherData.hourlyForecast.slice(0, 5).map(forecast => `
                                        <td align="center" style="padding: 0 4px;">
                                            <div style="background-color: #1F2937; border-radius: 12px; padding: 12px 8px; text-align: center; width: 85px;">
                                                <p style="font-size: 14px; color: #9CA3AF; margin: 0; white-space: nowrap;">${forecast.time}</p>
                                                <img src="https://openweathermap.org/img/wn/${forecast.iconCode}@2x.png" width="40" height="40" alt="${forecast.condition}" style="margin: 4px auto; display: block; border: 0;" />
                                                <p style="font-size: 18px; font-weight: bold; color: #ffffff; margin: 0;">${forecast.temp}°</p>
                                            </div>
                                        </td>
                                    `).join('')}
                                </tr>
                            </table>
                        </td>
                    </tr>` : ''}

                    <!-- AI Summary -->
                    <tr>
                        <td style="padding-top: 24px;">
                             <p style="font-size: 18px; font-weight: bold; color: #60A5FA; margin: 0 0 16px 0;">AI Weather Summary</p>
                            <div style="background-color: #1F2937; border-radius: 12px; padding: 16px;">
                                <p style="font-size: 16px; color: #D1D5DB; margin: 0; line-height: 1.6;">${weatherData.aiSummary}</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 32px; text-align: center; font-size: 13px; color: #9CA3AF;">
                             <p style="margin: 0 0 16px 0;">To manage your alert preferences, please visit your settings.</p>
                             <a href="${alertsUrl}" style="background-color: #3B82F6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
                                 Manage Alerts
                             </a>
                             <p style="margin-top: 24px; font-size: 12px;">© ${new Date().getFullYear()} Weatherwise</p>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
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
