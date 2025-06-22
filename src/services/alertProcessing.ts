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
export async function checkAndSendAlerts(
  options?: { isTestRun?: boolean }
): Promise<{
  processedUsers: number;
  eligibleUsers: number;
  alertsSent: number;
  errors: string[];
}> {
  const isTestRun = options?.isTestRun ?? false;
  let userList;
  const errors: string[] = [];

  // Step 1: Fetch all users from the authentication service (Clerk)
  try {
    const response = await clerkClient.users.getUserList({ limit: 500 });
    userList = response.data;
    
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
      const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

      // Check if user is eligible for alerts
      if (!preferences.alertsEnabled || !preferences.city || !email) {
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
      const alertTriggers = checkAlertConditions(preferences as AlertPreferences, weatherData, isTestRun);

      if (alertTriggers.length > 0) {
        console.log(`Sending alert to ${email} for city ${preferences.city}. Triggers:`, alertTriggers.join(', '));
        
        // Step 5: If triggered, generate and send the alert email
        const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers });
        const emailSubject = `Weather Alert: ${weatherData.aiSubject}`;

        const emailResult = await sendEmail({
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailResult.success) {
          alertsSent++;
        } else {
          const errorMsg = `Failed to send email to ${email}: ${emailResult.error}`;
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
  weatherData: WeatherSummaryData,
  isTestRun: boolean = false
): string[] {
  // If this is a manual test run from the UI, we bypass the real weather checks
  // and send an alert if ANY condition preference is enabled. This confirms the pipeline works.
  if (isTestRun) {
    const activeAlerts: string[] = [];
    if (preferences.notifyExtremeTemp) {
      activeAlerts.push('Extreme Temperature');
    }
    if (preferences.notifyHeavyRain) {
      activeAlerts.push('Heavy Rain');
    }
    if (preferences.notifyStrongWind) {
      activeAlerts.push('Strong Wind');
    }
    
    if (activeAlerts.length > 0) {
      return [`This is a system test for your enabled alert(s): ${activeAlerts.join(', ')}.`];
    }
    // If alerts are globally on, but no conditions are selected, we don't send a test alert.
    return [];
  }

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
