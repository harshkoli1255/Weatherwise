
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { AlertPreferences } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertsForm } from './AlertsForm';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';

export default async function AlertsPage() {
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await clerkClient.users.getUser(userId);
  
  const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress ?? '';

  const defaultPreferences: AlertPreferences = {
    email: primaryEmail,
    city: '',
    alertsEnabled: false,
    notifyExtremeTemp: false,
    highTempThreshold: 30,
    lowTempThreshold: 5,
    notifyHeavyRain: false,
    notifyStrongWind: false,
    windSpeedThreshold: 40,
  };
  
  const savedPreferences = user.privateMetadata?.alertPreferences as Partial<AlertPreferences> | undefined;

  const preferences: AlertPreferences = {
    ...defaultPreferences,
    ...savedPreferences,
    email: primaryEmail, // Always use the current primary email
  };

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 flex flex-col items-center">
      <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
        <CardHeader className="text-center items-center pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-5">
          <Bell className="h-14 w-14 sm:h-16 md:h-20 text-primary mb-3 sm:mb-4 drop-shadow-lg" />
          <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary">Weather Alert Settings</CardTitle>
          <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 sm:mt-2.5 px-4 sm:px-6">
            Configure email notifications for specific weather conditions in your city.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
          <AlertsForm preferences={preferences} />
        </CardContent>
      </Card>
    </div>
  );
}
