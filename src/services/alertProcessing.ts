
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import type { User } from '@clerk/nextjs/api';

/**
 * Checks all users for their weather alert preferences and sends emails if conditions are met.
 * @returns A summary of the number of users processed and alerts sent.
 */
export async function checkAndSendAlerts(): Promise<{
  processedUsers: number;
  eligibleUsers: number;
  alertsSent: number;
  errors: string[];
}> {
  let processedUsers = 0;
  let eligibleUsers = 0;
  let alertsSent = 0;
  const errors: string[] = [];

  const userList = await clerkClient.users.getUserList({ limit: 400 }); // Fetch up to 400 users

  for (const user of userList) {
    processedUsers++;
    const preferences = user.privateMetadata?.alertPreferences as Partial<AlertPreferences> | undefined;

    if (!preferences?.alertsEnabled || !preferences.city || !preferences.email) {
      continue; // Skip user if alerts are not enabled or configured
    }
    eligibleUsers++;

    try {
      // Fetch weather data for the user's city
      const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
      if (weatherResult.error || !weatherResult.data) {
        console.warn(`Could not fetch weather for ${preferences.city} (user: ${user.id}). Error: ${weatherResult.error}`);
        continue;
      }

      const weatherData = weatherResult.data;
      const triggeredAlerts = checkAlertConditions(preferences as AlertPreferences, weatherData);

      if (triggeredAlerts.length > 0) {
        // If conditions are met, send the email
        const subject = `Weather Alert for ${weatherData.city}: ${triggeredAlerts[0]}`;
        const html = generateWeatherAlertEmailHtml({ weatherData, alertTriggers: triggeredAlerts });
        
        const emailResult = await sendEmail({
          to: preferences.email,
          subject,
          html,
        });

        if (emailResult.success) {
          alertsSent++;
          console.log(`Alert email sent to ${preferences.email} for ${preferences.city}.`);
        } else {
          throw new Error(emailResult.error);
        }
      }
    } catch (error: any) {
      const errorMessage = `Failed to process alerts for user ${user.id} (${preferences.email}): ${error.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);
    }
  }

  return { processedUsers, eligibleUsers, alertsSent, errors };
}

/**
 * Checks the weather data against user preferences to see if any alert conditions are met.
 * @param preferences The user's alert preferences.
 * @param weatherData The current weather data.
 * @returns An array of strings describing the triggered alerts.
 */
function checkAlertConditions(
  preferences: AlertPreferences,
  weatherData: WeatherSummaryData
): string[] {
  const triggered: string[] = [];

  // Check for extreme temperatures
  if (preferences.notifyExtremeTemp) {
    if (preferences.highTempThreshold != null && weatherData.temperature > preferences.highTempThreshold) {
      triggered.push(
        `High temperature of ${weatherData.temperature}°C detected (threshold: >${preferences.highTempThreshold}°C)`
      );
    }
    if (preferences.lowTempThreshold != null && weatherData.temperature < preferences.lowTempThreshold) {
      triggered.push(
        `Low temperature of ${weatherData.temperature}°C detected (threshold: <${preferences.lowTempThreshold}°C)`
      );
    }
  }

  // Check for strong wind
  if (preferences.notifyStrongWind) {
    if (preferences.windSpeedThreshold != null && weatherData.windSpeed > preferences.windSpeedThreshold) {
      triggered.push(
        `Strong wind of ${weatherData.windSpeed} km/h detected (threshold: >${preferences.windSpeedThreshold} km/h)`
      );
    }
  }

  // Check for heavy rain
  if (preferences.notifyHeavyRain) {
    // OpenWeather condition for rain is simply "Rain"
    if (weatherData.condition.toLowerCase().includes('rain')) {
      triggered.push(`Rain is currently forecasted.`);
    }
  }

  return triggered;
}
