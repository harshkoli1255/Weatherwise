
'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { fetchWeatherAndSummaryAction } from './actions';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CloudSun } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

const initialState: {
  data: WeatherSummaryData | null;
  error: string | null;
  cityNotFound: boolean;
} = {
  data: null,
  error: null,
  cityNotFound: false,
};

export default function WeatherPage() {
  const [state, formAction] = useActionState(fetchWeatherAndSummaryAction, initialState);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [showInitialMessage, setShowInitialMessage] = useState(true);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  useEffect(() => {
    if (state.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.error,
      });
    }
    if (state.data || state.error) {
        setShowInitialMessage(false);
    }
  }, [state, toast]);

  const handleSearch = (formData: FormData) => {
    setShowInitialMessage(false);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col items-center">
        <section className="w-full max-w-xl mb-6 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary mb-2 drop-shadow-md">
            Weatherwise
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-4">
            Get real-time weather updates, AI-powered summaries, and 24-hour forecasts for any city.
          </p>
          <SearchBar onSearch={handleSearch} isSearching={isPending} />
        </section>

        {isPending && (
          <div className="flex flex-col items-center justify-center space-y-2 mt-4 p-4 bg-card/60 backdrop-blur-sm rounded-xl shadow-lg">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-muted-foreground font-medium">Fetching weather data...</p>
          </div>
        )}

        {state.data && !isPending && (
          <WeatherDisplay weatherData={state.data} />
        )}
        
        {showInitialMessage && !state.data && !isPending && (
            <Card className="w-full max-w-lg mt-4 bg-card/80 backdrop-blur-md shadow-xl border border-primary/20 transform hover:scale-[1.01] transition-transform duration-300">
                <CardHeader className="items-center text-center pt-6 pb-3">
                    <CloudSun className="h-12 w-12 text-primary mb-2 drop-shadow-lg" />
                    <CardTitle className="text-xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1 px-4">
                        Enter a city name above to get the latest weather forecast and an AI-generated summary.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-6 px-4">
                    <Image src="https://placehold.co/320x180.png" alt="Weather illustration" width={320} height={180} className="rounded-lg shadow-md border border-border/20" data-ai-hint="weather forecast app"/>
                </CardContent>
            </Card>
        )}

        {state.cityNotFound && !isPending && (
             <Card className="w-full max-w-lg mt-4 border-destructive/50 bg-destructive/10 backdrop-blur-sm shadow-xl transform hover:scale-[1.01] transition-transform duration-300">
                <CardHeader className="items-center text-center pt-6 pb-3">
                    <AlertCircle className="h-12 w-12 text-destructive mb-2 drop-shadow-lg" />
                    <CardTitle className="text-xl font-headline text-destructive">City Not Found</CardTitle>
                     <CardDescription className="text-sm text-destructive/90 mt-1 px-4">
                        We couldn't find the city you searched for. Please check the spelling or try a different city.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-6 px-4">
                     <Image src="https://placehold.co/280x150.png" alt="Map indicating not found" width={280} height={150} className="rounded-lg mt-1 opacity-90 shadow-md border border-border/20" data-ai-hint="map error"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground/80 border-t border-border/50 bg-background/70 backdrop-blur-sm">
        © {currentYear ?? ''} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
