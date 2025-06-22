
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';

/**
 * Checks weather conditions against user preferences and sends alerts if conditions are met.
 * This function is intended to be called by a secure CRON job.
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

  try {
    const users = await clerkClient.users.getUserList({ limit: 500 }); // Adjust limit as needed
    processedUsers = users.length;

    for (const user of users) {
      const prefsRaw = user.privateMetadata?.alertPreferences;
      if (!prefsRaw) continue;

      const preferences = JSON.parse(JSON.stringify(prefsRaw)) as Partial<AlertPreferences>;
      
      if (!preferences.alertsEnabled || !preferences.city) {
        continue;
      }
      
      eligibleUsers++;

      try {
        const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
        if (weatherResult.error || !weatherResult.data) {
          console.warn(`Could not fetch weather for ${preferences.city} (user: ${user.id}). Skipping. Error: ${weatherResult.error}`);
          continue;
        }

        const weatherData = weatherResult.data;
        const alertTriggers = checkAlertConditions(preferences as AlertPreferences, weatherData);

        if (alertTriggers.length > 0) {
          console.log(`Sending alert to ${user.id} for city ${preferences.city}. Triggers:`, alertTriggers);
          
          const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers, isTest: false });
          const emailSubject = weatherData.aiSubject;

          const emailResult = await sendEmail({
            to: preferences.email!,
            subject: emailSubject,
            html: emailHtml,
          });

          if (emailResult.success) {
            alertsSent++;
          } else {
            const errorMsg = `Failed to send email to ${preferences.email}: ${emailResult.error}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return { processedUsers, eligibleUsers, alertsSent, errors };

  } catch (error) {
    const errorMsg = `Failed to fetch user list from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { processedUsers, eligibleUsers, alertsSent, errors };
  }
}

/**
 * Checks the current weather against a user's alert preferences.
 * @returns An array of strings describing which alerts were triggered.
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
  // This is a simple check. A more advanced implementation could check rain volume if the API provides it.
  if (preferences.notifyHeavyRain) {
    const condition = weatherData.condition.toLowerCase();
    if (condition.includes('rain') || condition.includes('thunderstorm') || condition.includes('drizzle')) {
      triggered.push(`Rain is currently forecasted (${weatherData.description}).`);
    }
  }

  return triggered;
}
