
'use server';

import type { AlertPreferences, WeatherSummaryData } from '@/lib/types';

/**
 * This service is disabled as per user request to remove cron-based scheduling.
 * The functions here are no longer used for automatic alert processing.
 */
export async function checkAndSendAlerts(): Promise<{
  processedUsers: number;
  eligibleUsers: number;
  alertsSent: number;
  errors: string[];
}> {
  console.warn("checkAndSendAlerts was called, but automatic alert processing is disabled.");
  return {
    processedUsers: 0,
    eligibleUsers: 0,
    alertsSent: 0,
    errors: ["Automatic alert processing has been disabled."],
  };
}

/**
 * This function is kept for logic reference but is not actively used by the disabled cron service.
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
    if (weatherData.condition.toLowerCase().includes('rain')) {
      triggered.push(`Rain is currently forecasted.`);
    }
  }

  return triggered;
}
