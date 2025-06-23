
'use server';

import { clerkClient } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/api';
import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';
import { fetchWeatherAndSummaryAction } from '@/app/actions';
import { sendEmail } from '@/services/emailService';
import { generateWeatherAlertEmailHtml } from '@/lib/email-templates';
import { shouldSendWeatherAlert } from '@/ai/flows/alert-decision';

function isTimeInSchedule(preferences: AlertPreferences): boolean {
  const schedule = preferences.schedule;
  if (!schedule || !schedule.enabled) {
    return true; // Schedule is not enabled, so time is always valid.
  }

  const userTimezone = preferences.timezone;
  if (!userTimezone) {
      console.log(`[Alerts] User ${preferences.email} has schedule enabled but no timezone set. Bypassing schedule check.`);
      return true; // Failsafe if timezone isn't set, though form validation should prevent this.
  }

  try {
    const now = new Date();

    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, weekday: 'long' });
    const dayName = dayFormatter.format(now);
    const daysMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    const localDay = daysMap[dayName];

    const hourFormatter = new Intl.DateTimeFormat('en-US', { timeZone: userTimezone, hour: 'numeric', hourCycle: 'h23' });
    const localHour = parseInt(hourFormatter.format(now), 10);
    
    if (localDay === undefined || isNaN(localHour)) {
        console.error(`[Alerts] Could not parse day/hour for timezone '${userTimezone}' (user: ${preferences.email}). Bypassing schedule check.`);
        return true;
    }
    
    console.log(`[Alerts] Schedule check for ${preferences.email}: Current time in ${userTimezone} is Day ${localDay}, Hour ${localHour}.`);

    if (!schedule.days.includes(localDay)) {
      console.log(`[Alerts] User ${preferences.email} is outside of active days.`);
      return false; // Not an active day.
    }

    const { startHour, endHour } = schedule;
    if (startHour <= endHour) {
      // Standard day schedule (e.g., 8 AM to 10 PM)
      return localHour >= startHour && localHour <= endHour;
    } else {
      // Overnight schedule (e.g., 10 PM to 6 AM)
      return localHour >= startHour || localHour <= endHour;
    }
  } catch (err) {
      console.error(`[Alerts] Invalid timezone '${userTimezone}' for user ${preferences.email}. Bypassing schedule check. Error:`, err);
      return true; // Failsafe
  }
}

function shouldSendBasedOnFrequency(preferences: AlertPreferences): { shouldSend: boolean; hoursSinceLastAlert?: number } {
    const frequency = preferences.notificationFrequency ?? 'balanced';
    if (frequency === 'everyHour') {
        return { shouldSend: true }; // Always send if conditions are met
    }

    const lastSentTimestamp = preferences.lastAlertSentTimestamp ?? 0;
    const hoursSinceLastAlert = (Date.now() - lastSentTimestamp) / (1000 * 60 * 60);

    if (frequency === 'balanced') {
        return { shouldSend: hoursSinceLastAlert >= 4, hoursSinceLastAlert };
    }

    if (frequency === 'oncePerDay') {
        return { shouldSend: hoursSinceLastAlert >= 24, hoursSinceLastAlert };
    }

    return { shouldSend: true }; // Default to sending
}

export async function processUserForAlerts(user: User, errors: string[]): Promise<number> {
  let alertsSentCount = 0;
  const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

  try {
    const prefsRaw = user.privateMetadata?.alertPreferences;
    if (!prefsRaw) return 0; // No preferences set

    const preferences = JSON.parse(JSON.stringify(prefsRaw)) as AlertPreferences;
    
    if (!preferences.alertsEnabled || !preferences.city || !email) {
      // User has not fully opted in, skip silently.
      return 0;
    }

    console.log(`[Alerts] Processing user ${user.id} (${email}) for city "${preferences.city}".`);

    // Step 1: Fetch Weather
    const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });
    if (weatherResult.error || !weatherResult.data) {
      console.warn(`[Alerts] Could not fetch weather for ${preferences.city} (user: ${user.id}). Skipping. Error: ${weatherResult.error}`);
      return 0;
    }
    const weatherData = weatherResult.data;
    console.log(`[Alerts] Weather fetched for ${preferences.city}: ${weatherData.temperature}°C, ${weatherData.description}.`);

    // Step 2: Check Custom Schedule
    if (!isTimeInSchedule(preferences)) {
      console.log(`[Alerts] Skipping user ${user.id}: Outside of defined schedule.`);
      return 0;
    }
    console.log(`[Alerts] User ${user.id} is within their schedule.`);


    // Step 3: AI Decides if Weather is "Significant"
    const decisionResult = await shouldSendWeatherAlert({
      city: weatherData.city,
      temperature: weatherData.temperature,
      feelsLike: weatherData.feelsLike,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      condition: weatherData.condition,
      description: weatherData.description,
    });
    console.log(`[Alerts] AI decision for ${user.id}: shouldSendAlert=${decisionResult.shouldSendAlert}. Reason: "${decisionResult.reason}"`);


    if (decisionResult.shouldSendAlert) {
      // Step 4: Check Alert Sensitivity (Frequency)
      const frequencyCheck = shouldSendBasedOnFrequency(preferences);
      if (!frequencyCheck.shouldSend) {
          console.log(`[Alerts] Skipping user ${user.id} due to frequency setting (last alert sent ${frequencyCheck.hoursSinceLastAlert?.toFixed(1)} hours ago).`);
          return 0;
      }
      console.log(`[Alerts] Frequency check passed for user ${user.id}.`);

      // All checks passed. Send the email.
      const alertTriggers = [decisionResult.reason];
      console.log(`[Alerts] All checks passed. Sending alert to ${email} for city ${preferences.city}.`);
      
      const emailHtml = generateWeatherAlertEmailHtml({ weatherData, alertTriggers });
      const emailSubject = weatherData.aiSubject;

      const emailResult = await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
      });

      if (emailResult.success) {
        alertsSentCount++;
        // Update the timestamp in user metadata
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
        const errorMsg = `[Alerts] Failed to send email to ${email}: ${emailResult.error}`;
        console.error(errorMsg);
        errors.push(emailResult.error || 'Unknown email error');
      }
    }
    return alertsSentCount;
  } catch (error) {
    const errorMsg = `[Alerts] Critical error processing user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
  const pageSize = 50; // A safe page size for Clerk API
  let offset = 0;
  let hasMore = true;

  console.log(`[CRON] Starting hourly alert check...`);

  while(hasMore) {
    try {
      console.log(`[CRON] Fetching users from Clerk API with offset: ${offset}`);
      const userList = await clerkClient.users.getUserList({ limit: pageSize, offset: offset });
      const fetchedCount = userList.length;
      totalProcessedUsers += fetchedCount;

      if (fetchedCount === 0) {
        hasMore = false;
        continue;
      }

      const eligibleUsersInPage = userList.filter(user => {
        const prefsRaw = user.privateMetadata?.alertPreferences;
        if (!prefsRaw) return false;
        const preferences = JSON.parse(JSON.stringify(prefsRaw)) as Partial<AlertPreferences>;
        return preferences.alertsEnabled === true && !!preferences.city;
      });
      
      totalEligibleUsers += eligibleUsersInPage.length;

      if (eligibleUsersInPage.length > 0) {
        console.log(`[CRON] Found ${eligibleUsersInPage.length} eligible users in this page. Processing...`);
        const processingPromises = eligibleUsersInPage.map(user => processUserForAlerts(user, errors));
        const results = await Promise.all(processingPromises);
        const sentInPage = results.reduce((sum, count) => sum + count, 0);
        totalAlertsSent += sentInPage;
      }
      
      offset += pageSize;
      hasMore = fetchedCount === pageSize;

    } catch (error) {
      const errorMsg = `[CRON] Failed to fetch or process user list page from Clerk (offset: ${offset}): ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      hasMore = false; // Stop pagination on error
    }
  }

  console.log(`[CRON] Hourly alert check finished. Processed: ${totalProcessedUsers}, Eligible: ${totalEligibleUsers}, Sent: ${totalAlertsSent}, Errors: ${errors.length}`);
  return { 
    processedUsers: totalProcessedUsers, 
    eligibleUsers: totalEligibleUsers, 
    alertsSent: totalAlertsSent, 
    errors 
  };
}
