
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
  const weatherIconUrl = `https://openweathermap.org/img/wn/${weatherData.iconCode}@4x.png`;

  // --- Color Palette ---
  const colors = {
    bgGradient: 'linear-gradient(to bottom, #1e3a8a, #4c1d95)', // dark-blue to dark-purple
    bgFallback: '#1e3a8a', // dark-blue as fallback
    cardBg: '#111827',  // gray-900
    text: '#d1d5db',      // gray-300
    textLight: '#9ca3af',// gray-400
    primary: '#60a5fa',   // blue-400
    heading: '#f9fafb',  // gray-50
    border: '#374151',  // gray-700
    accentRed: '#f87171', // red-400
    accentYellow: '#fde047', // A bright, vibrant yellow
  };

  const fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

  // --- Logic ---
  let subjectLine = isTest ? `TEST: ${weatherData.aiSubject}` : weatherData.aiSubject;
  let introParagraph: string;
  if (isTest) {
    introParagraph = `Here is your requested sample weather report for <strong>${weatherData.city}</strong>.`;
  } else {
    introParagraph = `This is a weather report from Weatherwise. One or more of your alert conditions were met for <strong>${weatherData.city}</strong>.`;
  }

  const alertDetailsHtml =
    alertTriggers && alertTriggers.length > 0
      ? `
    <!-- Alert Details -->
    <tr>
        <td style="padding: 24px 0 12px 0;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td style="background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid ${colors.accentRed}; border-radius: 8px; padding: 20px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td width="40" valign="top"><img src="https://i.ibb.co/b3x1Y7M/bell-2-48.png" alt="Alert" width="28" height="28"></td>
                                <td>
                                    <p style="font-size: 18px; font-weight: bold; color: ${colors.heading}; margin: 0 0 8px 0;">Alerts Triggered</p>
                                    <ul style="margin: 0; padding: 0 0 0 20px; color: ${colors.accentRed}; font-size: 15px; line-height: 1.6;">
                                        ${alertTriggers.map((trigger) => `<li>${trigger}</li>`).join('')}
                                    </ul>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    ` : '';
  
  const renderDetailCard = (icon: string, label: string, value: string) => `
    <td width="33.33%" style="padding: 0 4px;">
        <div style="background-color: #030712; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid ${colors.border};">
            <img src="${icon}" alt="${label}" width="28" height="28" style="margin: 0 auto 8px auto;">
            <p style="font-size: 14px; color: ${colors.textLight}; margin: 0;">${label}</p>
            <p style="font-size: 20px; font-weight: bold; color: ${colors.heading}; margin: 4px 0 0 0;">${value}</p>
        </div>
    </td>
  `;

  const renderSection = (icon: string, title: string, content: string) => `
    <tr>
      <td style="padding-top: 24px; padding-bottom: 8px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
            <tr>
              <td width="32" valign="middle"><img src="${icon}" alt="${title}" width="24" height="24"></td>
              <td valign="middle" style="padding-left: 12px;"><p style="font-size: 20px; font-weight: 700; color: ${colors.heading}; margin: 0;">${title}</p></td>
            </tr>
        </table>
        <div style="background-color: #030712; border-radius: 12px; padding: 16px 20px; border: 1px solid ${colors.border};">
            <p style="font-size: 15px; color: ${colors.text}; margin: 0; line-height: 1.6;">${content}</p>
        </div>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <title>${subjectLine}</title>
</head>
<body style="background-image: ${colors.bgGradient}; background-color: ${colors.bgFallback}; color: ${colors.text}; font-family: 'Inter', ${fontFamily}; padding: 24px; margin: 0;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
        <tr>
            <td align="center">
                <!--[if mso]>
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td>
                <![endif]-->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation" style="background-color: ${colors.cardBg}; border-radius: 16px; border: 1px solid ${colors.border}; padding: 24px 32px; max-width: 600px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3);">
                    
                    <tr><td style="padding-bottom: 24px;"><p style="font-size: 16px; color: ${colors.textLight}; margin: 0; line-height: 1.6;">${introParagraph}</p></td></tr>
                    
                    ${alertDetailsHtml}

                    <!-- Header -->
                    <tr>
                      <td align="center" style="padding-top: 12px; padding-bottom: 24px; text-align: center; border-top: 1px solid ${colors.border};">
                          <p style="font-size: 32px; font-weight: 700; color: ${colors.heading}; margin: 24px 0 0 0;">${weatherData.city}, ${weatherData.country}</p>
                          <p style="font-size: 18px; color: ${colors.primary}; margin: 4px 0 0 0; text-transform: capitalize; font-weight: 500;">${weatherData.description}</p>
                      </td>
                    </tr>

                    <!-- Main Weather -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    <td width="55%" align="left" valign="middle">
                                        <p style="margin: 0; font-size: 84px; font-weight: 700; color: ${colors.accentYellow}; line-height: 1; text-shadow: 0 0 10px rgba(253, 224, 71, 0.5);">
                                            ${weatherData.temperature}°<span style="font-size: 40px; vertical-align: 25px; margin-left: 4px; color: ${colors.textLight}; text-shadow: none;">C</span>
                                        </p>
                                    </td>
                                    <td width="45%" align="right" valign="middle">
                                        <img src="${weatherIconUrl}" alt="${weatherData.description}" width="160" height="160" style="display: block; border: 0; filter: drop-shadow(0 0 1rem rgba(96, 165, 250, 0.5));">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Weather Details -->
                    <tr>
                        <td style="padding-bottom: 16px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                <tr>
                                    ${renderDetailCard('https://i.ibb.co/SVSL9v9/thermometer-48.png', 'Feels Like', `${weatherData.feelsLike}°C`)}
                                    ${renderDetailCard('https://i.ibb.co/rpxJ0ST/humidity-48.png', 'Humidity', `${weatherData.humidity}%`)}
                                    ${renderDetailCard('https://i.ibb.co/VMyw1sT/wind-48.png', 'Wind', `${weatherData.windSpeed} km/h`)}
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- AI Summary -->
                    ${renderSection('https://i.ibb.co/2N4pXJ9/brain-48.png', 'AI Weather Summary', weatherData.aiSummary)}

                    <!-- Activity Suggestion -->
                    ${weatherData.activitySuggestion ? renderSection('https://i.ibb.co/9v0dJjF/lightbulb-48.png', 'Activity Suggestion', weatherData.activitySuggestion) : ''}

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 32px; border-top: 1px solid ${colors.border}; text-align: center; font-size: 13px; color: ${colors.textLight};">
                             <p style="margin: 0 0 16px 0;">To customize alert preferences, please visit the alerts page on our website.</p>
                             <a href="${alertsUrl}" style="background-color: ${colors.primary}; color: ${colors.heading}; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500;">
                                 Manage Your Alerts
                             </a>
                             <p style="margin-top: 24px; font-size: 12px;">© ${new Date().getFullYear()} Weatherwise. All Rights Reserved. <br> Icons by <a href="https://icons8.com" style="color: ${colors.textLight}; text-decoration: underline;">Icons8</a>.</p>
                        </td>
                    </tr>
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>`;
}
