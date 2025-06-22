
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
        <Card className="w-full max-w-md text-center bg-glass border-primary/20 shadow-2xl rounded-2xl">
          <CardHeader className="items-center pt-6 sm:pt-8 pb-4">
            <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
              <BellOff className="h-12 w-12 text-primary drop-shadow-lg" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-headline font-bold text-primary">Unlock Weather Alerts</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2 px-4">
              To set up and receive personalized weather notifications, please sign in or create an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 pb-6 sm:pb-8">
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
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 flex flex-col items-center">
      <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-2xl">
        <CardHeader className="text-center items-center pt-6 sm:pt-8 pb-4">
           <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
              <Bell className="h-12 w-12 text-primary drop-shadow-lg" />
           </div>
          <CardTitle className="text-2xl sm:text-3xl font-headline font-bold text-primary">Weather Alert Settings</CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2 px-4">
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
