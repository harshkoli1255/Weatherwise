
'use server';

import { z } from 'zod';
import type { AlertPreferences, OpenWeatherCurrentAPIResponse, WeatherConditionAlert, WeatherData } from '@/lib/types';
import { sendEmail } from '@/services/emailService';
import { generateVerificationCode } from '@/lib/utils';
import { format } from 'date-fns';

const AlertPreferencesSchema = z.object({
  alertsEnabled: z.preprocess(value => value === 'on' || value === true, z.boolean().default(true)),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  city: z.string().min(1, { message: "City name cannot be empty." }).optional().or(z.literal('')),
  notifyExtremeTemp: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyHeavyRain: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
  notifyStrongWind: z.preprocess(value => value === 'on' || value === true, z.boolean().default(false)),
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

// --- Enhanced Email HTML Generation ---

const APP_NAME = "Weatherwise";
const PRIMARY_COLOR = "#2563EB"; // Blue-600 from Tailwind default (example)
const ACCENT_COLOR = "#F97316"; // Orange-500 (example)
const TEXT_COLOR_DARK = "#1F2937"; // Gray-800
const TEXT_COLOR_LIGHT = "#4B5563"; // Gray-600
const BACKGROUND_COLOR_LIGHT = "#F9FAFB"; // Gray-50
const CARD_BACKGROUND_COLOR = "#FFFFFF";

function getBaseEmailHtml(title: string, content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background-color: ${BACKGROUND_COLOR_LIGHT}; color: ${TEXT_COLOR_DARK}; }
        .container { max-width: 600px; margin: 20px auto; background-color: ${CARD_BACKGROUND_COLOR}; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #E5E7EB; }
        .header h1 { color: ${PRIMARY_COLOR}; font-size: 28px; margin:0; }
        .content { padding: 20px 0; font-size: 16px; line-height: 1.6; }
        .content p { margin: 10px 0; }
        .content strong { color: ${PRIMARY_COLOR}; }
        .button { display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-size: 16px; text-align: center; }
        .footer { text-align: center; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: ${TEXT_COLOR_LIGHT}; }
        .weather-icon { vertical-align: middle; margin-right: 8px; }
        .weather-details { margin-top: 15px; padding: 15px; background-color: ${BACKGROUND_COLOR_LIGHT}; border-radius: 6px; }
        .weather-details p { margin: 5px 0; }
        .alert-highlight { color: ${ACCENT_COLOR}; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>${APP_NAME}</h1></div>
        <div class="content">${content}</div>
        <div class="footer">Thank you for using ${APP_NAME}!</div>
      </div>
    </body>
    </html>
  `;
}

const sendWeatherAlertEmail = async (email: string, weatherData: WeatherData, alertInfo: WeatherConditionAlert) => {
  const subject = `Weather Alert: ${alertInfo.type} in ${weatherData.city}`;
  const iconUrl = `https://openweathermap.org/img/wn/${weatherData.iconCode}@2x.png`;

  const content = `
    <p>Hello,</p>
    <p>This is a weather alert from <strong>${APP_NAME}</strong> for <strong>${weatherData.city}</strong>.</p>
    <p class="alert-highlight"><strong>Alert: ${alertInfo.type}</strong></p>
    <p><strong>Details:</strong> ${alertInfo.details}</p>
    <div class="weather-details">
      <p><img src="${iconUrl}" alt="${weatherData.condition}" class="weather-icon" width="50" height="50"> Current conditions in ${weatherData.city}, ${weatherData.country}:</p>
      <p><strong>Temperature:</strong> ${weatherData.temperature}°C (Feels like: ${weatherData.feelsLike}°C)</p>
      <p><strong>Condition:</strong> ${weatherData.description}</p>
      <p><strong>Humidity:</strong> ${weatherData.humidity}%</p>
      <p><strong>Wind:</strong> ${weatherData.windSpeed} km/h</p>
    </div>
    <p>Please take necessary precautions.</p>
  `;
  const html = getBaseEmailHtml(`Weather Alert: ${alertInfo.type} - ${weatherData.city}`, content);
  return sendEmail({ to: email, subject, html });
};

async function fetchCurrentWeatherForAlert(city: string, apiKey: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to fetch weather for ${city} for alert: ${response.status}`, errorData.message);
      return null;
    }
    const data: OpenWeatherCurrentAPIResponse = await response.json();
    if (!data.weather || data.weather.length === 0) return null;
    return {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
      condition: data.weather[0].main,
      description: data.weather[0].description,
      iconCode: data.weather[0].icon,
    };
  } catch (error) {
    console.error(`Error fetching current weather for ${city} for alert:`, error);
    return null;
  }
}

async function checkAndSendLiveWeatherAlerts(preferences: AlertPreferences) {
  if (!preferences.email || !preferences.city || !preferences.alertsEnabled) {
    return;
  }
  if (!preferences.notifyExtremeTemp && !preferences.notifyHeavyRain && !preferences.notifyStrongWind) {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("OpenWeather API key is not set for live alert check.");
    return;
  }

  const currentWeatherData = await fetchCurrentWeatherForAlert(preferences.city, apiKey);
  if (!currentWeatherData) {
    console.log(`Could not fetch current weather for ${preferences.city} to check live alerts.`);
    return;
  }

  const temp = currentWeatherData.temperature;
  const windSpeedKmh = currentWeatherData.windSpeed;
  const weatherConditionMain = currentWeatherData.condition.toLowerCase(); // e.g., "rain"
  const weatherDescription = currentWeatherData.description.toLowerCase(); // e.g., "heavy intensity rain"

  if (preferences.notifyExtremeTemp) {
    if (temp > 32) { // High temp threshold
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C (High).` });
    } else if (temp < 5) { // Low temp threshold
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C (Low).` });
    }
  }
  if (preferences.notifyHeavyRain) {
    if (weatherConditionMain === 'rain' && (weatherDescription.includes('heavy') || weatherDescription.includes('extreme') || weatherDescription.includes('torrential') || weatherDescription.includes('very heavy'))) {
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Heavy Rain', details: `Heavy rain detected: ${currentWeatherData.description}.` });
    }
  }
  if (preferences.notifyStrongWind) {
    if (windSpeedKmh > 35) { // Strong wind threshold in km/h
      await sendWeatherAlertEmail(preferences.email, currentWeatherData, { city: preferences.city, type: 'Strong Wind', details: `Strong winds detected at ${windSpeedKmh} km/h.` });
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
    notifyHeavyRain: formData.get('notifyHeavyRain'),
    notifyStrongWind: formData.get('notifyStrongWind'),
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
    const content = `
        <p>Hello,</p>
        <p>Your weather alert preferences with ${APP_NAME} have been updated.</p>
        <p><strong>Alerts are currently disabled.</strong></p>
        <p>If you wish to re-enable alerts or change your settings, please visit the Weatherwise app.</p>
    `;
    const html = getBaseEmailHtml("Weather Alerts Disabled", content);
    if (emailToUse) { // Send notification even if disabling, if email was provided
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
      const conditionsList = [
        preferences.notifyExtremeTemp ? '<li>Extreme Temperatures (High >32°C, Low <5°C)</li>' : '',
        preferences.notifyHeavyRain ? '<li>Heavy Rain</li>' : '',
        preferences.notifyStrongWind ? '<li>Strong Winds (>35 km/h)</li>' : '',
      ].filter(Boolean).join('');

      const noConditionsSelected = !preferences.notifyExtremeTemp && !preferences.notifyHeavyRain && !preferences.notifyStrongWind;
      
      const conditionsHtml = conditionsList.length > 0 ? `<ul>${conditionsList}</ul>` : (noConditionsSelected ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : '');

      const confirmationContent = `
        <p>Hello,</p>
        <p>Your weather alert preferences for <strong>${preferences.city}</strong> have been successfully updated with ${APP_NAME}.</p>
        <p>You are set to receive alerts for:</p>
        ${conditionsHtml}
        <p>If you wish to disable these alerts, you can update your preferences on the Weatherwise app.</p>
      `;
      const confirmationHtml = getBaseEmailHtml(`Weather Alert Preferences Updated for ${preferences.city}`, confirmationContent);

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
    const verificationContent = `
      <p>Hello,</p>
      <p>Thank you for setting up weather alerts with ${APP_NAME} for the city: <strong>${preferences.city}</strong>.</p>
      <p>Your verification code is: <strong style="font-size: 20px; color: ${ACCENT_COLOR};">${verificationCode}</strong></p>
      <p>Please enter this code on the Weatherwise alerts page to activate your notifications.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;
    const verificationHtml = getBaseEmailHtml("Verify Your Email for Weatherwise Alerts", verificationContent);

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
});

export async function verifyCodeAction(
  prevState: SaveAlertsFormState, 
  formData: FormData
): Promise<SaveAlertsFormState> {
  const rawData = {
    email: formData.get('email'),
    verificationCode: formData.get('verificationCode'), 
    expectedCode: formData.get('expectedCode')
  };

  const validationResult = VerifyCodeSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Partial<Record<'email' | 'verificationCode' | 'expectedCode', string[] | undefined>>;
    return {
      ...prevState,
      message: "Invalid verification data. Ensure code is 6 digits.",
      error: true,
      fieldErrors: fieldErrors, 
      needsVerification: true,
    };
  }

  const { email, verificationCode, expectedCode } = validationResult.data;

  if (verificationCode === expectedCode) {
    const city = formData.get('city') as string; 
    const notifyExtremeTemp = formData.get('notifyExtremeTemp') === 'on';
    const notifyHeavyRain = formData.get('notifyHeavyRain') === 'on';
    const notifyStrongWind = formData.get('notifyStrongWind') === 'on';

    const preferences: AlertPreferences = {
      email: email,
      city: city,
      alertsEnabled: true, 
      notifyExtremeTemp,
      notifyHeavyRain,
      notifyStrongWind,
    };

    const conditionsList = [
        notifyExtremeTemp ? '<li>Extreme Temperatures (High >32°C, Low <5°C)</li>' : '',
        notifyHeavyRain ? '<li>Heavy Rain</li>' : '',
        notifyStrongWind ? '<li>Strong Winds (>35 km/h)</li>' : '',
      ].filter(Boolean).join('');
    
    const noConditionsSelected = !notifyExtremeTemp && !notifyHeavyRain && !notifyStrongWind;
    const conditionsHtml = conditionsList.length > 0 ? `<ul>${conditionsList}</ul>` : (noConditionsSelected ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : '');

    const emailContent = `
      <p>Hello,</p>
      <p>Your email <strong>${email}</strong> has been successfully verified for ${APP_NAME} alerts for the city: <strong>${city}</strong>.</p>
      <p>Your alert preferences are now active. You are set to receive alerts for:</p>
      ${conditionsHtml}
    `;
    const emailHtml = getBaseEmailHtml(`Email Verified - Weather Alerts Active for ${city}`, emailContent);
    try {
        await sendEmail({to: email, subject: `Email Verified - ${APP_NAME} Alerts Active for ${city}`, html: emailHtml});
        await checkAndSendLiveWeatherAlerts(preferences);
    } catch (e) {
        console.error("Failed to send post-verification confirmation email or live alert:", e);
    }

    return {
      message: `Email ${email} verified successfully! Alerts are now active for ${city}. Current weather conditions were also checked for immediate alerts.`,
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

  const emailValidation = z.string().email({ message: "Invalid email address provided for test." }).safeParse(email);
  if (!emailValidation.success) {
    return { message: emailValidation.error.errors[0].message, error: true };
  }
  const validatedEmail = emailValidation.data.toLowerCase();

  let emailTitle = `${APP_NAME} Test Email`;
  let testContent = `
    <p>Hello from ${APP_NAME}!</p>
    <p>This is a test email to confirm that your email settings are working correctly with the Weatherwise application.</p>
  `;

  if (city) {
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    if (apiKey) {
      const weatherData = await fetchCurrentWeatherForAlert(city, apiKey);
      if (weatherData) {
        emailTitle = `${APP_NAME} Test Weather Report for ${city}`;
        const iconUrl = `https://openweathermap.org/img/wn/${weatherData.iconCode}@2x.png`;
        testContent = `
          <p>Hello,</p>
          <p>This is a <strong>test weather report</strong> from ${APP_NAME}, showing current conditions for <strong>${weatherData.city}, ${weatherData.country}</strong>.</p>
          <div class="weather-details">
            <p><img src="${iconUrl}" alt="${weatherData.condition}" class="weather-icon" width="50" height="50"> Current conditions:</p>
            <p><strong>Temperature:</strong> ${weatherData.temperature}°C (Feels like: ${weatherData.feelsLike}°C)</p>
            <p><strong>Condition:</strong> ${weatherData.description}</p>
            <p><strong>Humidity:</strong> ${weatherData.humidity}%</p>
            <p><strong>Wind:</strong> ${weatherData.windSpeed} km/h</p>
          </div>
          <p>This is only a test. If this were a real alert, it would specify the condition that triggered it (e.g., Extreme Temperature, Heavy Rain, Strong Wind).</p>
        `;
      } else {
        testContent += `<p>We attempted to fetch current weather for <strong>${city}</strong> to include in this test, but could not retrieve the data.</p>`;
      }
    } else {
      testContent += `<p>Weather data for <strong>${city}</strong> could not be fetched for this test because the OpenWeather API key is not configured on the server.</p>`;
    }
  }
  testContent += `<p>If you received this, congratulations! Your email service seems to be configured.</p>`;
  
  const emailHtml = getBaseEmailHtml(emailTitle, testContent);

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
    