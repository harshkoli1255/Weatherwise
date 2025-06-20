
'use server';

import { z } from 'zod';
import type { AlertPreferences, OpenWeatherCurrentAPIResponse, WeatherConditionAlert, WeatherData, WeatherSummaryData } from '@/lib/types';
import { sendEmail } from '@/services/emailService';
import { generateVerificationCode } from '@/lib/utils';
import { format } from 'date-fns';
import { fetchWeatherAndSummaryAction } from '@/app/actions';

const AlertPreferencesSchema = z.object({
  alertsEnabled: z.preprocess(value => value === 'on' || value === true, z.boolean().default(true)),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  city: z.string().min(1, { message: "City name cannot be empty." }).optional().or(z.literal('')),
  notifyExtremeTemp: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  highTempThreshold: z.preprocess(
    val => (val === '' || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number().optional()
  ),
  lowTempThreshold: z.preprocess(
    val => (val === '' || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number().optional()
  ),
  notifyHeavyRain: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyStrongWind: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  windSpeedThreshold: z.preprocess(
    val => (val === '' || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number().optional()
  ),
});

export interface SaveAlertsFormState {
  message: string | null;
  error: boolean;
  fieldErrors?: Partial<Record<keyof AlertPreferences | 'verificationCode', string[] | undefined>>;
  alertsCleared?: boolean;
  verificationSentTo?: string | null;
  generatedCode?: string | null;
  needsVerification?: boolean;
  emailVerified?: boolean;
  verifiedEmailOnSuccess?: string |null;
}

const APP_NAME = "Weatherwise";

// New Email Theme Colors
const EMAIL_PRIMARY_COLOR_HSL = "195 53% 40%"; // Dark Slate Blue/Teal
const EMAIL_ACCENT_COLOR_HSL = "45 86% 60%";   // Golden Yellow
const EMAIL_BODY_BACKGROUND_HSL = "220 10% 92%"; // Muted Blue-Gray for overall email body
const EMAIL_CARD_BACKGROUND_COLOR_HSL = "0 0% 100%"; // White for the content card
const EMAIL_TEXT_COLOR_DARK_HSL = "210 25% 20%"; // Dark Cool Gray
const EMAIL_TEXT_COLOR_LIGHT_HSL = "210 20% 40%"; // Medium Cool Gray
const EMAIL_BORDER_COLOR_HSL = "210 20% 85%"; // Light Cool Gray Border
const EMAIL_ICON_CELL_BACKGROUND_HSL = "195 40% 90%"; // Light version of primary for icon cell

// Sentiment Colors (kept universal)
const GOOD_WEATHER_COLOR = "hsl(120, 60%, 45%)"; // Green
const BAD_WEATHER_COLOR = "hsl(0, 70%, 50%)";   // Red
const NEUTRAL_WEATHER_COLOR_TEXT = `hsl(${EMAIL_TEXT_COLOR_DARK_HSL})`;


const getWeatherIconUrl = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
};


function getBaseEmailHtml(title: string, content: string, preheader?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: hsl(${EMAIL_BODY_BACKGROUND_HSL}); color: hsl(${EMAIL_TEXT_COLOR_DARK_HSL}); line-height: 1.6; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
        .container { max-width: 600px; margin: 20px auto; background-color: hsl(${EMAIL_CARD_BACKGROUND_COLOR_HSL}); padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid hsl(${EMAIL_BORDER_COLOR_HSL}); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid hsl(${EMAIL_BORDER_COLOR_HSL}); margin-bottom: 25px; }
        .header h1 { font-family: 'Inter', sans-serif; font-weight: 700; color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); font-size: 32px; margin:0; letter-spacing: -0.5px; }
        .content { padding: 0; font-size: 17px; font-family: 'Inter', sans-serif; }
        .content p { margin: 0 0 18px 0; }
        .content strong { color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); font-weight: 600; }
        .button-container { text-align: center; margin: 35px 0; }
        .button { display: inline-block; background-color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 17px; font-weight: 500; transition: background-color 0.2s ease-in-out; letter-spacing: 0.5px; font-family: 'Inter', sans-serif; }
        .button:hover { background-color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); filter: brightness(110%); }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid hsl(${EMAIL_BORDER_COLOR_HSL}); font-size: 14px; color: hsl(${EMAIL_TEXT_COLOR_LIGHT_HSL}); margin-top: 30px; font-family: 'Inter', sans-serif;}
        
        .weather-display-main { display: flex; align-items: center; justify-content: space-around; text-align: left; margin-bottom: 25px; padding: 20px; background-color: hsla(${EMAIL_ICON_CELL_BACKGROUND_HSL}, 0.3); border-radius: 10px; }
        .weather-icon-wrapper { background-color: hsl(${EMAIL_ICON_CELL_BACKGROUND_HSL}); border-radius: 50%; padding: 10px; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-right: 20px; }
        .weather-icon { width: 80px; height: 80px; max-width: 80px; max-height: 80px; }
        .weather-temp-details .temperature { font-family: 'Inter', sans-serif; font-size: 48px; font-weight: 700; color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); margin:0; line-height: 1; }
        .weather-temp-details .description { font-size: 18px; color: hsl(${EMAIL_TEXT_COLOR_DARK_HSL}); margin: 5px 0 8px 0; text-transform: capitalize; font-weight: 500; font-family: 'Inter', sans-serif;}
        .weather-temp-details .feels-like { font-size: 16px; color: hsl(${EMAIL_TEXT_COLOR_LIGHT_HSL}); margin:0; font-family: 'Inter', sans-serif;}

        .weather-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; margin-bottom: 25px; }
        .weather-detail-item { background-color: hsla(${EMAIL_BODY_BACKGROUND_HSL}, 0.5); padding: 15px; border-radius: 8px; text-align: center; }
        .weather-detail-item .label { font-size: 14px; color: hsl(${EMAIL_TEXT_COLOR_LIGHT_HSL}); margin-bottom: 5px; display: block; font-family: 'Inter', sans-serif;}
        .weather-detail-item .value { font-size: 19px; font-weight: 600; color: hsl(${EMAIL_TEXT_COLOR_DARK_HSL}); font-family: 'Inter', sans-serif;}

        .ai-summary-box { margin-top: 25px; padding: 20px; background-color: hsla(${EMAIL_BODY_BACKGROUND_HSL}, 0.6); border-radius: 8px; border: 1px solid hsl(${EMAIL_BORDER_COLOR_HSL}); }
        .ai-summary-box .summary-title { font-family: 'Inter', sans-serif; font-weight: 700; color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); margin:0 0 10px 0; font-size: 19px;}
        .ai-summary-box p.summary-text { margin: 0; font-size: 16px; line-height: 1.7; font-family: 'Inter', sans-serif; font-weight: 600; }
        
        .alert-highlight { color: hsl(${EMAIL_ACCENT_COLOR_HSL}); font-weight: bold; font-size: 22px; margin-bottom: 12px !important; text-align: center; font-family: 'Inter', sans-serif; font-weight: 700; text-shadow: 0px 1px 2px hsla(0, 0%, 0%, 0.3); }
        .threshold-info { font-size: 15px; color: hsl(${EMAIL_TEXT_COLOR_LIGHT_HSL}); margin-top: 5px; text-align:center; margin-bottom: 18px; font-family: 'Inter', sans-serif;}
        ul.preferences-list { margin: 18px 0; padding-left: 25px; list-style-type: disc; font-family: 'Inter', sans-serif;}
        ul.preferences-list li { margin-bottom: 10px; font-size: 16px;}
        ul.preferences-list strong { font-weight: 600; color: hsl(${EMAIL_TEXT_COLOR_DARK_HSL}); }
      </style>
    </head>
    <body>
      ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
      <div class="container">
        <div class="header"><h1>${APP_NAME}</h1></div>
        <div class="content">${content}</div>
        <div class="footer">Thank you for using ${APP_NAME}! If you did not request this, please ignore.</div>
      </div>
    </body>
    </html>
  `;
}

const sendWeatherAlertEmail = async (email: string, weatherData: WeatherSummaryData, alertInfo: WeatherConditionAlert) => {
  const subject = `Weather Alert: ${alertInfo.type} in ${weatherData.city}`;
  const iconUrl = getWeatherIconUrl(weatherData.iconCode);
  const preheader = `${alertInfo.type} detected in ${weatherData.city}. Current temp: ${weatherData.temperature}°C.`;

  let customThresholdsText = '';
  if (alertInfo.customThresholds) {
    if (alertInfo.type === 'Extreme Temperature') {
      customThresholdsText = `<p class="threshold-info">Triggered by: Temp ${weatherData.temperature}°C (Thresholds: High > ${alertInfo.customThresholds.highTemp ?? 'N/A'}°C, Low < ${alertInfo.customThresholds.lowTemp ?? 'N/A'}°C)</p>`;
    } else if (alertInfo.type === 'Strong Wind') {
      customThresholdsText = `<p class="threshold-info">Triggered by: Wind ${weatherData.windSpeed} km/h (Threshold: > ${alertInfo.customThresholds.windSpeed ?? 'N/A'} km/h)</p>`;
    }
  }

  let aiSummaryStyle = `color: ${NEUTRAL_WEATHER_COLOR_TEXT}; font-family: 'Inter', sans-serif; font-weight: 600;`;
  if (weatherData.weatherSentiment === 'good') {
    aiSummaryStyle = `color: ${GOOD_WEATHER_COLOR}; font-family: 'Inter', sans-serif; font-weight: 600;`;
  } else if (weatherData.weatherSentiment === 'bad') {
    aiSummaryStyle = `color: ${BAD_WEATHER_COLOR}; font-family: 'Inter', sans-serif; font-weight: 600;`;
  }

  const content = `
    <p>Hello,</p>
    <p>This is a weather alert from <strong>${APP_NAME}</strong> for <strong>${weatherData.city}</strong>.</p>
    <p class="alert-highlight">${alertInfo.type}</p>
    <p style="text-align:center; margin-bottom: 10px; font-family: 'Inter', sans-serif; font-size: 17px;"><strong>Details:</strong> ${alertInfo.details}</p>
    ${customThresholdsText}

    <div class="weather-display-main">
      <div class="weather-icon-wrapper">
        <img src="${iconUrl}" alt="${weatherData.description} icon" class="weather-icon" width="80" height="80" data-ai-hint="weather condition">
      </div>
      <div class="weather-temp-details">
        <p class="temperature">${weatherData.temperature}°C</p>
        <p class="description">${weatherData.description}</p>
        <p class="feels-like">Feels like: ${weatherData.feelsLike}°C</p>
      </div>
    </div>

    <div class="weather-details-grid">
      <div class="weather-detail-item"><span class="label">Humidity</span><span class="value">${weatherData.humidity}%</span></div>
      <div class="weather-detail-item"><span class="label">Wind Speed</span><span class="value">${weatherData.windSpeed} km/h</span></div>
    </div>
    
    ${weatherData.aiSummary ? `
    <div class="ai-summary-box">
      <p class="summary-title">AI Weather Summary</p>
      <p class="summary-text" style="${aiSummaryStyle}">${weatherData.aiSummary}</p>
    </div>
    ` : ''}

    <p style="margin-top:25px; font-family: 'Inter', sans-serif; font-size: 17px;">Please take necessary precautions.</p>
    <div class="button-container">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}" class="button">View Dashboard</a>
    </div>
  `;
  const html = getBaseEmailHtml(`Weather Alert: ${alertInfo.type} - ${weatherData.city}`, content, preheader);
  return sendEmail({ to: email, subject, html });
};


// Default thresholds if not set by user
const DEFAULT_HIGH_TEMP_THRESHOLD = 32;
const DEFAULT_LOW_TEMP_THRESHOLD = 5;
const DEFAULT_WIND_SPEED_THRESHOLD = 35; // km/h

async function checkAndSendLiveWeatherAlerts(preferences: AlertPreferences) {
  if (!preferences.email || !preferences.city || !preferences.alertsEnabled) {
    return;
  }
  if (!preferences.notifyExtremeTemp && !preferences.notifyHeavyRain && !preferences.notifyStrongWind) {
    return;
  }
  
  const weatherResult = await fetchWeatherAndSummaryAction({ city: preferences.city });

  if (weatherResult.error || !weatherResult.data) {
    console.log(`Could not fetch full weather data for ${preferences.city} to check live alerts. Error: ${weatherResult.error}`);
    return;
  }
  const currentWeatherData = weatherResult.data;


  const temp = currentWeatherData.temperature;
  const windSpeedKmh = currentWeatherData.windSpeed;
  const weatherConditionMain = currentWeatherData.condition.toLowerCase();
  const weatherDescription = currentWeatherData.description.toLowerCase();

  const highTempThreshold = preferences.highTempThreshold ?? DEFAULT_HIGH_TEMP_THRESHOLD;
  const lowTempThreshold = preferences.lowTempThreshold ?? DEFAULT_LOW_TEMP_THRESHOLD;
  const windSpeedThreshold = preferences.windSpeedThreshold ?? DEFAULT_WIND_SPEED_THRESHOLD;

  const alertDetails: WeatherConditionAlert['customThresholds'] = {
      highTemp: highTempThreshold,
      lowTemp: lowTempThreshold,
      windSpeed: windSpeedThreshold,
  };

  if (preferences.notifyExtremeTemp) {
    if (temp > highTempThreshold) {
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C, which is above your high threshold of ${highTempThreshold}°C.`, customThresholds: alertDetails });
    } else if (temp < lowTempThreshold) {
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C, which is below your low threshold of ${lowTempThreshold}°C.`, customThresholds: alertDetails });
    }
  }
  if (preferences.notifyHeavyRain) {
    if (weatherConditionMain === 'rain' && (weatherDescription.includes('heavy') || weatherDescription.includes('extreme') || weatherDescription.includes('torrential') || weatherDescription.includes('very heavy'))) {
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Heavy Rain', details: `Heavy rain detected: ${currentWeatherData.description}.`, customThresholds: alertDetails });
    }
  }
  if (preferences.notifyStrongWind) {
    if (windSpeedKmh > windSpeedThreshold) {
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Strong Wind', details: `Strong winds detected at ${windSpeedKmh} km/h, exceeding your threshold of ${windSpeedThreshold} km/h.`, customThresholds: alertDetails });
    }
  }
}


export async function saveAlertPreferencesAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const rawData = {
    alertsEnabled: formData.get('alertsEnabled'),
    email: formData.get('email'),
    city: formData.get('city'),
    notifyExtremeTemp: formData.get('notifyExtremeTemp'),
    highTempThreshold: formData.get('highTempThreshold'),
    lowTempThreshold: formData.get('lowTempThreshold'),
    notifyHeavyRain: formData.get('notifyHeavyRain'),
    notifyStrongWind: formData.get('notifyStrongWind'),
    windSpeedThreshold: formData.get('windSpeedThreshold'),
  };
  const isAlreadyVerifiedClientHint = formData.get('isAlreadyVerified') === 'true';

  const validationResult = AlertPreferencesSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Partial<Record<keyof AlertPreferences, string[] | undefined>>;
    return {
      message: "Please correct the errors in the form.",
      error: true,
      fieldErrors: fieldErrors,
      verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
    };
  }

  const preferences = validationResult.data;
  const emailToUse = preferences.email?.toLowerCase();

  if (!preferences.alertsEnabled || !emailToUse) {
    const preheader = "Your Weatherwise alert preferences have been updated.";
    const content = `
        <p>Hello,</p>
        <p>Your weather alert preferences with ${APP_NAME} have been updated.</p>
        <p><strong>Alerts are currently disabled.</strong></p>
        <p>If you wish to re-enable alerts or change your settings, please visit the Weatherwise app.</p>
        <div class="button-container">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/alerts" class="button">Manage Alerts</a>
        </div>
    `;
    const html = getBaseEmailHtml("Weather Alerts Disabled", content, preheader);
    if (emailToUse) {
        await sendEmail({
            to: emailToUse,
            subject: "Weatherwise Alerts Disabled",
            html: html,
        });
    }
    console.log("Disabling alert preferences due to alertsEnabled=false or empty email.");
    return {
      message: "Weather alerts have been disabled. A notification has been sent if an email was provided.",
      error: false,
      alertsCleared: true,
      verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
    };
  }

  if (!preferences.city) {
    return {
        message: "Please correct the errors in the form.",
        error: true,
        fieldErrors: { city: ["City name is required to enable alerts."] },
        verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
    };
  }

  if (isAlreadyVerifiedClientHint && emailToUse) {
    try {
      console.log("Saving alert preferences for already verified email:", preferences);

      let conditionsHtmlList = [];
      if (preferences.notifyExtremeTemp) {
        conditionsHtmlList.push(`<li><strong>Extreme Temperatures:</strong> High > ${preferences.highTempThreshold ?? DEFAULT_HIGH_TEMP_THRESHOLD}°C, Low < ${preferences.lowTempThreshold ?? DEFAULT_LOW_TEMP_THRESHOLD}°C</li>`);
      }
      if (preferences.notifyHeavyRain) {
        conditionsHtmlList.push(`<li><strong>Heavy Rain:</strong> Based on intensity description</li>`);
      }
      if (preferences.notifyStrongWind) {
        conditionsHtmlList.push(`<li><strong>Strong Winds:</strong> Speed > ${preferences.windSpeedThreshold ?? DEFAULT_WIND_SPEED_THRESHOLD} km/h</li>`);
      }

      const noConditionsSelected = conditionsHtmlList.length === 0;
      const conditionsHtml = conditionsHtmlList.length > 0 ? `<ul class="preferences-list">${conditionsHtmlList.join('')}</ul>` : (noConditionsSelected ? '<p>You have not selected any specific conditions for notifications, but general alerts for your city are enabled.</p>' : '');

      const preheader = `Alert preferences updated for ${preferences.city}.`;
      const confirmationContent = `
        <p>Hello,</p>
        <p>Your weather alert preferences for <strong>${preferences.city}</strong> have been successfully updated with ${APP_NAME}.</p>
        <p>You are set to receive alerts for the following conditions:</p>
        ${conditionsHtml}
        <p>If you wish to change these alerts, you can update your preferences on the Weatherwise app.</p>
        <div class="button-container">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/alerts" class="button">Update Preferences</a>
        </div>
      `;
      const confirmationHtml = getBaseEmailHtml(`Weather Alert Preferences Updated for ${preferences.city}`, confirmationContent, preheader);

      const emailResult = await sendEmail({
        to: emailToUse,
        subject: `Weather Alert Preferences Updated for ${preferences.city}`,
        html: confirmationHtml,
      });

      await checkAndSendLiveWeatherAlerts(preferences);

      if (emailResult.success) {
        return {
          message: `Alert preferences saved for ${preferences.city}! A confirmation email has been sent to ${emailToUse}. Current weather conditions were also checked for immediate alerts.`,
          error: false,
          emailVerified: true,
          verifiedEmailOnSuccess: emailToUse,
        };
      } else {
        let finalMessage = `Alert preferences saved for ${preferences.city}, but we couldn't send a confirmation email.`;
        if (emailResult.error === 'Email server not configured. Please set GOOGLE_SMTP_USER and GOOGLE_SMTP_PASSWORD in your .env file.') {
          finalMessage = `Alert preferences saved for ${preferences.city}, but: ${emailResult.error}`;
        } else if (emailResult.error) {
            finalMessage += ` Reason: ${emailResult.error}.`;
        } else {
            finalMessage += ` An unknown error occurred during email sending.`;
        }
        finalMessage += " Current weather conditions were still checked for alerts."
        return { message: finalMessage, error: true, emailVerified: true, verifiedEmailOnSuccess: emailToUse };
      }
    } catch (e) {
      console.error("Error saving alert preferences or sending email:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      return { message: `Failed to save alert preferences: ${errorMessage}`, error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess };
    }
  } else if (emailToUse) {
    const verificationCode = generateVerificationCode();
    const preheader = `Your ${APP_NAME} verification code is ${verificationCode}.`;
    const verificationContent = `
      <p>Hello,</p>
      <p>Thank you for setting up weather alerts with ${APP_NAME} for the city: <strong>${preferences.city}</strong>.</p>
      <p>Your verification code is: <strong style="font-size: 28px; color: hsl(${EMAIL_PRIMARY_COLOR_HSL}); letter-spacing: 3px; display:block; text-align:center; margin: 20px 0; font-weight: 700; font-family: 'Inter', sans-serif;">${verificationCode}</strong></p>
      <p>Please enter this code on the Weatherwise alerts page to activate your notifications.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;
    const verificationHtml = getBaseEmailHtml("Verify Your Email for Weatherwise Alerts", verificationContent, preheader);

    try {
      const emailResult = await sendEmail({
        to: emailToUse,
        subject: `Verify Your Email for ${APP_NAME} Alerts`,
        html: verificationHtml,
      });

      if (emailResult.success) {
        return {
          message: `A verification code has been sent to ${emailToUse}. Please enter it below.`,
          error: false,
          verificationSentTo: emailToUse,
          generatedCode: verificationCode,
          needsVerification: true,
          verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
        };
      } else {
         let finalMessage = `We couldn't send a verification email to ${emailToUse}.`;
         if (emailResult.error === 'Email server not configured. Please set GOOGLE_SMTP_USER and GOOGLE_SMTP_PASSWORD in your .env file.') {
            finalMessage = `We couldn't send a verification email: ${emailResult.error}`;
        } else if (emailResult.error) {
            finalMessage += ` Reason: ${emailResult.error}`;
        } else {
            finalMessage += ` An unknown error occurred during email sending.`;
        }
        return { message: finalMessage, error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess };
      }
    } catch (e) {
      console.error("Error sending verification email:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      return { message: `Failed to send verification email: ${errorMessage}`, error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess };
    }
  }
  return { message: "An unexpected error occurred. Email address or city might be missing.", error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess };
}


const VerifyCodeSchema = z.object({
  email: z.string().email(),
  verificationCode: z.string().length(6, { message: "Verification code must be 6 digits." }),
  expectedCode: z.string().length(6),
  city: z.string(),
  alertsEnabled: z.preprocess(value => value === 'on' || value === true, z.boolean()),
  notifyExtremeTemp: z.preprocess(value => value === 'on' || value === true, z.boolean()),
  highTempThreshold: z.preprocess(
    val => (val === '' || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number().optional()
  ),
  lowTempThreshold: z.preprocess(
    val => (val === '' || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number().optional()
  ),
  notifyHeavyRain: z.preprocess(value => value === 'on' || value === true, z.boolean()),
  notifyStrongWind: z.preprocess(value => value === 'on' || value === true, z.boolean()),
  windSpeedThreshold: z.preprocess(
    val => (val === '' || val === null || val === undefined) ? undefined : parseFloat(String(val)),
    z.number().optional()
  ),
});

export async function verifyCodeAction(
  prevState: SaveAlertsFormState,
  formData: FormData
): Promise<SaveAlertsFormState> {
  const rawData = {
    email: formData.get('email'),
    verificationCode: formData.get('verificationCode'),
    expectedCode: formData.get('expectedCode'),
    city: formData.get('city'),
    alertsEnabled: formData.get('alertsEnabled'),
    notifyExtremeTemp: formData.get('notifyExtremeTemp'),
    highTempThreshold: formData.get('highTempThreshold'),
    lowTempThreshold: formData.get('lowTempThreshold'),
    notifyHeavyRain: formData.get('notifyHeavyRain'),
    notifyStrongWind: formData.get('notifyStrongWind'),
    windSpeedThreshold: formData.get('windSpeedThreshold'),
  };

  const validationResult = VerifyCodeSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Partial<Record<keyof typeof rawData, string[] | undefined>>;
    return {
      ...prevState,
      message: "Invalid verification data. Ensure code is 6 digits and all preference data is present.",
      error: true,
      fieldErrors: fieldErrors,
      needsVerification: true,
    };
  }

  const { email, verificationCode, expectedCode, ...prefsData } = validationResult.data;

  const preferences: AlertPreferences = {
      email: email,
      city: prefsData.city,
      alertsEnabled: prefsData.alertsEnabled,
      notifyExtremeTemp: prefsData.notifyExtremeTemp,
      highTempThreshold: prefsData.highTempThreshold,
      lowTempThreshold: prefsData.lowTempThreshold,
      notifyHeavyRain: prefsData.notifyHeavyRain,
      notifyStrongWind: prefsData.notifyStrongWind,
      windSpeedThreshold: prefsData.windSpeedThreshold,
  };


  if (verificationCode === expectedCode) {
    let conditionsHtmlList = [];
    if (preferences.notifyExtremeTemp) {
      conditionsHtmlList.push(`<li><strong>Extreme Temperatures:</strong> High > ${preferences.highTempThreshold ?? DEFAULT_HIGH_TEMP_THRESHOLD}°C, Low < ${preferences.lowTempThreshold ?? DEFAULT_LOW_TEMP_THRESHOLD}°C</li>`);
    }
    if (preferences.notifyHeavyRain) {
      conditionsHtmlList.push(`<li><strong>Heavy Rain:</strong> Based on intensity description</li>`);
    }
    if (preferences.notifyStrongWind) {
      conditionsHtmlList.push(`<li><strong>Strong Winds:</strong> Speed > ${preferences.windSpeedThreshold ?? DEFAULT_WIND_SPEED_THRESHOLD} km/h</li>`);
    }

    const noConditionsSelected = conditionsHtmlList.length === 0;
    const conditionsHtml = conditionsHtmlList.length > 0 ? `<ul class="preferences-list">${conditionsHtmlList.join('')}</ul>` : (noConditionsSelected ? '<p>You have not selected any specific conditions for notifications, but general alerts for your city are enabled.</p>' : '');

    const preheader = `Email verified! Weather alerts for ${preferences.city} are now active.`;
    const emailContent = `
      <p>Hello,</p>
      <p>Your email <strong>${email}</strong> has been successfully verified for ${APP_NAME} alerts for the city: <strong>${preferences.city}</strong>.</p>
      <p>Your alert preferences are now active. You are set to receive alerts for the following conditions:</p>
      ${conditionsHtml}
      <div class="button-container">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/alerts" class="button">Manage Preferences</a>
      </div>
    `;
    const emailHtml = getBaseEmailHtml(`Email Verified - Weather Alerts Active for ${preferences.city}`, emailContent, preheader);
    try {
        await sendEmail({to: email, subject: `Email Verified - ${APP_NAME} Alerts Active for ${preferences.city}`, html: emailHtml});
        await checkAndSendLiveWeatherAlerts(preferences);
    } catch (e) {
        console.error("Failed to send post-verification confirmation email or live alert:", e);
    }

    return {
      message: `Email ${email} verified successfully! Alerts are now active for ${preferences.city}. Current weather conditions were also checked for immediate alerts.`,
      error: false,
      emailVerified: true,
      verifiedEmailOnSuccess: email.toLowerCase(),
      verificationSentTo: null,
      generatedCode: null,
      needsVerification: false,
    };
  } else {
    return {
      ...prevState,
      message: "Invalid verification code. Please try again.",
      error: true,
      fieldErrors: { verificationCode: ["Incorrect code."] },
      needsVerification: true,
      verificationSentTo: prevState.verificationSentTo || email,
      generatedCode: prevState.generatedCode || expectedCode,
    };
  }
}


export async function sendTestEmailAction(
  prevState: { message: string | null, error: boolean },
  formData: FormData
): Promise<{ message: string | null, error: boolean }> {
  const email = formData.get('email') as string;
  const city = formData.get('city') as string | null;

  const highTempThresholdString = formData.get('highTempThreshold') as string | null;
  const lowTempThresholdString = formData.get('lowTempThreshold') as string | null;
  const windSpeedThresholdString = formData.get('windSpeedThreshold') as string | null;

  const highTempThreshold = highTempThresholdString && highTempThresholdString !== '' ? parseFloat(highTempThresholdString) : DEFAULT_HIGH_TEMP_THRESHOLD;
  const lowTempThreshold = lowTempThresholdString && lowTempThresholdString !== '' ? parseFloat(lowTempThresholdString) : DEFAULT_LOW_TEMP_THRESHOLD;
  const windSpeedThreshold = windSpeedThresholdString && windSpeedThresholdString !== '' ? parseFloat(windSpeedThresholdString) : DEFAULT_WIND_SPEED_THRESHOLD;


  const emailValidation = z.string().email({ message: "Invalid email address provided for test." }).safeParse(email);
  if (!emailValidation.success) {
    return { message: emailValidation.error.errors[0].message, error: true };
  }
  const validatedEmail = emailValidation.data.toLowerCase();

  let emailTitle = `${APP_NAME} Test Email`;
  let preheader = `This is a test email from ${APP_NAME}.`;
  let testContent = `
    <p>Hello from ${APP_NAME}!</p>
    <p>This is a test email to confirm that your email settings are working correctly with the Weatherwise application.</p>
  `;

  if (city) {
    emailTitle = `${APP_NAME} Test Weather Report for ${city}`;
    const weatherResult = await fetchWeatherAndSummaryAction({ city });
    
    if (weatherResult.data) {
      const weatherData = weatherResult.data;
      const iconUrl = getWeatherIconUrl(weatherData.iconCode); 
      preheader = `Test weather report for ${city}: ${weatherData.temperature}°C, ${weatherData.description}.`;

      let aiSummaryStyle = `color: ${NEUTRAL_WEATHER_COLOR_TEXT}; font-family: 'Inter', sans-serif; font-weight: 600;`;
      if (weatherData.weatherSentiment === 'good') {
        aiSummaryStyle = `color: ${GOOD_WEATHER_COLOR}; font-family: 'Inter', sans-serif; font-weight: 600;`;
      } else if (weatherData.weatherSentiment === 'bad') {
        aiSummaryStyle = `color: ${BAD_WEATHER_COLOR}; font-family: 'Inter', sans-serif; font-weight: 600;`;
      }

      testContent = `
        <p>Hello,</p>
        <p>This is a <strong>test weather report</strong> from ${APP_NAME}, simulating an alert for <strong>${weatherData.city}, ${weatherData.country}</strong>.</p>
        
        <div class="weather-display-main">
          <div class="weather-icon-wrapper">
            <img src="${iconUrl}" alt="${weatherData.description} icon" class="weather-icon" width="80" height="80" data-ai-hint="weather condition">
          </div>
          <div class="weather-temp-details">
            <p class="temperature">${weatherData.temperature}°C</p>
            <p class="description">${weatherData.description}</p>
            <p class="feels-like">Feels like: ${weatherData.feelsLike}°C</p>
          </div>
        </div>

        <div class="weather-details-grid">
            <div class="weather-detail-item"><span class="label">Humidity</span><span class="value">${weatherData.humidity}%</span></div>
            <div class="weather-detail-item"><span class="label">Wind Speed</span><span class="value">${weatherData.windSpeed} km/h</span></div>
        </div>

        ${weatherData.aiSummary ? `
        <div class="ai-summary-box">
          <p class="summary-title">AI Weather Summary</p>
          <p class="summary-text" style="${aiSummaryStyle}">${weatherData.aiSummary}</p>
        </div>
        ` : ''}

        <p style="margin-top: 25px;">This is only a test. If this were a real alert, it would specify the condition that triggered it based on your preferences, for example:</p>
        <ul class="preferences-list">
          <li><strong>Extreme Temperatures:</strong> High > ${highTempThreshold}°C, Low < ${lowTempThreshold}°C</li>
          <li><strong>Heavy Rain:</strong> Based on intensity description</li>
          <li><strong>Strong Winds:</strong> Speed > ${windSpeedThreshold} km/h</li>
        </ul>
      `;
    } else {
      testContent += `<p style="margin-top:15px;">We attempted to fetch current weather for <strong>${city}</strong> to include in this test, but could not retrieve the data. Error: ${weatherResult.error}</p>`;
    }
  } else {
     testContent += `<p style="margin-top:15px;">To see a more detailed test email with live weather data, please enter a city name in the alerts form before sending a test.</p>`;
  }
  testContent += `<p style="margin-top:25px;">If you received this, congratulations! Your email service seems to be configured correctly.</p>
                  <div class="button-container">
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}" class="button">Visit Weatherwise</a>
                  </div>`;

  const emailHtml = getBaseEmailHtml(emailTitle, testContent, preheader);

  try {
    const emailResult = await sendEmail({
      to: validatedEmail,
      subject: emailTitle,
      html: emailHtml,
    });

    if (emailResult.success) {
      return { message: `Test email simulating an alert successfully sent to ${validatedEmail}.`, error: false };
    } else {
      let finalMessage = `Failed to send test email to ${validatedEmail}.`;
      if (emailResult.error === 'Email server not configured. Please set GOOGLE_SMTP_USER and GOOGLE_SMTP_PASSWORD in your .env file.') {
          finalMessage = `Failed to send test email: ${emailResult.error}`;
      } else if (emailResult.error) {
          finalMessage += ` Reason: ${emailResult.error}`;
      }
      return { message: finalMessage, error: true };
    }
  } catch (e) {
    console.error("Error sending test email:", e);
    const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
    return { message: `Failed to send test email: ${errorMessage}`, error: true };
  }
}

    
