
'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { fetchWeatherAndSummaryAction } from './actions';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Info, CloudSun } from 'lucide-react';
import Image from 'next/image';

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
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center">
        <section className="w-full max-w-lg mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-3">
            Weatherwise
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Get real-time weather updates and AI-powered summaries for any city.
          </p>
          <SearchBar onSearch={handleSearch} isSearching={isPending} />
        </section>

        {isPending && (
          <div className="flex flex-col items-center justify-center space-y-3 mt-10">
            <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg text-muted-foreground">Fetching weather data...</p>
          </div>
        )}

        {state.data && !isPending && (
          <WeatherDisplay weatherData={state.data} />
        )}
        
        {showInitialMessage && !state.data && !isPending && (
            <Card className="w-full max-w-lg mt-8 bg-card shadow-lg border border-primary/20">
                <CardHeader className="items-center text-center">
                    <CloudSun className="h-16 w-16 text-primary mb-3" />
                    <CardTitle className="text-2xl font-headline">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-md">
                        Enter a city name above to get the latest weather forecast and an AI-generated summary.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Image src="https://placehold.co/400x250.png" alt="Weather illustration" width={400} height={250} className="rounded-lg shadow-md" data-ai-hint="weather forecast illustration"/>
                </CardContent>
            </Card>
        )}

        {state.cityNotFound && !isPending && (
             <Card className="w-full max-w-lg mt-8 border-destructive/50 bg-destructive/10 shadow-lg">
                <CardHeader className="items-center text-center">
                    <AlertCircle className="h-16 w-16 text-destructive mb-3" />
                    <CardTitle className="text-2xl font-headline text-destructive">City Not Found</CardTitle>
                     <CardDescription className="text-md text-destructive/90">
                        We couldn't find the city you searched for. Please check the spelling or try a different city.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                     <Image src="https://placehold.co/350x200.png" alt="Map indicating not found" width={350} height={200} className="rounded-lg mt-2 opacity-80 shadow-md" data-ai-hint="map error location"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-8 text-center text-muted-foreground border-t border-border/50">
        © {new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
