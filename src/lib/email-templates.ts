
'use server';

import type { WeatherSummaryData } from '@/lib/types';

interface EmailTemplatePayload {
  weatherData: WeatherSummaryData;
  alertTriggers?: string[];
  isTest?: boolean;
}

export function generateWeatherAlertEmailHtml({
  weatherData,
  alertTriggers,
  isTest = false,
}: EmailTemplatePayload): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const alertsUrl = new URL('/alerts', baseUrl).toString();
  const iconUrl = `https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png`;

  let greeting: string;
  let introParagraph: string;

  if (isTest) {
    greeting = 'Hello,';
    introParagraph = `Here is your requested test weather report for <strong>${weatherData.city}</strong>. This is a sample of the automated alerts you can receive based on your preferences.`;
  } else {
    greeting = `Weather Alert for ${weatherData.city}`;
    introParagraph = `This is an automated weather alert from Weatherwise. One or more of your alert conditions have been met for <strong>${weatherData.city}</strong>.`;
  }

  const alertDetailsHtml =
    alertTriggers && alertTriggers.length > 0
      ? `
    <tr>
        <td style="padding-top: 16px; padding-bottom: 16px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                <tr>
                    <td width="28" valign="middle"><img src="https://img.icons8.com/fluency-systems-filled/28/dc2626/alarm.png" alt="Alert" width="28" height="28" style="display: block;"></td>
                    <td valign="middle" style="padding-left: 12px;">
                        <p style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0;">Alerts Triggered</p>
                    </td>
                </tr>
            </table>
            <div style="background-color: #fee2e2; border-radius: 12px; padding: 16px; border: 1px solid #fca5a5;">
                <ul style="margin: 0; padding: 0 0 0 20px; color: #991b1b; font-size: 15px; line-height: 1.6;">
                    ${alertTriggers.map((trigger) => `<li>${trigger}</li>`).join('')}
                </ul>
            </div>
        </td>
    </tr>`
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${isTest ? `TEST: ${weatherData.aiSubject}` : weatherData.aiSubject}</title>
</head>
<body style="background-color: #f1f5f9; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 24px; margin: 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
        <tr>
            <td align="center">
                <!--[if mso]>
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                <td>
                <![endif]-->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 24px 32px; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);">
                    
                    <!-- Greeting -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <p style="font-size: 16px; color: #475569; margin: 0; line-height: 1.6;">${greeting}</p>
                            <p style="font-size: 16px; color: #475569; margin: 12px 0 0 0; line-height: 1.6;">${introParagraph}</p>
                        </td>
                    </tr>
                    
                    ${alertDetailsHtml}

                    <!-- Separator -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <div style="height: 1px; background-color: #e2e8f0;"></div>
                        </td>
                    </tr>

                    <!-- Header: City & Description -->
                    <tr>
                        <td align="center" style="padding-bottom: 24px; text-align: center;">
                            <p style="font-size: 28px; font-weight: bold; color: #2563eb; margin: 0;">${weatherData.city}, ${weatherData.country}</p>
                            <p style="font-size: 16px; color: #64748b; margin: 4px 0 0 0; text-transform: capitalize;">${weatherData.description}</p>
                        </td>
                    </tr>

                    <!-- Main Weather: Temperature & Icon -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    <td width="55%" align="left" valign="middle">
                                        <p style="margin: 0; font-size: 80px; font-weight: bold; color: #2563eb; line-height: 1;">
                                            ${weatherData.temperature}<span style="font-size: 40px; color: #64748b; vertical-align: 30px; margin-left: 4px;">°C</span>
                                        </p>
                                    </td>
                                    <td width="45%" align="right" valign="middle">
                                        <img src="${iconUrl}" alt="${weatherData.description}" width="160" height="160" style="display: block; border: 0;">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Weather Details Cards -->
                    <tr>
                        <td style="padding-bottom: 16px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    <td width="33.33%" style="padding-right: 6px;">
                                        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0;">
                                                <img src="https://img.icons8.com/fluency-systems-filled/20/64748b/temperature.png" alt="Feels Like" width="20" height="20" style="display: inline-block; vertical-align: middle;">
                                                <span style="vertical-align: middle; margin-left: 6px;">Feels Like</span>
                                            </p>
                                            <p style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0;">${weatherData.feelsLike}°C</p>
                                        </div>
                                    </td>
                                    <td width="33.33%" style="padding-left: 3px; padding-right: 3px;">
                                        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0;">
                                                <img src="https://img.icons8.com/fluency-systems-filled/20/64748b/hygrometer.png" alt="Humidity" width="20" height="20" style="display: inline-block; vertical-align: middle;">
                                                <span style="vertical-align: middle; margin-left: 6px;">Humidity</span>
                                            </p>
                                            <p style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0;">${weatherData.humidity}%</p>
                                        </div>
                                    </td>
                                    <td width="33.33%" style="padding-left: 6px;">
                                        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0;">
                                                <img src="https://img.icons8.com/fluency-systems-filled/20/64748b/wind.png" alt="Wind" width="20" height="20" style="display: inline-block; vertical-align: middle;">
                                                <span style="vertical-align: middle; margin-left: 6px;">Wind</span>
                                            </p>
                                            <p style="font-size: 20px; font-weight: bold; color: #1e293b; margin: 0;">${weatherData.windSpeed} km/h</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Hourly Forecast -->
                    ${weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 ? `
                    <tr>
                        <td style="padding-top: 16px; padding-bottom: 16px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;"><tr><td width="28" valign="middle"><img src="https://img.icons8.com/fluency-systems-filled/28/2563eb/timer.png" alt="Forecast" width="28" height="28"></td><td valign="middle" style="padding-left: 12px;"><p style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0;">Hourly Forecast</p></td></tr></table>
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    ${weatherData.hourlyForecast.slice(0, 5).map(forecast => `
                                        <td align="center" style="padding: 0 4px;">
                                            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 12px 8px; text-align: center; width: 85px;">
                                                <p style="font-size: 14px; color: #64748b; margin: 0; white-space: nowrap;">${forecast.time}</p>
                                                <img src="https://openweathermap.org/img/wn/${forecast.iconCode}@2x.png" width="40" height="40" alt="${forecast.condition}" style="margin: 4px auto; display: block; border: 0;" />
                                                <p style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0;">${forecast.temp}°</p>
                                            </div>
                                        </td>
                                    `).join('')}
                                </tr>
                            </table>
                        </td>
                    </tr>` : ''}

                    <!-- AI Summary -->
                    <tr>
                        <td style="padding-top: 16px; padding-bottom: 16px;">
                             <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;"><tr><td width="28" valign="middle"><img src="https://img.icons8.com/fluency-systems-filled/28/2563eb/artificial-intelligence.png" alt="AI" width="28" height="28"></td><td valign="middle" style="padding-left: 12px;"><p style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0;">AI Weather Summary</p></td></tr></table>
                            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px;">
                                <p style="font-size: 15px; color: #334155; margin: 0; line-height: 1.6;">${weatherData.aiSummary}</p>
                            </div>
                        </td>
                    </tr>

                    <!-- Activity Suggestion -->
                    ${weatherData.activitySuggestion ? `
                    <tr>
                        <td style="padding-top: 8px; padding-bottom: 24px;">
                             <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;"><tr><td width="28" valign="middle"><img src="https://img.icons8.com/fluency-systems-filled/28/2563eb/light.png" alt="Suggestion" width="28" height="28"></td><td valign="middle" style="padding-left: 12px;"><p style="font-size: 18px; font-weight: bold; color: #1e293b; margin: 0;">Activity Suggestion</p></td></tr></table>
                            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px;">
                                <p style="font-size: 15px; color: #334155; margin: 0; line-height: 1.6;">${weatherData.activitySuggestion}</p>
                            </div>
                        </td>
                    </tr>` : ''}

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 32px; text-align: center; font-size: 13px; color: #64748b;">
                             <p style="margin: 0 0 16px 0;">This is an automated alert from Weatherwise. You can customize your notification settings at any time by visiting the alerts page on our website.</p>
                             <a href="${alertsUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
                                 Manage Your Alerts
                             </a>
                             <p style="margin-top: 24px; font-size: 12px;">You received this email because alerts are enabled for your account. <br> © ${new Date().getFullYear()} Weatherwise. All Rights Reserved. <br> Icons by <a href="https://icons8.com" style="color: #64748b; text-decoration: underline;">Icons8</a>.</p>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
`;
}
