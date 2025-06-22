
import { auth, clerkClient } from '@clerk/nextjs/server';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import type { AlertPreferences } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertsForm } from './AlertsForm';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function AlertsPage() {
  const { userId } = auth();
  
  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 flex flex-col items-center">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl text-center shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
          <CardHeader className="items-center pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-5">
            <BellOff className="h-14 w-14 sm:h-16 md:h-20 text-primary mb-3 sm:mb-4 drop-shadow-lg" />
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary">Unlock Weather Alerts</CardTitle>
            <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 sm:mt-2.5 px-4 sm:px-6">
              To set up and receive personalized weather notifications, please sign in or create an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 pb-6 sm:pb-8">
            <SignInButton mode="modal">
              <Button size="lg" className="w-full sm:w-auto">Sign In</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">Create Account</Button>
            </SignUpButton>
          </CardContent>
        </Card>
      </div>
    );
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
  
  const savedPreferencesRaw = user.privateMetadata?.alertPreferences;

  const savedPreferences = savedPreferencesRaw 
    ? JSON.parse(JSON.stringify(savedPreferencesRaw)) as Partial<AlertPreferences> 
    : undefined;

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
