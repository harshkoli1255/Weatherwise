
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellOff } from 'lucide-react';
import { AlertsPageClient } from './AlertsPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Alerts | Weatherwise',
  description: 'Manage your hourly weather alerts. Set up and customize your email notifications for any city.',
};

export default async function AlertsPage() {
  const { userId } = auth();
  
  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 flex flex-col items-center">
        <Card className="w-full max-w-md text-center bg-glass border-primary/20 shadow-2xl rounded-xl">
          <CardHeader className="items-center pt-8 pb-6">
            <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
              <BellOff className="h-12 w-12 text-primary drop-shadow-lg" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-headline font-bold text-primary">Manage Your Alerts</CardTitle>
            <CardDescription className="text-base text-muted-foreground mt-2 px-4">
              To set up and manage your hourly weather alerts, please sign in or create an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6 pb-8">
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

  // Render the client component which will handle its own data fetching.
  return <AlertsPageClient />;
}
