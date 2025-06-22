
import { NextResponse } from 'next/server';
import { checkAndSendAlerts } from '@/services/alertProcessing';

export const dynamic = 'force-dynamic'; // Defaults to force-static in app router

/**
 * This is the main CRON endpoint for the application.
 * When triggered by a scheduler, it initiates the process of checking and sending weather alerts.
 * 
 * It is secured by a secret key that must be passed in the 'Authorization' header
 * as a Bearer token.
 * 
 * Example:
 * curl -X GET "https://your-app-url/api/cron" -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET is not set in the environment variables. Aborting cron job.");
    return NextResponse.json(
      { success: false, message: "CRON secret not configured on server." }, 
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log("CRON job started: Checking and sending alerts.");

  try {
    const result = await checkAndSendAlerts();
    console.log("CRON job finished successfully.", result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("CRON job failed:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ success: false, message: "Cron job failed", error: errorMessage }, { status: 500 });
  }
}
