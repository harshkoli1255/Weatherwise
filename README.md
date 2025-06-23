
# Weatherwise: Intelligent Weather & Alert Platform

![Weatherwise Screenshot](https://placehold.co/1200x600.png)
*A placeholder for a live screenshot of the application dashboard.*

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
*   **Modern, Responsive UI:** Built with Tailwind CSS and ShadCN UI, featuring light and dark modes and a focus on a clean user experience.

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

Follow these steps to get the project running on your local machine.

#### 1. Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or later recommended)
*   [Git](https://git-scm.com/)
*   A code editor like [VS Code](https://code.visualstudio.com/) with the recommended extensions.

#### 2. Clone the Repository
Open your terminal and clone the project repository to your local machine.
```bash
git clone <YOUR_REPOSITORY_URL>
cd <project-directory>
```

#### 3. Configure Environment Variables
> **IMPORTANT:** This is the most critical step. The application **will not start** without the required API keys.

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

## ☁️ Deployment

This app is pre-configured for deployment with **Firebase App Hosting**.

1.  **Set up the Firebase CLI** on your machine and log in.
2.  From your project's root directory, run the deploy command:
    ```bash
    firebase deploy
    ```

> **IMPORTANT:** Your local `.env` file is **not** uploaded during deployment for security reasons. You must configure all the same environment variables in the secret management section of your Firebase project settings.

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

## 💻 Recommended VS Code Extensions

This project includes a `.vscode/extensions.json` file, so you should be prompted to install these automatically when you open the project in VS Code.

*   **ESLint & Prettier:** For code quality and consistent formatting.
*   **Tailwind CSS IntelliSense:** Essential for working with Tailwind classes.
*   **Clerk & Google Cloud Code:** Official extensions for easier integration with our auth and AI services.
*   **DotENV & GitLens:** Quality-of-life improvements for managing environment variables and Git history.
*   **Lucide Icons:** Easily search and preview icons used in the project.
