
# Weatherwise: Intelligent Weather & Alert Platform

![Weatherwise Screenshot](./public/weatherwise-screenshot.png)
*The Weatherwise dashboard showing real-time weather data for New York.*

**Weatherwise** is a modern, full-stack web application that provides real-time weather data, AI-powered insights, and a highly customizable, intelligent alert system. It's built with a modern tech stack designed for performance, scalability, and a superior developer experience.

---

## ✨ Core Features

*   **Dynamic Weather Dashboard:** Get real-time weather data for any city worldwide or automatically detect the user's location via browser geolocation or IP lookup.
*   **AI-Powered Insights:** The application leverages Google's Gemini model via Genkit to provide users with conversational weather summaries, creative activity suggestions, and intelligent email subject lines.
*   **Intelligent, Customizable Alerts:**
    *   **AI-Driven Decisions:** Instead of rigid rules, the AI analyzes weather conditions to decide if an alert is significant enough to send.
    *   **Custom Schedules:** Users can define specific days and times to receive alerts, all managed within their chosen timezone.
    *   **Adjustable Sensitivity:** Control alert frequency with "Maximum," "Balanced," or "Minimal" settings to prevent notification fatigue.
    *   **Secure Cron Job Integration:** A secure webhook endpoint allows for reliable, hourly alert checks triggered by an external scheduler.
*   **Secure User Authentication:** Full sign-up, sign-in, and profile management powered by Clerk.
*   **Modern, Responsive UI:** Built with a modern, responsive UI using Tailwind CSS and ShadCN UI, featuring light and dark modes and a focus on a clean user experience.

---

## 🛠️ Architectural Highlights & Tech Stack

This project was built with a focus on modern, scalable web architecture. The choices below reflect a commitment to performance, type safety, and maintainability.

| Category      | Technology                                                                                                                              | Rationale & Key Usage                                                                                                                                                           |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Framework** | [**Next.js (App Router)**](https://nextjs.org/)                                                                                         | Utilizes **Server Components** by default to minimize client-side JavaScript and improve load times. The App Router provides a robust foundation for routing and layouts.            |
| **AI**        | [**Google Gemini**](https://deepmind.google/technologies/gemini/) & [**Genkit**](https://firebase.google.com/docs/genkit)                | Genkit orchestrates calls to the Gemini model for all AI tasks, including weather summaries, city name correction, and the core logic for the intelligent alert system.       |
| **Language**  | [**TypeScript**](https://www.typescriptlang.org/)                                                                                       | Ensures type safety across the entire application, from front-end components to back-end server actions, reducing runtime errors and improving developer productivity.     |
| **Styling**   | [**Tailwind CSS**](https://tailwindcss.com/) & [**ShadCN UI**](https://ui.shadcn.com/)                                                     | A utility-first CSS framework for rapid, custom UI development, paired with a set of beautifully designed, accessible, and composable components.                               |
| **Auth**      | [**Clerk**](https://clerk.com/)                                                                                                         | Handles user authentication, session management, and provides a secure foundation for user-specific features like alert preferences.                                         |
| **Data**      | [**OpenWeatherMap API**](https://openweathermap.org/api)                                                                                | The primary source for all weather and geocoding data. The backend includes resilient, multi-key-aware services for fetching data.                                        |
| **Emails**    | [**Nodemailer**](https://nodemailer.com/)                                                                                               | A reliable module for sending dynamically generated, HTML-based email alerts from the server. The templates are dark-themed and designed for modern email clients.        |
| **Deployment**| [**Firebase App Hosting**](https://firebase.google.com/docs/app-hosting)                                                                | Provides a seamless, fully-managed deployment solution with auto-scaling, global CDN, and integrated security features.                                                      |

---

## 🚀 Running Locally

Follow these steps to get the project running on your local machine. The process is the same for **Windows, macOS, and Linux**.

#### 1. Prerequisites
Before you begin, ensure you have the following installed:
*   [**Node.js**](https://nodejs.org/) (v18 or later recommended)
*   [**Git**](https://git-scm.com/)
*   A code editor like [**VS Code**](https://code.visualstudio.com/) with the recommended extensions.

#### 2. Clone the Repository
Open your terminal or command prompt, navigate to where you want to store the project, and run the following command:
```bash
git clone <YOUR_REPOSITORY_URL>
cd <project-directory>
```

#### 3. Configure Environment Variables
> **⚠️ IMPORTANT:** This is the most critical step. The application **will not start** without the required API keys.

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

#### 4. Install Dependencies & Run
1.  Open a terminal in your project's root directory and install the necessary packages:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm run dev
    ```

Your application should now be running at `http://localhost:3000`.

---

## ☁️ Deployment (Free Hosting)

This app is pre-configured for one-command deployment with **Firebase App Hosting**. Firebase offers a generous **free tier** that includes hosting, a global CDN, and an SSL certificate, making it an excellent choice for hosting this project at no cost. You can find more details on their [pricing page](https://firebase.google.com/pricing).

#### 1. Set Up Firebase
If you don't have them already, install the Firebase command-line tools and log in:
```bash
# Install the Firebase CLI globally
npm install -g firebase-tools

# Log in to your Google account
firebase login
```
You will also need to create a new project in the [Firebase Console](https://console.firebase.google.com/).

#### 2. Deploy the App
From your project's root directory, run the deploy command.
```bash
firebase deploy
```
The first time you run this, the CLI will ask you to select a Firebase project to connect to. It will also create a `firebase.json` and `.firebaserc` file for you if they don't exist. Subsequent deploys will use this configuration automatically.

After deployment, Firebase will give you your public application URL (e.g., `https://<your-project-id>.web.app`).

#### 3. Configure Server Secrets
> **⚠️ CRITICAL STEP:** Your local `.env` file is **not** uploaded during deployment for security reasons. Your app **will not work** until you add your secrets to the Firebase environment.

1.  Go to your project in the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to the **App Hosting** section.
3.  In your backend's settings, find the **Secret Manager** section and add all the same secret keys (e.g., `CLERK_SECRET_KEY`, `GEMINI_API_KEYS`, `CRON_SECRET`, etc.) that are in your local `.env` file.
4.  **Important:** Update the `NEXT_PUBLIC_BASE_URL` variable to your new public Firebase URL.

---

## ⏰ Setting up Automatic Hourly Alerts (Cron Job)

To enable automatic hourly alerts, you must set up a "cron job" that calls a secure API endpoint on your **deployed application**. This requires your app to be hosted online first.

1.  **Set `CRON_SECRET` in your deployment environment:** Ensure you have added a secure, random `CRON_SECRET` in your Firebase project's Secret Manager (see deployment steps above).
2.  **Use a Scheduling Service:** Use a free external service like `cron-job.org`, `EasyCron`, or a similar scheduler.
3.  **Configure the Job:** Create a new cron job with the following settings:
    *   **URL / Endpoint:** `https://<YOUR_DEPLOYED_APP_URL>/api/cron`
        > **Note:** You must use your public Firebase URL here, not `localhost`. The cron service is on the internet and cannot access your local machine.
    *   **Schedule:** Set it to run **once every hour**.
    *   **HTTP Method:** `GET`
    *   **Custom Headers:**
        > **⚠️ This is the most common point of failure. Please follow these instructions exactly.**
        > On `cron-job.org` or a similar service, find the section for "Custom Headers" or "HTTP Headers". You must add **one** header:
        > - Header Name: `Authorization`
        > - Header Value: `Bearer <YOUR_CRON_SECRET>`
        >
        > **Important:**
        > - Replace `<YOUR_CRON_SECRET>` with the actual secret password you created.
        > - The value **must** start with the word `Bearer` followed by a space, and then your secret. For example: `Bearer mySuperSecretPassword123`
        > - The header name is `Authorization`, with a capital 'A'.

### How to Verify Your Cron Job is Working

After you have set up your job on a service like `cron-job.org`:

1.  **Wait for the job to run:** The service will run it at the next scheduled time (e.g., at the top of the next hour). Some services may have a "Test Run" button you can click.
2.  **Check Your Application Logs:**
    *   Go to your project in the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to the **App Hosting** section.
    *   Find the **Logs** tab for your backend.
3.  **Look for the Proof:** Search your logs for the following message:
    ```
    [CRON-AUTH-SUCCESS] Cron job authorized successfully
    ```
    If you see this message, your cron job is set up correctly and is successfully communicating with your app! If you don't see it, check the logs for a `[CRON-AUTH-FAIL]` message, which will show you what went wrong.

    > **Troubleshooting "Unauthorized" Errors:**
    > If your log shows `[CRON-AUTH-FAIL] ... Received header: "null"`, it means the `Authorization` header was **not sent at all**. Double-check that you have correctly added the custom header in your cron service settings and that the header name is spelled `Authorization` exactly.

---

## ❓ Frequently Asked Questions

**Will the app and alerts run 24/7 on Firebase?**

Yes. Firebase App Hosting keeps your website online 24/7. The hourly alerts depend on the external cron job service you set up. As long as that service calls your app's `/api/cron` URL every hour, your alerts will be checked around the clock.

On the free tier, if your app has no traffic for a while, it might "go to sleep" to save resources. The first request (from a user or the cron job) will wake it up automatically, which might take a few seconds. This is a normal "cold start" and won't affect the alert functionality.

**If I close my computer, will the deployed app stop running?**

No. Once you deploy your app with `firebase deploy`, it's running on Google's servers. It is completely independent of your local machine. You can safely close your terminal, editor, and even shut down your computer. The website and the alert system will continue to operate.

---

## 💻 Recommended VS Code Extensions

This project includes a `.vscode/extensions.json` file. The first time you open this project in VS Code, it will automatically detect this file and prompt you to install these recommended extensions with one click. This works seamlessly on Windows, macOS, and Linux.

*   **ESLint & Prettier:** For code quality and consistent formatting.
*   **Tailwind CSS IntelliSense:** Essential for working with Tailwind classes.
*   **Clerk & Google Cloud Code:** Official extensions for easier integration with our auth and AI services.
*   **DotENV & GitLens:** Quality-of-life improvements for managing environment variables and Git history.
*   **Lucide Icons:** Easily search and preview icons used in the project.
