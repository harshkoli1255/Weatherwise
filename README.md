# Weatherwise: Your Smart Weather Companion

This is a Next.js web application, Weatherwise, designed to provide real-time weather information and AI-powered insights.

## Key Features:

*   **Automatic & Manual Location Weather:** Get current weather conditions for your detected location (via geolocation or IP lookup) or search for any city worldwide.
*   **Detailed Weather Data:** Displays temperature, "feels like" temperature, humidity, wind speed, and a visual weather icon.
*   **AI-Generated Summaries:** Leverages Genkit to provide concise, AI-driven summaries of the current weather.
*   **Hourly Forecasts:** View a 24-hour weather forecast with temperature and conditions.
*   **Configurable Email Alerts:** Set up email notifications for specific weather conditions (extreme temperatures, heavy rain, strong winds) for your chosen city.
*   **Confirmation Emails:** Receive an email confirmation when your alert preferences are successfully saved.
*   **Theme Customization:** Switch between light and dark modes for comfortable viewing.

## Tech Stack:

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI Components
*   Genkit (for AI features)
*   Nodemailer (for email notifications)

To get started, explore the application by running `npm run dev`. The main page is `src/app/page.tsx` and the alerts configuration is at `src/app/alerts/page.tsx`.
