'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Navbar } from '@/components/Navbar';
import { SearchBar } from '@/components/SearchBar';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { fetchWeatherAndSummaryAction } from './actions';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Info } from 'lucide-react';
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return null; // SearchBar handles its own pending state display
}

export default function WeatherPage() {
  const [state, formAction] = useFormState(fetchWeatherAndSummaryAction, initialState);
  const { pending } = useFormStatus(); // This hook needs to be inside a form consuming component
  const { toast } = useToast();
  const [showInitialMessage, setShowInitialMessage] = React.useState(true);

  React.useEffect(() => {
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
    formAction(formData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <section className="w-full max-w-md mb-8">
          <h1 className="text-4xl font-headline text-center mb-2 text-primary">
            Weatherwise
          </h1>
          <p className="text-center text-muted-foreground mb-6">
            Get real-time weather updates and AI-powered summaries for any city.
          </p>
          <SearchBar onSearch={handleSearch} isSearching={pending} />
          <SubmitButton /> {/* For useFormStatus if SearchBar was part of this form directly */}
        </section>

        {pending && (
          <div className="flex flex-col items-center justify-center space-y-2 mt-8">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-muted-foreground">Fetching weather data...</p>
          </div>
        )}

        {state.data && !pending && (
          <WeatherDisplay weatherData={state.data} />
        )}
        
        {showInitialMessage && !state.data && !pending && (
            <Card className="w-full max-w-md mt-8 bg-primary/10 border-primary/30">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                        <Image src="https://placehold.co/400x200.png" alt="Weather illustration" width={400} height={200} className="rounded-md mb-4" data-ai-hint="weather forecast"/>
                        <Info className="h-12 w-12 text-primary mb-4" />
                        <h2 className="text-xl font-headline mb-2">Welcome to Weatherwise!</h2>
                        <p className="text-muted-foreground">
                            Enter a city name above to get the latest weather forecast and an AI-generated summary.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )}

        {state.cityNotFound && !pending && (
             <Card className="w-full max-w-md mt-8 border-destructive bg-destructive/10">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h2 className="text-xl font-headline mb-2 text-destructive">City Not Found</h2>
                        <p className="text-destructive/80">
                            We couldn't find the city you searched for. Please check the spelling or try a different city.
                        </p>
                        <Image src="https://placehold.co/300x200.png" alt="Map indicating not found" width={300} height={200} className="rounded-md mt-4 opacity-70" data-ai-hint="map error"/>
                    </div>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
