# Weatherwise: Your Smart Weather Companion

This is a Next.js web application, Weatherwise, designed to provide real-time weather information and AI-powered insights.

---

## 🚀 Getting Started

Follow these steps to download the code, configure it, and run it on your local machine.

### 1. Download the Code

**You own all of this code, and there is no cost to download it.** Your project is stored in a standard code repository. You can get it onto your computer in one of two ways:

*   **Clone with Git (Recommended):** Open your terminal and use the `git clone` command with your repository's URL. You can find this URL in your Firebase Studio project settings.
    ```bash
    git clone <YOUR_REPOSITORY_URL>
    ```
*   **Download ZIP:** Most code hosting platforms (like GitHub, which your project may be connected to) have a "Code" button that lets you download the entire project as a ZIP file. Unzip the file on your computer.


### 2. Configure Environment Variables

This is the most important step. The application **will not start** without the required API keys.

1.  In the root directory of your project, create a new file named `.env`.
2.  Copy the contents of the list below and paste them into your `.env` file.
3.  Add your own secret keys inside the quotes for each variable.

```env
# Clerk Authentication (Required for login)
# Get these from your Clerk Dashboard: https://dashboard.clerk.com/
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""

# OpenWeatherMap API (Required for weather data)
# Get one or more keys from: https://openweathermap.org/api
# You can add multiple keys separated by commas.
NEXT_PUBLIC_OPENWEATHER_API_KEYS=""

# Google AI (Required for AI summaries & alerts)
# Get one or more keys from Google AI Studio: https://aistudio.google.com/
GEMINI_API_KEYS=""

# Cron Job Security (Required for automatic alerts)
# This is a secret password of your choice. It should be a long, random string.
CRON_SECRET=""

# Email Sending (Required for email alerts)
# Pre-configured for Gmail's SMTP servers.
# To use your Gmail, you must generate a 16-digit App Password. Your regular password will not work.
# See Google's instructions: https://support.google.com/accounts/answer/185833
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="465"
EMAIL_USER="" # Your full Gmail address (e.g., youremail@gmail.com)
EMAIL_PASSWORD="" # Your 16-digit App Password
EMAIL_FROM="" # The email address alerts will be sent from (can be the same as EMAIL_USER)

# Application URL (Used for generating links in emails)
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### 3. Install Dependencies & Run

1.  Open a terminal in your project's root directory.
2.  Install the necessary packages:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

Your application should now be running at `http://localhost:3000`.

---

## ☁️ Deployment

This app is pre-configured for deployment with **Firebase App Hosting**.

1.  **Set up the Firebase CLI** on your machine and log in.
2.  From your project's root directory, run the deploy command:
    ```bash
    firebase deploy
    ```

**IMPORTANT:** Your local `.env` file is **not** uploaded during deployment for security reasons. You must configure all the same environment variables (from the list above) in the secret management section of your Firebase project settings in the Google Cloud console.

---

## ✨ Key Features

*   **User Authentication:** Secure sign-up and sign-in functionality powered by Clerk.
*   **Automatic & Manual Location Weather:** Get current weather for your location or search for any city.
*   **Detailed Weather Data:** Displays temperature, "feels like" temp, humidity, wind, and weather icons.
*   **AI-Generated Summaries:** Leverages Genkit for concise, AI-driven weather summaries.
*   **Hourly Forecasts:** View a 24-hour weather forecast.
*   **Automatic Hourly Email Alerts:** Users can opt-in to receive hourly email alerts for significant weather in their chosen city, with customizable schedules and sensitivity.
*   **Modern Email Templates:** Dark-themed email notifications with AI-generated subject lines and activity suggestions.
*   **Theme Customization:** Switch between light and dark modes.

---

## ⏰ Setting up Automatic Hourly Alerts (Cron Job)

To enable automatic hourly alerts, you must set up a "cron job" that calls a secure API endpoint.

1.  **Set `CRON_SECRET` in your environment:** Ensure you have added a secure, random `CRON_SECRET`.
2.  **Use a Scheduling Service:** Use a free external service like `cron-job.org`, `EasyCron`, or a similar scheduler.
3.  **Configure the Job:** Create a new cron job with the following settings:
    *   **URL / Endpoint:** `https://<YOUR_APP_URL>/api/cron` (Replace `<YOUR_APP_URL>` with your application's public URL).
    *   **Schedule:** Set it to run **once every hour**.
    *   **HTTP Method:** `GET`
    *   **Custom Headers:** Add an `Authorization` header with the value `Bearer <YOUR_CRON_SECRET>`.

---

## 🛠️ Tech Stack

*   Next.js (App Router)
*   React & TypeScript
*   Tailwind CSS & ShadCN UI
*   Clerk (Authentication)
*   Genkit (AI Features)
*   Nodemailer (Email Sending)

---
## 💻 Recommended VS Code Extensions

To make your development experience smoother, this project includes a list of recommended Visual Studio Code extensions. When you open the project in VS Code, you should be prompted to install them automatically.

Here’s a brief overview of why each one is helpful:

*   **ESLint:** Catches common errors and enforces code quality standards.
*   **Prettier - Code formatter:** Automatically formats your code to keep it consistent and readable.
*   **Tailwind CSS IntelliSense:** Provides autocompletion, linting, and hover previews for Tailwind classes. Essential for this project.
*   **PostCSS Language Support:** Adds syntax highlighting for PostCSS, which Tailwind uses under the hood.
*   **Clerk:** Official extension for Clerk authentication, providing helpful snippets and commands.
*   **DotENV:** Adds syntax highlighting to your `.env` file, making it easier to read.
*   **GitLens:** Supercharges the Git features in VS Code, helping you visualize code authorship and history.
*   **Lucide Icons:** Allows you to easily search for and preview icons from the `lucide-react` library used in this project.
*   **Google Cloud Code:** Useful for Firebase and Google Cloud integration, including support for Genkit.
