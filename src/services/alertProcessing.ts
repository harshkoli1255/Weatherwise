
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/api';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';

function isTimeInSchedule(preferences: AlertPreferences, timezone: number): boolean {
  const schedule = preferences.schedule;
  if (!schedule || !schedule.enabled) {
    return true;
  }

  const now = new Date();
  const localTime = new Date(now.getTime() + timezone * 1000);
  const localDay = localTime.getUTCDay();
  const localHour = localTime.getUTCHour();

  if (!schedule.days.includes(localDay)) {
    return false;
  }

  const { startHour, endHour } = schedule;
  if (startHour <= endHour) {
    return localHour >= startHour && localHour <= endHour;
  } else {
    return localHour >= startHour || localHour <= endHour;
  }
}

function checkAlertConditions(weatherData: WeatherSummaryData): string[] {
  if (weatherData.weatherSentiment === 'bad') {
    return ['AI analysis determined that current weather conditions are significant. Please review the summary for details.'];
  }
  return [];
}

function shouldSendBasedOnFrequency(preferences: AlertPreferences): boolean {
  const frequency = preferences.notificationFrequency ?? 'everyHour';
  if (frequency === 'everyHour') {
    return true; // Always send if conditions are met
  }

  const lastSentTimestamp = preferences.lastAlertSentTimestamp ?? 0;
  const hoursSinceLastAlert = (Date.now() - lastSentTimestamp) / (1000 * 60 * 60);

  if (frequency === 'balanced') {
    return hoursSinceLastAlert >= 4; // Send if it's been at least 4 hours
  }

  if (frequency === 'oncePerDay') {
    return hoursSinceLastAlert >= 24; // Send if it's been at least 24 hours
  }

  return true; // Default to sending
}

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
    const response = await clerkClient.users.getUserList({ limit: 500 });
    userList = response.data;
  } catch (error) {
    const errorMsg = `Failed to fetch user list from Clerk: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { processedUsers: 0, eligibleUsers, alertsSent, errors };
  }

  for (const user of userList) {
    try {
      const prefsRaw = user.privateMetadata?.alertPreferences;
      if (!prefsRaw) continue;

      const preferences = JSON.parse(JSON.stringify(prefsRaw)) as AlertPreferences;
      const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

      if (!preferences.alertsEnabled || !preferences.city || !email) {
        continue;
      }
      
      eligibleUsers++;

      const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
      if (weatherResult.error || !weatherResult.data) {
        console.warn(`Could not fetch weather for ${preferences.city} (user: ${user.id}). Skipping. Error: ${weatherResult.error}`);
        continue;
      }
      const weatherData = weatherResult.data;

      if (!isTimeInSchedule(preferences, weatherData.timezone)) {
        console.log(`Skipping user ${user.id} for city ${preferences.city} due to schedule.`);
        continue;
      }

      const alertTriggers = checkAlertConditions(weatherData);

      if (alertTriggers.length > 0) {
        if (!shouldSendBasedOnFrequency(preferences)) {
          console.log(`Skipping user ${user.id} for city ${preferences.city} due to frequency settings.`);
          continue;
        }

        console.log(`Sending alert to ${email} for city ${preferences.city}. Triggers:`, alertTriggers.join(', '));
        
        const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers });
        const emailSubject = `Weather Alert: ${weatherData.aiSubject}`;

        const emailResult = await sendEmail({
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });

        if (emailResult.success) {
          alertsSent++;
          // IMPORTANT: Update metadata with the new timestamp
          await clerkClient.users.updateUserMetadata(user.id, {
            privateMetadata: {
              ...user.privateMetadata,
              alertPreferences: {
                ...preferences,
                lastAlertSentTimestamp: Date.now(),
              },
            },
          });
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
