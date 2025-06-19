
'use server';

import { z } from 'zod';
import type { AlertPreferences, OpenWeatherCurrentAPIResponse, WeatherConditionAlert, WeatherData } from '@/lib/types';
import { sendEmail } from '@/services/emailService';
import { generateVerificationCode } from '@/lib/utils';
import { format }_from_ 'date-fns';

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
  verifiedEmailOnSuccess?: string | null;
}

const sendWeatherAlertEmail = async (email: string, alertInfo: WeatherConditionAlert) => {
  const subject = `Weather Alert: ${alertInfo.type} in ${alertInfo.city}`;
  const html = `
    <h1>Weather Alert for ${alertInfo.city}</h1>
    <p>Hello,</p>
    <p>This is a weather alert from Weatherwise for <strong>${alertInfo.city}</strong>.</p>
    <p><strong>Condition:</strong> ${alertInfo.type}</p>
    <p><strong>Details:</strong> ${alertInfo.details}</p>
    <p>Please take necessary precautions.</p>
    <p>Thank you for using Weatherwise!</p>
  `;
  return sendEmail({ to: email, subject, html });
};

async function fetchCurrentWeatherForAlert(city: string, apiKey: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch weather for ${city} for alert: ${response.status}`);
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
    return; // Cannot check weather
  }

  const currentWeatherData = await fetchCurrentWeatherForAlert(preferences.city, apiKey);
  if (!currentWeatherData) {
    console.log(`Could not fetch current weather for ${preferences.city} to check live alerts.`);
    return;
  }

  const temp = currentWeatherData.temperature;
  const windSpeedKmh = currentWeatherData.windSpeed;
  const weatherCondition = currentWeatherData.condition; // e.g., "Rain"
  const weatherDescription = currentWeatherData.description.toLowerCase(); // e.g., "heavy intensity rain"


  if (preferences.notifyExtremeTemp) {
    if (temp > 32) {
      await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C (High).` });
    } else if (temp < 5) {
      await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C (Low).` });
    }
  }
  if (preferences.notifyHeavyRain) {
    // More robust check for various types of heavy rain
    if (weatherCondition === 'Rain' && (weatherDescription.includes('heavy') || weatherDescription.includes('extreme') || weatherDescription.includes('torrential'))) {
      await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Heavy Rain', details: `Heavy rain detected: ${weatherDescription}.` });
    }
  }
  if (preferences.notifyStrongWind) {
    if (windSpeedKmh > 35) {
      await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Strong Wind', details: `Strong winds detected at ${windSpeedKmh} km/h.` });
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
    console.log("Disabling alert preferences due to alertsEnabled=false or empty email.");
    return {
      message: "Weather alerts have been disabled.",
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

  // If the email is already marked as verified by the client
  if (isAlreadyVerifiedClientHint && emailToUse) {
    try {
      console.log("Saving alert preferences for already verified email:", preferences);
      const emailSubject = `Weather Alert Preferences Updated for ${preferences.city}`;
      const emailHtml = `
        <h1>Weather Alert Preferences Confirmed</h1>
        <p>Hello,</p>
        <p>Your weather alert preferences for <strong>${preferences.city}</strong> have been successfully updated with Weatherwise.</p>
        <p>You are set to receive alerts for:</p>
        <ul>
          ${preferences.notifyExtremeTemp ? '<li>Extreme Temperatures (High >32°C, Low <5°C)</li>' : ''}
          ${preferences.notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
          ${preferences.notifyStrongWind ? '<li>Strong Winds (>35 km/h)</li>' : ''}
        </ul>
        ${!(preferences.notifyExtremeTemp || preferences.notifyHeavyRain || preferences.notifyStrongWind) ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : ''}
        <p>If you wish to disable these alerts, you can update your preferences on the Weatherwise app.</p>
        <p>Thank you for using Weatherwise!</p>
      `;

      const emailResult = await sendEmail({
        to: emailToUse,
        subject: emailSubject,
        html: emailHtml,
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
          finalMessage = `Alert preferences saved for ${preferences.city}, but: ${emailResult.error} Current weather conditions were checked.`;
        } else if (emailResult.error) {
            finalMessage += ` Reason: ${emailResult.error}. Current weather conditions were also checked.`;
        } else {
            finalMessage += ` An unknown error occurred during email sending. Current weather conditions were also checked.`;
        }
        return { message: finalMessage, error: true, emailVerified: true, verifiedEmailOnSuccess: emailToUse };
      }
    } catch (e) {
      console.error("Error saving alert preferences or sending email:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      return { message: `Failed to save alert preferences: ${errorMessage}`, error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess, };
    }
  } else if (emailToUse) { // Email not yet verified, needs verification
    const verificationCode = generateVerificationCode();
    const emailSubject = "Verify Your Email for Weatherwise Alerts";
    const emailHtml = `
      <h1>Weatherwise Email Verification</h1>
      <p>Hello,</p>
      <p>Thank you for setting up weather alerts with Weatherwise for the city: <strong>${preferences.city}</strong>.</p>
      <p>Your verification code is: <strong>${verificationCode}</strong></p>
      <p>Please enter this code on the Weatherwise alerts page to activate your notifications.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Thank you for using Weatherwise!</p>
    `;

    try {
      const emailResult = await sendEmail({
        to: emailToUse,
        subject: emailSubject,
        html: emailHtml,
      });

      if (emailResult.success) {
        return {
          message: `A verification code has been sent to ${emailToUse}. Please enter it below.`,
          error: false,
          verificationSentTo: emailToUse,
          generatedCode: verificationCode, 
          needsVerification: true,
          verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess, // Keep previous if any
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
        return { message: finalMessage, error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess, };
      }
    } catch (e) {
      console.error("Error sending verification email:", e);
      const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred.";
      return { message: `Failed to send verification email: ${errorMessage}`, error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess, };
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
    email: formData.get('email'), // This should be the email the code was sent to
    verificationCode: formData.get('verificationCode'), 
    expectedCode: formData.get('expectedCode') // This is the code we generated and stored
  };

  const validationResult = VerifyCodeSchema.safeParse(rawData);

  if (!validationResult.success) {
    const fieldErrors = validationResult.error.flatten().fieldErrors as Partial<Record<'email' | 'verificationCode' | 'expectedCode', string[] | undefined>>;
    return {
      ...prevState, // Carry over previous state like verificationSentTo, generatedCode
      message: "Invalid verification data. Ensure code is 6 digits.",
      error: true,
      fieldErrors: fieldErrors, 
      needsVerification: true, // Still needs verification
    };
  }

  const { email, verificationCode, expectedCode } = validationResult.data;

  if (verificationCode === expectedCode) {
    const city = formData.get('city') as string; 
    const notifyExtremeTemp = formData.get('notifyExtremeTemp') === 'on';
    const notifyHeavyRain = formData.get('notifyHeavyRain') === 'on';
    const notifyStrongWind = formData.get('notifyStrongWind') === 'on';

    const preferences: AlertPreferences = {
      email: email, // Use the verified email
      city: city,
      alertsEnabled: true, 
      notifyExtremeTemp,
      notifyHeavyRain,
      notifyStrongWind,
    };

    const emailSubject = `Email Verified - Weather Alerts Active for ${city}`;
    const emailHtml = `
      <h1>Email Verified & Alerts Active!</h1>
      <p>Hello,</p>
      <p>Your email <strong>${email}</strong> has been successfully verified for Weatherwise alerts for the city: <strong>${city}</strong>.</p>
      <p>Your alert preferences are now active. You are set to receive alerts for:</p>
      <ul>
        ${notifyExtremeTemp ? '<li>Extreme Temperatures (High >32°C, Low <5°C)</li>' : ''}
        ${notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
        ${notifyStrongWind ? '<li>Strong Winds (>35 km/h)</li>' : ''}
      </ul>
      ${!(notifyExtremeTemp || notifyHeavyRain || notifyStrongWind) ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : ''}
      <p>Thank you for using Weatherwise!</p>
    `;
    try {
        await sendEmail({to: email, subject: emailSubject, html: emailHtml});
        await checkAndSendLiveWeatherAlerts(preferences);
    } catch (e) {
        console.error("Failed to send post-verification confirmation email or live alert:", e);
        // Don't make the whole verification fail due to this optional email
    }

    return {
      message: `Email ${email} verified successfully! Alerts are now active for ${city}. Current weather conditions were also checked for immediate alerts.`,
      error: false,
      emailVerified: true,
      verifiedEmailOnSuccess: email.toLowerCase(), // Return the verified email in lowercase
      verificationSentTo: null, // Clear these as verification is done
      generatedCode: null,
      needsVerification: false,
    };
  } else {
    return {
      ...prevState, // Carry over previous state
      message: "Invalid verification code. Please try again.",
      error: true,
      fieldErrors: { verificationCode: ["Incorrect code."] },
      needsVerification: true, // Still needs verification
      // Ensure verificationSentTo and generatedCode from prevState are preserved if user retries
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

  let emailSubject = "Weatherwise Test Email";
  let emailHtml = `
    <h1>Hello from Weatherwise!</h1>
    <p>This is a test email to confirm that your email settings are working correctly with the Weatherwise application.</p>
    <p>If you received this, congratulations! Your email service is configured.</p>
  `;

  if (city) {
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
    if (apiKey) {
      const weatherData = await fetchCurrentWeatherForAlert(city, apiKey);
      if (weatherData) {
        emailSubject = `Weatherwise Test Alert for ${city}`;
        emailHtml = `
          <h1>Weatherwise Test Alert for ${weatherData.city}</h1>
          <p>Hello,</p>
          <p>This is a <strong>test weather alert</strong> from Weatherwise, showing how a real alert might look.</p>
          <p><strong>Current Conditions in ${weatherData.city}, ${weatherData.country}:</strong></p>
          <ul>
            <li>Temperature: ${weatherData.temperature}°C</li>
            <li>Feels Like: ${weatherData.feelsLike}°C</li>
            <li>Condition: ${weatherData.description} (Main: ${weatherData.condition})</li>
            <li>Humidity: ${weatherData.humidity}%</li>
            <li>Wind Speed: ${weatherData.windSpeed} km/h</li>
          </ul>
          <p>This is only a test. No real alert condition was necessarily met.</p>
        `;
      } else {
        emailHtml += `<p>We attempted to fetch current weather for <strong>${city}</strong> to include in this test, but could not retrieve the data.</p>`;
      }
    } else {
      emailHtml += `<p>Weather data for <strong>${city}</strong> could not be fetched for this test because the OpenWeather API key is not configured on the server.</p>`;
    }
  }

  emailHtml += `<p>Thank you for using Weatherwise!</p>`;

  try {
    const emailResult = await sendEmail({
      to: validatedEmail,
      subject: emailSubject,
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

```