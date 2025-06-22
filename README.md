# Weatherwise: Your Smart Weather Companion

This is a Next.js web application, Weatherwise, designed to provide real-time weather information and AI-powered insights.

## ⚠️ Important Setup Instructions

Before running the application, you must configure your API keys in the `.env` file at the root of the project. The application **will not start** without some of the required keys.

1.  **Locate the `.env` file** in the project's root directory.
2.  **Add your API keys** inside the quotes for each variable.

### Required for Core Functionality:
*   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: **Required for authentication.** Get this from your [Clerk Dashboard](https://dashboard.clerk.com/).
*   `CLERK_SECRET_KEY`: **Required for authentication.** Get this from your [Clerk Dashboard](https://dashboard.clerk.com/).
*   `NEXT_PUBLIC_OPENWEATHER_API_KEYS`: **Required for weather data.** Get one or more keys from the [OpenWeatherMap API](https://openweathermap.org/api). You can add multiple keys separated by commas.

### Required for AI & Email Features:
*   `GEMINI_API_KEYS`: Required for AI-powered summaries. Get one or more keys from [Google AI Studio](https://aistudio.google.com/).
*   `CRON_SECRET`: **Required for automatic alerts.** This is a secret password of your choice that secures the cron endpoint. It should be a long, random string.
*   **Email Sending (`EMAIL_*` variables)**: Required for sending email alerts.
    *   The application is pre-configured to use **Gmail's SMTP servers**.
    *   To use your Gmail account, you must generate a 16-digit **App Password**. Simply using your regular Google password will not work.
    *   Follow Google's instructions to [Sign in with App Passwords](https://support.google.com/accounts/answer/185833).
    *   Once you have your App Password, fill in the following in `.env`:
        *   `EMAIL_HOST`: `smtp.gmail.com`
        *   `EMAIL_PORT`: `465`
        *   `EMAIL_USER`: Your full Gmail address (e.g., `youremail@gmail.com`).
        *   `EMAIL_PASSWORD`: Your 16-digit App Password.
        *   `EMAIL_FROM`: The email address you want alerts to be sent from (can be the same as `EMAIL_USER`).
*   `NEXT_PUBLIC_BASE_URL`: The public URL of your application, used for generating links in emails. Defaults to `http://localhost:3000`.

3.  **Install dependencies and start the application:**
    ```bash
    npm install
    npm run dev
    ```

---

## Key Features:

*   **User Authentication:** Secure sign-up and sign-in functionality powered by Clerk.
*   **Automatic & Manual Location Weather:** Get current weather conditions for your detected location (via geolocation or IP lookup) or search for any city worldwide.
*   **Detailed Weather Data:** Displays temperature, "feels like" temperature, humidity, wind speed, and a visual weather icon.
*   **AI-Generated Summaries:** Leverages Genkit to provide concise, AI-driven summaries of the current weather.
*   **Hourly Forecasts:** View a 24-hour weather forecast with temperature and conditions.
*   **Automatic Hourly Email Alerts:** Users can opt-in to receive hourly email alerts if specific weather conditions (e.g., high temperature, strong winds) are met in their chosen city.
*   **Modern Email Templates:** Beautiful, dark-themed email notifications with AI-generated subject lines and activity suggestions.
*   **Theme Customization:** Switch between light and dark modes for comfortable viewing.

---

### Setting up Automatic Hourly Alerts (Cron Job)

To enable automatic hourly alerts, you need to set up a "cron job" that calls a secure API endpoint in the application.

1.  **Set `CRON_SECRET` in `.env`:** Make sure you have added a secure, random `CRON_SECRET` to your `.env` file.

2.  **Use a Scheduling Service:** Use an external service like `cron-job.org`, `EasyCron`, or a similar scheduler.

3.  **Configure the Job:** Create a new cron job with the following settings:
    *   **URL / Endpoint:** `https://<YOUR_APP_URL>/api/cron` (Replace `<YOUR_APP_URL>` with your application's public URL).
    *   **Schedule:** Set it to run once every hour.
    *   **HTTP Method:** `GET`
    *   **Custom Headers:** Add an `Authorization` header with the value `Bearer <YOUR_CRON_SECRET>` (Replace `<YOUR_CRON_SECRET>` with the secret from your `.env` file).

This will trigger the app to check for alerts every hour and send emails to users whose preferences match the current weather conditions.

---

## Tech Stack:

*   Next.js (App Router)
*   React
*   TypeScript
*   Tailwind CSS
*   ShadCN UI Components
*   Clerk (for authentication)
*   Genkit (for AI features)
*   Nodemailer (for email sending)
