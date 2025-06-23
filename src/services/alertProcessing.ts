
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/api';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';
import { shouldSendWeatherAlert } from '@/ai/flows/alert-decision';

function isTimeInSchedule(preferences: AlertPreferences, timezone: number): boolean {
  const schedule = preferences.schedule;
  if (!schedule || !schedule.enabled) {
    return true;
  }

  const now = new Date();
  const localTime = new Date(now.getTime() + timezone * 1000);
  const localDay = localTime.getUTCDay();
  const localHour = localTime.getUTCHours();

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

export async function processUserForAlerts(user: User, errors: string[]): Promise<number> {
  let alertsSentCount = 0;
  try {
    const prefsRaw = user.privateMetadata?.alertPreferences;
    if (!prefsRaw) return 0;

    const preferences = JSON.parse(JSON.stringify(prefsRaw)) as AlertPreferences;
    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!preferences.alertsEnabled || !preferences.city || !email) {
      return 0;
    }
    
    const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
    if (weatherResult.error || !weatherResult.data) {
      console.warn(`Could not fetch weather for ${preferences.city} (user: ${user.id}). Skipping. Error: ${weatherResult.error}`);
      return 0;
    }
    const weatherData = weatherResult.data;

    if (!isTimeInSchedule(preferences, weatherData.timezone)) {
      console.log(`Skipping user ${user.id} for city ${preferences.city} due to schedule.`);
      return 0;
    }

    const decisionResult = await shouldSendWeatherAlert({
      city: weatherData.city,
      temperature: weatherData.temperature,
      feelsLike: weatherData.feelsLike,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      condition: weatherData.condition,
      description: weatherData.description,
    });

    if (decisionResult.shouldSendAlert) {
      if (!shouldSendBasedOnFrequency(preferences)) {
        console.log(`Skipping user ${user.id} for city ${preferences.city} due to frequency settings.`);
        return 0;
      }

      const alertTriggers = [decisionResult.reason];

      console.log(`Sending alert to ${email} for city ${preferences.city}. Reason:`, decisionResult.reason);
      
      const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers });
      const emailSubject = weatherData.aiSubject;

      const emailResult = await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
      });

      if (emailResult.success) {
        alertsSentCount++;
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
        errors.push(emailResult.error || 'Unknown email error');
      }
    } else {
        console.log(`AI decided no alert needed for ${preferences.city} for user ${user.id}.`);
    }
    return alertsSentCount;
  } catch (error) {
    const errorMsg = `Error processing user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return 0;
  }
}

export async function checkAndSendAlerts(): Promise<{
  processedUsers: number;
  eligibleUsers: number;
  alertsSent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let totalProcessedUsers = 0;
  let totalEligibleUsers = 0;
  let totalAlertsSent = 0;
  const pageSize = 200; // A reasonable page size
  let offset = 0;
  let hasMore = true;

  while(hasMore) {
    try {
      console.log(`Fetching users from Clerk API with offset: ${offset}`);
      const response = await clerkClient.users.getUserList({ limit: pageSize, offset: offset });
      const userList = response.data;
      const fetchedCount = userList.length;
      totalProcessedUsers += fetchedCount;

      if (fetchedCount === 0) {
        hasMore = false;
        continue;
      }

      // Filter for users who have alerts enabled in their preferences to find eligible users
      const eligibleUsersInPage = userList.filter(user => {
        const prefsRaw = user.privateMetadata?.alertPreferences;
        if (!prefsRaw) return false;
        const preferences = JSON.parse(JSON.stringify(prefsRaw)) as Partial<AlertPreferences>;
        return preferences.alertsEnabled === true && !!preferences.city;
      });
      
      totalEligibleUsers += eligibleUsersInPage.length;

      // Process only eligible users in parallel
      const processingPromises = eligibleUsersInPage.map(user => processUserForAlerts(user, errors));
      const results = await Promise.all(processingPromises);
      const sentInPage = results.reduce((sum, count) => sum + count, 0);
      totalAlertsSent += sentInPage;
      
      // Prepare for next page
      offset += pageSize;
      hasMore = fetchedCount === pageSize;

    } catch (error) {
      const errorMsg = `Failed to fetch or process user list page from Clerk (offset: ${offset}): ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      hasMore = false; // Stop pagination on error to prevent infinite loops
    }
  }

  return { 
    processedUsers: totalProcessedUsers, 
    eligibleUsers: totalEligibleUsers, 
    alertsSent: totalAlertsSent, 
    errors 
  };
}
