
import { NextResponse } from 'next/server';
import { checkAndSendAlerts } from '@/services/alertProcessing';

export const dynamic = 'force-dynamic';

/**
 * SECURE CRON JOB ENDPOINT
 * 
 * This endpoint is designed to be called by an external scheduling service (like cron-job.org)
 * to trigger the hourly weather alert check for all users.
 * 
 * SECURITY:
 * It is protected by a secret key that must be passed in the 'Authorization' header
 * as a Bearer token. This prevents unauthorized execution.
 * 
 * Example cURL:
 * curl -X GET "https://<YOUR_APP_URL>/api/cron" -H "Authorization: Bearer <YOUR_CRON_SECRET>"
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const expectedHeader = `Bearer ${cronSecret}`;

  // 1. Check if the CRON_SECRET is configured on the server
  if (!cronSecret) {
    console.error("[CRON-SETUP-ERROR] CRON_SECRET is not set in environment variables. Cron job cannot run securely.");
    return NextResponse.json(
      { success: false, message: "CRON job is not configured on the server." }, 
      { status: 500 }
    );
  }

  // 2. Check if the incoming request has the correct secret token
  if (authHeader !== expectedHeader) {
    // This warning is crucial for debugging. It shows what header was actually received vs what was expected.
    console.warn(`[CRON-AUTH-FAIL] Unauthorized attempt to access CRON endpoint. Received header: "${authHeader}". Expected: "${expectedHeader}"`);
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // THIS IS THE PROOF. If you see this log, the cron job is authenticated correctly.
  console.log(`[CRON-AUTH-SUCCESS] Cron job authorized successfully at: ${new Date().toISOString()}`);

  // 3. Execute the alert processing logic
  try {
    const result = await checkAndSendAlerts();
    console.log(`[CRON-EXECUTION-FINISH] Hourly alert check finished. Processed: ${result.processedUsers}, Eligible: ${result.eligibleUsers}, Sent: ${result.alertsSent}, Errors: ${result.errors.length}`);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON-EXECUTION-ERROR] A critical error occurred during the CRON job execution:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, message: "Cron job failed", error: errorMessage }, 
      { status: 500 }
    );
  }
}
