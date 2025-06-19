
'use server';

import { z } from 'zod';
import type { AlertPreferences, OpenWeatherCurrentAPIResponse, WeatherConditionAlert } from '@/lib/types';
import { sendEmail } from '@/services/emailService';
import { generateVerificationCode } from '@/lib/utils';

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

  try {
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(preferences.city)}&appid=${apiKey}&units=metric`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      console.error(`Failed to fetch weather for ${preferences.city} for live alert check: ${weatherResponse.status}`);
      return;
    }
    const currentWeatherData: OpenWeatherCurrentAPIResponse = await weatherResponse.json();

    const temp = Math.round(currentWeatherData.main.temp);
    const windSpeedKmh = Math.round(currentWeatherData.wind.speed * 3.6); // m/s to km/h
    const weatherCondition = currentWeatherData.weather[0].main;
    const weatherDescription = currentWeatherData.weather[0].description.toLowerCase();

    if (preferences.notifyExtremeTemp) {
      if (temp > 32) {
        await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C (High).` });
      } else if (temp < 5) {
        await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Extreme Temperature', details: `Current temperature is ${temp}°C (Low).` });
      }
    }
    if (preferences.notifyHeavyRain) {
      if (weatherCondition === 'Rain' && weatherDescription.includes('heavy intensity rain')) {
        await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Heavy Rain', details: `Heavy intensity rain detected: ${weatherDescription}.` });
      }
    }
    if (preferences.notifyStrongWind) {
      if (windSpeedKmh > 35) {
        await sendWeatherAlertEmail(preferences.email, { city: preferences.city, type: 'Strong Wind', details: `Strong winds detected at ${windSpeedKmh} km/h.` });
      }
    }
  } catch (error) {
    console.error("Error during live weather alert check:", error);
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
          ${preferences.notifyExtremeTemp ? '<li>Extreme Temperatures</li>' : ''}
          ${preferences.notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
          ${preferences.notifyStrongWind ? '<li>Strong Winds</li>' : ''}
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
      
      // Check for live alerts after successful save
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
        if (emailResult.error && (emailResult.error.includes('GOOGLE_SMTP_USER') || emailResult.error.includes('GOOGLE_SMTP_PASSWORD'))) {
             finalMessage = `Alert preferences saved for ${preferences.city}, but we couldn't send a confirmation email: ${emailResult.error}. Please check your email configuration. Current weather conditions were also checked.`;
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
  } else if (emailToUse) { // Needs verification
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
          verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
        };
      } else {
        let finalMessage = `We couldn't send a verification email to ${emailToUse}.`;
         if (emailResult.error && (emailResult.error.includes('GOOGLE_SMTP_USER') || emailResult.error.includes('GOOGLE_SMTP_PASSWORD'))) {
            finalMessage = `We couldn't send a verification email to ${emailToUse}: ${emailResult.error}. Please check your email configuration.`;
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
  // Fallback if emailToUse is somehow not set but alertsEnabled is true (should be caught by schema)
  return { message: "An unexpected error occurred. Email address is missing.", error: true, verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess };
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
      message: "Invalid verification data.",
      error: true,
      fieldErrors: fieldErrors, 
      verificationSentTo: rawData.email as string | null,
      generatedCode: rawData.expectedCode as string | null,
      needsVerification: true, 
      verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
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
      alertsEnabled: true, // Assumed true if verifying
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
        ${notifyExtremeTemp ? '<li>Extreme Temperatures</li>' : ''}
        ${notifyHeavyRain ? '<li>Heavy Rain</li>' : ''}
        ${notifyStrongWind ? '<li>Strong Winds</li>' : ''}
      </ul>
      ${!(notifyExtremeTemp || notifyHeavyRain || notifyStrongWind) ? '<p>You have not selected any specific conditions for notifications, but alerts are enabled for your city.</p>' : ''}
      <p>Thank you for using Weatherwise!</p>
    `;
    try {
        await sendEmail({to: email, subject: emailSubject, html: emailHtml});
        await checkAndSendLiveWeatherAlerts(preferences); // Check for live alerts
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
      message: "Invalid verification code. Please try again.",
      error: true,
      fieldErrors: { verificationCode: ["Incorrect code."] },
      verificationSentTo: email,
      generatedCode: expectedCode, 
      needsVerification: true,
      verifiedEmailOnSuccess: prevState.verifiedEmailOnSuccess,
    };
  }
}


export async function sendTestEmailAction(
  prevState: { message: string | null, error: boolean }, // Simple state for this action
  formData: FormData
): Promise<{ message: string | null, error: boolean }> {
  const email = formData.get('email') as string;

  const emailValidation = z.string().email({ message: "Invalid email address provided for test." }).safeParse(email);
  if (!emailValidation.success) {
    return { message: emailValidation.error.errors[0].message, error: true };
  }

  const validatedEmail = emailValidation.data.toLowerCase();

  const emailSubject = "Weatherwise Test Email";
  const emailHtml = `
    <h1>Hello from Weatherwise!</h1>
    <p>This is a test email to confirm that your email settings are working correctly with the Weatherwise application.</p>
    <p>If you received this, congratulations! Your email service is configured.</p>
    <p>Thank you for using Weatherwise!</p>
  `;

  try {
    const emailResult = await sendEmail({
      to: validatedEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    if (emailResult.success) {
      return { message: `Test email successfully sent to ${validatedEmail}.`, error: false };
    } else {
      let finalMessage = `Failed to send test email to ${validatedEmail}.`;
      if (emailResult.error && (emailResult.error.includes('GOOGLE_SMTP_USER') || emailResult.error.includes('GOOGLE_SMTP_PASSWORD'))) {
          finalMessage = `Failed to send test email: ${emailResult.error}. Please check your .env configuration.`;
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
