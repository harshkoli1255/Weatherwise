
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/api';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';

/**
 * Checks if the current time is within the user's defined alert schedule.
 * @param preferences - The user's alert preferences.
 * @param timezone - The timezone offset in seconds for the user's city.
 * @returns `true` if an alert should be sent based on the schedule, `false` otherwise.
 */
function isTimeInSchedule(preferences: AlertPreferences, timezone: number): boolean {
  const schedule = preferences.schedule;
  // If scheduling is not enabled, alerts are always active.
  if (!schedule || !schedule.enabled) {
    return true;
  }

  // Calculate the current time in the user's local timezone.
  const now = new Date();
  // `timezone` is an offset in seconds from UTC. We apply it to the current UTC time.
  const localTime = new Date(now.getTime() + timezone * 1000);
  
  // getUTCDay() and getUTCHour() are used on the offset time to get the correct day/hour
  // without interference from the server's own timezone.
  const localDay = localTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const localHour = localTime.getUTCHour(); // 0-23

  // Check if today is an active day
  if (!schedule.days.includes(localDay)) {
    return false;
  }

  // Check if the current hour is within the active time range
  const { startHour, endHour } = schedule;

  if (startHour <= endHour) {
    // Standard case: 8 AM to 10 PM (8 to 22)
    return localHour >= startHour && localHour <= endHour;
  } else {
    // Overnight case: 10 PM to 6 AM (22 to 6)
    return localHour >= startHour || localHour <= endHour;
  }
}

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
  let userList: User[] = [];
  const errors: string[] = [];
  let eligibleUsers = 0;
  let alertsSent = 0;

  try {
    // Clerk's getUserList is paginated, so we fetch all users.
    const response = await clerkClient.users.getUserList({ limit: 500 });
    userList = response.data;
  } catch (error) {
    const errorMsg = `Failed to fetch user list from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { processedUsers: 0, eligibleUsers, alertsSent, errors };
  }

  // Step 2: Iterate through each user to check their alert preferences
  for (const user of userList) {
    try {
      const prefsRaw = user.privateMetadata?.alertPreferences;
      if (!prefsRaw) {
        continue; // User has no preferences set, skip.
      }

      const preferences = JSON.parse(JSON.stringify(prefsRaw)) as AlertPreferences;
      const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

      // Check if user is eligible for alerts (globally enabled, has city and email)
      if (!preferences.alertsEnabled || !preferences.city || !email) {
        continue;
      }
      
      eligibleUsers++;

      // Step 3: Fetch weather for the user's chosen city
      const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
      if (weatherResult.error || !weatherResult.data) {
        console.warn(`Could not fetch weather for ${preferences.city} (user: ${user.id}). Skipping. Error: ${weatherResult.error}`);
        continue;
      }
      const weatherData = weatherResult.data;

      // Step 4: Check if the current time is within the user's schedule
      if (!isTimeInSchedule(preferences, weatherData.timezone)) {
        console.log(`Skipping user ${user.id} for city ${preferences.city} due to schedule.`);
        continue;
      }

      // Step 5: Check if current weather triggers any of the user's alerts
      const alertTriggers = checkAlertConditions(weatherData);

      if (alertTriggers.length > 0) {
        console.log(`Sending alert to ${email} for city ${preferences.city}. Triggers:`, alertTriggers.join(', '));
        
        // Step 6: If triggered, generate and send the alert email
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

  return { processedUsers: userList.length, eligibleUsers, alertsSent, errors };
}

/**
 * A helper function that checks the current weather against a user's alert preferences.
 * @returns An array of strings describing which alerts were triggered. An empty array means no alerts.
 */
function checkAlertConditions(
  weatherData: WeatherSummaryData,
): string[] {
  // If the AI has determined the weather sentiment is 'bad', we trigger an alert.
  if (weatherData.weatherSentiment === 'bad') {
    // The email template will use the AI summary for detailed context, 
    // so we just need a simple, clear message here explaining why the alert was sent.
    return ['AI analysis determined that current weather conditions are significant. Please review the summary for details.'];
  }

  // If sentiment is not 'bad', no alerts are triggered.
  return [];
}
