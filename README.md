# Weatherwise: Your Smart Weather Companion

This is a Next.js web application, Weatherwise, designed to provide real-time weather information and AI-powered insights.

## ⚠️ Important Setup Instructions

Before running the application, you must configure your API keys in the `.env` file. The application **will not start** without the required keys.

1.  **Locate the `.env` file** in the project's root directory.
2.  **Add your API keys** inside the quotes for each variable:
    *   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: **Required for authentication.** Get this from your [Clerk Dashboard](https://dashboard.clerk.com/).
    *   `CLERK_SECRET_KEY`: **Required for authentication.** Get this from your [Clerk Dashboard](https://dashboard.clerk.com/).
    *   `NEXT_PUBLIC_OPENWEATHER_API_KEYS`: **Required for weather data.** Get one or more keys from the [OpenWeatherMap API](https://openweathermap.org/api).
    *   `GEMINI_API_KEYS`: Optional, but required for AI-powered summaries. Get one or more keys from [Google AI Studio](https://aistudio.google.com/).

3.  **Start the application:**
    ```bash
    npm run dev
    ```

---

## Key Features:

*   **User Authentication:** Secure sign-up and sign-in functionality powered by Clerk.
*   **Automatic & Manual Location Weather:** Get current weather conditions for your detected location (via geolocation or IP lookup) or search for any city worldwide.
*   **Detailed Weather Data:** Displays temperature, "feels like" temperature, humidity, wind speed, and a visual weather icon.
*   **AI-Generated Summaries:** Leverages Genkit to provide concise, AI-driven summaries of the current weather.
*   **Hourly Forecasts:** View a 24-hour weather forecast with temperature and conditions.
*   **Configurable Email Alerts:** Set up email notifications for specific weather conditions (extreme temperatures, heavy rain, strong winds) for your chosen city.
*   **Theme Customization:** Switch between light and dark modes for comfortable viewing.

## Tech Stack:

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI Components
*   Clerk (for authentication)
*   Genkit (for AI features)
