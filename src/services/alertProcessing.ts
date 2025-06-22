
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';

/**
 * The core logic for the hourly weather alert system.
 * It fetches all users, checks their preferences, gets the latest weather,
 * and sends email alerts if the defined conditions are met.
 */
export async function checkAndSendAlerts(): Promise<{
  processedUsers: number;
  eligibleUsers: number;
  alertsSent: number;
  errors: string[];
}> {
  let userList;
  const errors: string[] = [];

  // Step 1: Fetch all users from the authentication service (Clerk)
  try {
    // Note: clerkClient.users.getUserList() returns a paginated response object, not a direct array.
    const response = await clerkClient.users.getUserList({ limit: 500 }); // Fetch up to 500 users
    userList = response.data; // The user list is in the 'data' property
    
    if (!Array.isArray(userList)) {
        throw new Error("User list from Clerk was not in the expected format (response.data is not an array).");
    }

  } catch (error) {
    const errorMsg = `Failed to fetch user list from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { processedUsers: 0, eligibleUsers: 0, alertsSent: 0, errors };
  }

  const processedUsers = userList.length;
  let eligibleUsers = 0;
  let alertsSent = 0;

  // Step 2: Iterate through each user to check their alert preferences
  for (const user of userList) {
    try {
      const prefsRaw = user.privateMetadata?.alertPreferences;
      if (!prefsRaw) {
        continue; // User has no preferences set, skip.
      }

      const preferences = JSON.parse(JSON.stringify(prefsRaw)) as Partial<AlertPreferences>;

      // Check if user is eligible for alerts
      if (!preferences.alertsEnabled || !preferences.city || !preferences.email) {
        continue; // Skip if alerts are off, or no city/email is set.
      }
      
      eligibleUsers++;

      // Step 3: Fetch weather for the user's chosen city
      const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
      if (weatherResult.error || !weatherResult.data) {
        console.warn(`Could not fetch weather for ${preferences.city} (user: ${user.id}). Skipping. Error: ${weatherResult.error}`);
        continue;
      }
      const weatherData = weatherResult.data;

      // Step 4: Check if current weather triggers any of the user's alerts
      const alertTriggers = checkAlertConditions(preferences as AlertPreferences, weatherData);

      if (alertTriggers.length > 0) {
        console.log(`Sending alert to ${preferences.email} for city ${preferences.city}. Triggers:`, alertTriggers.join(', '));
        
        // Step 5: If triggered, generate and send the alert email
        const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers });
        const emailSubject = `Weather Alert: ${weatherData.aiSubject}`;

        const emailResult = await sendEmail({
          to: preferences.email,
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
}

/**
 * A helper function that checks the current weather against a user's alert preferences.
 * @returns An array of strings describing which alerts were triggered. An empty array means no alerts.
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
        `High temperature of ${weatherData.temperature}°C (threshold: >${preferences.highTempThreshold}°C)`
      );
    }
    if (preferences.lowTempThreshold != null && weatherData.temperature < preferences.lowTempThreshold) {
      triggered.push(
        `Low temperature of ${weatherData.temperature}°C (threshold: <${preferences.lowTempThreshold}°C)`
      );
    }
  }

  // Check for strong wind
  if (preferences.notifyStrongWind && preferences.windSpeedThreshold != null) {
    if (weatherData.windSpeed > preferences.windSpeedThreshold) {
      triggered.push(
        `Strong wind of ${weatherData.windSpeed} km/h (threshold: >${preferences.windSpeedThreshold} km/h)`
      );
    }
  }

  // Check for rain
  if (preferences.notifyHeavyRain) {
    const condition = weatherData.condition?.toLowerCase();
    if (condition && (condition.includes('rain') || condition.includes('thunderstorm') || condition.includes('drizzle'))) {
      triggered.push(`Rain is forecasted (${weatherData.description}).`);
    }
  }

  return triggered;
}
