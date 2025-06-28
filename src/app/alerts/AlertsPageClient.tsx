'use client';

import { useState, useEffect } from 'react';
import { AlertsForm } from './AlertsForm';
import { getAlertPreferencesAction } from './actions';
import type { AlertPreferences } from '@/lib/types';
import { AlertsFormSkeleton } from './AlertsFormSkeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AlertsPageClient() {
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const result = await getAlertPreferencesAction();
        if (result.error || !result.preferences) {
          throw new Error(result.error || 'Could not load your preferences.');
        }
        setPreferences(result.preferences);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(message);
        toast({
            variant: 'destructive',
            title: 'Error Loading Preferences',
            description: message,
        })
      } finally {
        setIsLoading(false);
      }
    };
    fetchPreferences();
  }, [toast]);

  if (isLoading) {
    return <AlertsFormSkeleton />;
  }

  if (error || !preferences) {
    return (
        <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 flex flex-col items-center">
            <Card className="w-full max-w-lg text-center border-destructive/50 bg-destructive/10">
                <CardHeader className="items-center pt-8 pb-4">
                     <div className="p-3 bg-destructive/20 rounded-full mb-4 border border-destructive/30">
                        <AlertCircle className="h-12 w-12 text-destructive drop-shadow-lg" />
                     </div>
                    <CardTitle className="text-xl sm:text-2xl font-headline text-destructive">Failed to Load</CardTitle>
                    <CardDescription className="text-base text-destructive/90 mt-2 px-4">
                        There was an error loading your alert preferences. Please try refreshing the page.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{error}</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
     <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 flex flex-col items-center">
      <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-xl">
        <CardHeader className="text-center items-center pt-6 sm:pt-8 pb-4">
           <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
              <Bell className="h-10 w-10 text-primary drop-shadow-lg" />
           </div>
          <CardTitle className="text-xl sm:text-2xl font-headline font-bold text-primary">Manage Weather Alerts</CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2 px-4">
            Enable hourly email notifications and customize when and how often you receive them.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
          <AlertsForm preferences={preferences} />
        </CardContent>
      </Card>
    </div>
  );
}
