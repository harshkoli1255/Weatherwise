
import { NextResponse } from 'next/server';
import { checkAndSendAlerts } from '@/services/alertProcessing';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('Cron job started: Checking and sending weather alerts.');
    const result = await checkAndSendAlerts();
    console.log('Cron job finished successfully.', result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
