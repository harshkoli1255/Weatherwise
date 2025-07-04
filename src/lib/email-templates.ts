
import type { WeatherSummaryData, HourlyForecastData, EmailTemplatePayload } from '@/lib/types';

export function generateWeatherAlertEmailHtml({
  weatherData,
  alertTriggers = [],
}: EmailTemplatePayload): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const alertsUrl = new URL('/alerts', baseUrl).toString();

  // --- Theme Colors and Fonts ---
  const colors = {
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    primary: '#14b8a6', // Teal-500
    textHeading: '#0f172a',
    textMuted: '#64748b',
    textBody: '#334155',
  };
  const fontFamily = "'-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

  // --- Helper function to style strong tags for email clients ---
  const styleStrongTags = (html: string) => {
    if (!html) return '';
    return html.replace(/<strong>/g, `<strong style="color: ${colors.primary}; font-weight: 700;">`).replace(/<\/strong>/g, '</strong>');
  };

  // --- Reusable Components ---
  const renderDetailCard = (label: string, value: string) => `
    <td align="center" class="column" style="padding: 0 4px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="background-color: #f1f5f9; border-radius: 12px; padding: 16px 8px; text-align: center;">
            <p style="color: ${colors.textMuted}; font-size: 14px; font-weight: 500; margin: 0 0 4px 0; line-height: 1;">${label}</p>
            <p style="color: ${colors.textHeading}; font-size: 18px; font-weight: 700; margin: 0; line-height: 1;">${value}</p>
          </td>
        </tr>
      </table>
    </td>
  `;

  const renderHourlyForecastItem = (item: HourlyForecastData) => {
    const date = new Date(item.timestamp * 1000);
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).replace(' ', '');
    return `
    <td align="center" class="column-forecast" style="padding: 0 5px; min-width: 60px;">
      <p style="color: ${colors.textMuted}; font-size: 14px; font-weight: 500; margin: 0 0 10px 0;">${time}</p>
      <img src="https://openweathermap.org/img/wn/${item.iconCode}@2x.png" alt="${item.condition}" width="40" height="40" style="margin: 0 auto 10px auto;">
      <p style="color: ${colors.textHeading}; font-size: 18px; font-weight: 700; margin: 0;">${Math.round(item.temp)}°</p>
    </td>
  `};

  const renderSection = (emoji: string, title: string, content: string, contentBgColor: string = '#f1f5f9') => {
    return `
      <tr>
        <td style="padding-top: 24px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td valign="middle" width="32" style="font-size: 24px; line-height: 24px;">${emoji}</td>
              <td valign="middle" style="padding-left: 12px;">
                <h3 style="color: ${colors.textHeading}; font-size: 20px; font-weight: 700; margin: 0;">${title}</h3>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 16px;">
                <div style="background-color: ${contentBgColor}; border-radius: 12px; padding: 16px;">
                  <p style="font-size: 15px; color: ${colors.textBody}; margin: 0; line-height: 1.6;">${content}</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
  `};

  const renderAlertTriggers = (triggers: string[]) => {
    const content = `
      <p style="font-size: 15px; color: ${colors.textBody}; margin: 0; line-height: 1.6;">This alert was sent for the following reason(s):</p>
      <ul style="font-size: 15px; color: ${colors.textBody}; margin: 12px 0 0 0; padding-left: 20px; line-height: 1.6;">
        ${triggers.map(t => `<li style="margin-bottom: 8px;">${styleStrongTags(t)}</li>`).join('')}
      </ul>`;
    return renderSection('🔔', 'Alert Details', content, `rgba(20, 184, 166, 0.1)`);
  };

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
    <style> * { font-family: sans-serif !important; } </style>
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
        td, p, h1, h3 {
            padding: 0;
            margin: 0;
        }
        img {
            border: 0;
            -ms-interpolation-mode: bicubic;
        }
        a {
            text-decoration: none;
        }
        @media screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                max-width: 100% !important;
                padding: 16px !important;
            }
            .content-padding {
              padding: 24px !important;
            }
            .column {
                width: 100% !important;
                display: block !important;
                padding: 0 0 16px 0 !important;
            }
            .column-forecast {
                 padding-bottom: 16px !important;
            }
            .main-temp {
              font-size: 64px !important;
            }
            .main-temp-unit {
              font-size: 36px !important;
              vertical-align: 16px !important;
            }
            .main-icon {
              width: 100px !important;
              height: 100px !important;
            }
            .forecast-scroll-container {
              overflow-x: auto !important;
              -webkit-overflow-scrolling: touch;
            }
            .forecast-table {
               width: max-content !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background};">
    <center style="width: 100%; table-layout: fixed; background-color: ${colors.background};">
        <div class="container" style="max-width: 600px; margin: 0 auto;">
            <!--[if mso]>
            <table role="presentation" width="600" style="width: 600px;" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="background-color: ${colors.card}; border-radius: 16px; border: 1px solid ${colors.border};">
            <![endif]-->
            <table role="presentation" align="center" style="width: 100%; max-width: 600px; border-spacing: 0; font-family: ${fontFamily}; color: ${colors.textBody}; background-color: ${colors.card}; border-radius: 16px; border: 1px solid ${colors.border}; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td class="content-padding" style="padding: 32px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <!-- Header -->
                            <tr>
                                <td align="center" style="padding-bottom: 24px;">
                                    <h1 style="font-size: 32px; font-weight: 800; color: ${colors.textHeading};">${weatherData.city}, ${weatherData.country}</h1>
                                    <p style="font-size: 18px; color: ${colors.textMuted}; margin-top: 4px; font-weight: 500; text-transform: capitalize;">${weatherData.description}</p>
                                </td>
                            </tr>
                            <!-- Main Weather -->
                            <tr>
                                <td style="padding-bottom: 24px;">
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td width="55%" align="center" valign="middle" class="main-temp" style="font-size: 80px; font-weight: 800; color: ${colors.textHeading}; line-height: 1;">
                                                ${Math.round(weatherData.temperature)}°<span class="main-temp-unit" style="font-size: 48px; vertical-align: 20px;">C</span>
                                            </td>
                                            <td width="45%" align="center" valign="middle">
                                               <img src="https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png" alt="${weatherData.condition}" width="120" height="120" class="main-icon" style="margin: 0 auto; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));">
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
                                            ${renderDetailCard('Feels Like', `${Math.round(weatherData.feelsLike)}°C`)}
                                            ${renderDetailCard('Humidity', `${weatherData.humidity}%`)}
                                            ${renderDetailCard('Wind', `${weatherData.windSpeed} km/h`)}
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <!-- Alert Triggers -->
                            ${alertTriggers && alertTriggers.length > 0 ? renderAlertTriggers(alertTriggers) : ''}
                            <!-- Hourly Forecast -->
                            ${weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 ? `
                            ${renderSection('🕒', 'Hourly Forecast', `
                                <div class="forecast-scroll-container">
                                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="forecast-table">
                                      <tr>
                                         ${weatherData.hourlyForecast.slice(0, 5).map(renderHourlyForecastItem).join('')}
                                      </tr>
                                  </table>
                                </div>
                            `)}
                            ` : ''}
                            <!-- AI Summary -->
                            ${renderSection('💡', 'AI Weather Summary', styleStrongTags(weatherData.aiSummary))}
                            <!-- Activity Suggestion -->
                            ${weatherData.activitySuggestion ? renderSection('🏃', 'Activity Suggestion', styleStrongTags(weatherData.activitySuggestion)) : ''}
                            
                             <!-- Footer -->
                             <tr>
                                <td align="center" style="padding: 32px 0 0 0; border-top: 1px solid ${colors.border}; margin-top: 24px;">
                                    <p style="font-size: 14px; color: ${colors.textMuted}; margin: 0 0 16px 0;">Want to change how you get these alerts?</p>
                                    <a href="${alertsUrl}" style="display: inline-block; background-color: ${colors.primary}; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px;">Manage Preferences</a>
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
`
}
