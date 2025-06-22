
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

    const subject = `${weatherData.temperature}°C & ${weatherData.description} in ${weatherData.city}`;
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
        body {
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6; /* Tailwind gray-100 */
            color: #1f2937; /* gray-800 */
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); /* Tailwind shadow-lg */
            overflow: hidden;
            border: 1px solid #e5e7eb; /* gray-200 */
        }
        .header {
            background-color: #3b82f6; /* blue-500 */
            color: #ffffff;
            padding: 24px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 26px;
            font-weight: 600; /* semibold */
        }
        .content {
            padding: 32px;
        }
        .weather-main {
            text-align: center;
            border-bottom: 1px solid #e5e7eb; /* gray-200 */
            padding-bottom: 24px;
            margin-bottom: 24px;
        }
        .weather-main h2 {
            margin: 0 0 4px 0;
            font-size: 22px;
            font-weight: 600;
            color: #111827; /* gray-900 */
        }
        .weather-main .description {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #6b7280; /* gray-500 */
            text-transform: capitalize;
        }
        .weather-main .temperature {
            font-size: 60px;
            font-weight: 700; /* bold */
            color: #1f2937; /* gray-800 */
            margin: 0;
            line-height: 1;
        }
        .weather-main img {
            margin: -10px auto;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
        }
        .weather-details {
            display: table;
            width: 100%;
            border-spacing: 12px 0;
            margin-left: -6px;
            border-collapse: separate;
        }
        .detail-item {
            display: table-cell;
            width: 33.33%;
            background-color: #f9fafb; /* gray-50 */
            padding: 16px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e5e7eb; /* gray-200 */
        }
        .detail-item .label {
            font-size: 13px;
            color: #6b7280; /* gray-500 */
            margin-bottom: 6px;
            display: block;
            font-weight: 500;
        }
        .detail-item .value {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937; /* gray-800 */
        }
        .ai-summary {
            margin-top: 32px;
            background-color: #f9fafb; /* gray-50 */
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #3b82f6; /* blue-500 accent */
        }
        .ai-summary h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            color: #111827; /* gray-900 */
            font-weight: 600;
        }
        .ai-summary p {
            margin: 0;
            font-size: 15px;
            color: #4b5563; /* gray-600 */
            line-height: 1.6;
        }
        .footer {
            background-color: #f9fafb; /* gray-50 */
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #6b7280; /* gray-500 */
            border-top: 1px solid #e5e7eb; /* gray-200 */
        }
        .footer .button-cta {
            background-color: #3b82f6; /* blue-500 */
            color: #ffffff;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            display: inline-block;
            margin-top: 12px;
            margin-bottom: 12px;
            font-weight: 500; /* medium */
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Weatherwise</h1>
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
            <p>This is a test alert. To manage your notification preferences or to unsubscribe, please visit your settings.</p>
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
