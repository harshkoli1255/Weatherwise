
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
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex flex-col items-center overflow-y-auto">
        <section className="w-full max-w-xl mb-2 text-center">
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-primary mb-1 drop-shadow-sm">
            Weatherwise
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-2">
            Get real-time weather updates, AI-powered summaries, and 24-hour forecasts for any city.
          </p>
          <SearchBar onSearch={handleSearch} isSearching={isPending} />
        </section>

        {isPending && (
          <div className="flex flex-col items-center justify-center space-y-1 mt-2 p-2 bg-card/50 backdrop-blur-sm rounded-xl shadow-lg">
            <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xs text-muted-foreground font-medium">Fetching weather data...</p>
          </div>
        )}

        {state.data && !isPending && (
          <WeatherDisplay weatherData={state.data} />
        )}
        
        {showInitialMessage && !state.data && !isPending && (
            <Card className="w-full max-w-lg mt-2 bg-card/80 backdrop-blur-md shadow-xl border border-primary/20 transform hover:scale-[1.01] transition-transform duration-300">
                <CardHeader className="items-center text-center pt-2.5 pb-1">
                    <CloudSun className="h-9 w-9 text-primary mb-1 drop-shadow-lg" />
                    <CardTitle className="text-base font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5 px-2">
                        Enter a city name above to get the latest weather forecast and an AI-generated summary.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-2 px-2">
                    <Image src="https://placehold.co/280x150.png" alt="Weather illustration" width={280} height={150} className="rounded-md shadow-sm border border-border/20" data-ai-hint="weather forecast app"/>
                </CardContent>
            </Card>
        )}

        {state.cityNotFound && !isPending && (
             <Card className="w-full max-w-lg mt-2 border-destructive/50 bg-destructive/10 backdrop-blur-sm shadow-xl transform hover:scale-[1.01] transition-transform duration-300">
                <CardHeader className="items-center text-center pt-2.5 pb-1">
                    <AlertCircle className="h-9 w-9 text-destructive mb-1 drop-shadow-lg" />
                    <CardTitle className="text-base font-headline text-destructive">City Not Found</CardTitle>
                     <CardDescription className="text-xs text-destructive/90 mt-0.5 px-2">
                        We couldn't find the city you searched for. Please check the spelling or try a different city.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-2 px-2">
                     <Image src="https://placehold.co/240x120.png" alt="Map indicating not found" width={240} height={120} className="rounded-md mt-0.5 opacity-90 shadow-sm border border-border/20" data-ai-hint="map error"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-2 text-center text-xs text-muted-foreground/80 border-t border-border/50 bg-background/70 backdrop-blur-sm">
        © {currentYear ?? ''} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
