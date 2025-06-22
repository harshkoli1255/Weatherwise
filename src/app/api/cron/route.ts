
import { NextResponse } from 'next/server';

/**
 * This endpoint is disabled as per user request to remove cron-based scheduling.
 * Automatic hourly alerts are no longer active.
 */
export async function GET(request: Request) {
  // Return a 410 Gone status to indicate the resource is intentionally unavailable.
  return NextResponse.json(
    { 
      success: false, 
      message: "Automatic alert processing via cron has been disabled. This endpoint is no longer active." 
    }, 
    { status: 410 }
  );
}
