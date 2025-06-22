
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';

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

  // --- Theme Colors and Fonts ---
  const colors = {
    background: '#0f172a', // Dark Slate
    card: 'rgba(30, 41, 59, 0.8)', // Lighter Slate (semi-transparent)
    border: '#334155',
    primary: '#facc15', // Sunny Yellow
    textHeading: '#ffffff',
    textMuted: '#94a3b8', // Slate-400
    textBody: '#e2e8f0', // Slate-200
  };
  const fontFamily = "'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

  // --- Icon SVGs ---
  const icons = {
    feelsLike: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
    humidity: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`,
    wind: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
    hourly: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    summary: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.6.11.82-.26.82-.57 0-.28-.01-1.02-.01-2-2.78.6-3.37-1.34-3.37-1.34-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.23 1.83 1.23 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3 1.17-1.6-2.67-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.82 1.1.82 2.22 0 1.6-.01 2.89-.01 3.29 0 .31.22.69.83.57A10 10 0 0 0 22 12 10 10 0 0 0 12 2z"/></svg>`,
    activity: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/><path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>`,
  };

  // --- Reusable Components ---
  const renderDetailCard = (icon: string, label: string, value: string) => `
    <td align="center" width="33.33%" style="padding: 0 4px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="background-color: ${colors.background}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 16px 8px; text-align: center;">
            ${icon}
            <p style="color: ${colors.textMuted}; font-size: 14px; font-weight: 500; margin: 8px 0 0 0; line-height: 1;">${label}</p>
            <p style="color: ${colors.textHeading}; font-size: 18px; font-weight: 700; margin: 4px 0 0 0; line-height: 1;">${value}</p>
          </td>
        </tr>
      </table>
    </td>
  `;

  const renderHourlyForecastItem = (item: HourlyForecastData) => `
    <td align="center" width="60" style="padding: 0 4px;">
      <p style="color: ${colors.textMuted}; font-size: 14px; font-weight: 500; margin: 0 0 10px 0;">${item.time.toUpperCase()}</p>
      <img src="https://openweathermap.org/img/wn/${item.iconCode}@2x.png" alt="${item.condition}" width="40" height="40" style="margin: 0 auto 10px auto;">
      <p style="color: ${colors.textHeading}; font-size: 18px; font-weight: 700; margin: 0;">${item.temp}°</p>
    </td>
  `;

  const renderSection = (icon: string, title: string, content: string) => `
    <tr>
      <td style="padding-top: 24px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="middle" width="32">${icon}</td>
            <td valign="middle" style="padding-left: 12px;">
              <h3 style="color: ${colors.primary}; font-size: 20px; font-weight: 700; margin: 0;">${title}</h3>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 16px;">
              <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 16px;">
                <p style="font-size: 15px; color: ${colors.textBody}; margin: 0; line-height: 1.6;">${content}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>${weatherData.aiSubject}</title>
    <!--[if mso]>
    <style>
        * {
            font-family: sans-serif !important;
        }
    </style>
    <![endif]-->
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: ${colors.background};
            font-family: ${fontFamily};
        }
        table {
            border-spacing: 0;
        }
        td {
            padding: 0;
        }
        p {
            font-size: 16px;
        }
        img {
            border: 0;
        }
    </style>
</head>
<body style="margin: 0; padding: 24px; background-color: ${colors.background}; background-image: linear-gradient(135deg, #1e3a8a 0%, #0c4a6e 50%, #4c1d95 100%);">
    <center style="width: 100%; table-layout: fixed; background-color: transparent;">
        <div style="max-width: 600px; background-color: ${colors.card}; border-radius: 16px; border: 1px solid ${colors.border}; box-shadow: 0 10px 25px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
            <!--[if mso]>
            <table role="presentation" width="600" style="width: 600px;" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="padding: 32px;">
            <![endif]-->
            <table role="presentation" align="center" style="width: 100%; max-width: 600px; border-spacing: 0; font-family: ${fontFamily}; color: ${colors.textBody};" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding: 32px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding-bottom: 24px;">
                                    <h1 style="font-size: 32px; font-weight: 800; color: ${colors.textHeading}; margin: 0;">${weatherData.city}, ${weatherData.country}</h1>
                                    <p style="font-size: 18px; color: ${colors.textMuted}; margin: 4px 0 0 0; font-weight: 500; text-transform: capitalize;">${weatherData.description}</p>
                                </td>
                            </tr>
                            <!-- Main Weather -->
                            <tr>
                                <td style="padding-bottom: 24px;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td width="55%" align="center" valign="middle" style="font-size: 80px; font-weight: 800; color: ${colors.primary}; line-height: 1; text-shadow: 0 0 15px rgba(250, 204, 21, 0.5);">
                                                ${weatherData.temperature}°<span style="font-size: 48px; vertical-align: 20px;">C</span>
                                            </td>
                                            <td width="45%" align="center" valign="middle">
                                               <img src="https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png" alt="${weatherData.condition}" width="120" height="120" style="margin: 0 auto; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Details -->
                            <tr>
                                <td style="padding-bottom: 16px;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            ${renderDetailCard(icons.feelsLike, 'Feels Like', `${weatherData.feelsLike}°C`)}
                                            ${renderDetailCard(icons.humidity, 'Humidity', `${weatherData.humidity}%`)}
                                            ${renderDetailCard(icons.wind, 'Wind', `${weatherData.windSpeed} km/h`)}
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Hourly Forecast -->
                            ${weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 ? `
                            <tr>
                                <td style="padding-top: 24px;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td valign="middle" width="32">${icons.hourly}</td>
                                            <td valign="middle" style="padding-left: 12px;">
                                              <h3 style="color: ${colors.primary}; font-size: 20px; font-weight: 700; margin: 0;">Hourly Forecast</h3>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td colspan="2" style="padding-top: 16px;">
                                                <div style="background-color: ${colors.background}; border: 1px solid ${colors.border}; border-radius: 12px; padding: 16px;">
                                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                                        <tr>
                                                           ${weatherData.hourlyForecast.slice(0, 5).map(renderHourlyForecastItem).join('')}
                                                        </tr>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>` : ''}
                            <!-- AI Summary -->
                            ${renderSection(icons.summary, 'AI Weather Summary', weatherData.aiSummary)}
                            <!-- Activity Suggestion -->
                            ${weatherData.activitySuggestion ? renderSection(icons.activity, 'Activity Suggestion', weatherData.activitySuggestion) : ''}
                            
                             <!-- Footer -->
                             <tr>
                                <td align="center" style="padding: 32px 0 0 0; border-top: 1px solid ${colors.border}; margin-top: 24px;">
                                    <p style="font-size: 14px; color: ${colors.textMuted}; margin: 0 0 16px 0;">Want to change how you get these alerts?</p>
                                    <a href="${alertsUrl}" style="display: inline-block; background-color: ${colors.primary}; color: #000; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Manage Preferences</a>
                                    <p style="font-size: 12px; color: ${colors.textMuted}; margin: 24px 0 0 0;">© ${new Date().getFullYear()} Weatherwise. All rights reserved.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td></tr></table>
            <![endif]-->
        </div>
    </center>
</body>
</html>
`;
}
