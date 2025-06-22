
'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { SearchBar } from '@/components/SearchBar';
import { fetchWeatherAndSummaryAction, fetchCityByIpAction } from './actions';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, MapPin, Compass } from 'lucide-react';
import Image from 'next/image';

interface WeatherPageState {
  data: WeatherSummaryData | null;
  error: string | null;
  isLoading: boolean;
  loadingMessage: string | null;
  cityNotFound: boolean;
  currentFetchedCityName?: string;
}

interface ApiLocationParams {
  city?: string;
  lat?: number;
  lon?: number;
}

const initialState: WeatherPageState = {
  data: null,
  error: null,
  isLoading: false, // Set to false to prevent initial loading state
  loadingMessage: null,
  cityNotFound: false,
  currentFetchedCityName: undefined,
};

export default function WeatherPage() {
  const [weatherState, setWeatherState] = useState<WeatherPageState>(initialState);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (weatherState.error && !weatherState.isLoading) {
      toast({
        variant: "destructive",
        title: "Error",
        description: weatherState.error,
      });
    }
  }, [weatherState.error, weatherState.isLoading, toast]);

  const performWeatherFetch = useCallback((params: ApiLocationParams) => {
    setWeatherState(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage: `Searching for ${params.city}...`,
      data: null,
      error: null,
      cityNotFound: false,
    }));

    startTransition(async () => {
      const result = await fetchWeatherAndSummaryAction(params);

      setWeatherState(prev => ({
        data: result.data,
        error: result.error,
        isLoading: false,
        loadingMessage: null,
        cityNotFound: result.cityNotFound,
        currentFetchedCityName: result.data ? result.data.city : prev.currentFetchedCityName,
      }));
    });
  }, []);


  const handleSearch = (city: string, lat?: number, lon?: number) => {
    if (!city || city.trim() === "") {
      setWeatherState(prev => ({ ...prev, error: "Please enter a city name.", data: null, isLoading: false, cityNotFound: true, loadingMessage: null }));
      return;
    }
    const params: ApiLocationParams = { city: city.trim() };
    if (typeof lat === 'number' && typeof lon === 'number') {
      params.lat = lat;
      params.lon = lon;
    }
    performWeatherFetch(params);
  };

  const isLoadingDisplay = weatherState.isLoading || isTransitionPending;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-10 sm:py-12 md:py-16 lg:py-20 flex flex-col items-center">
        <section className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mb-8 sm:mb-10 md:mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-headline font-extrabold text-primary mb-4 sm:mb-5 md:mb-6 drop-shadow-lg">
            Weatherwise
          </h1>
          <p className="text-xl sm:text-2xl md:text-2xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 px-2">
            Your smart companion for real-time weather updates and AI-powered insights. Search any city to get started.
          </p>
          <div className="mt-1 w-full flex justify-center">
            <SearchBar
              onSearch={handleSearch}
              isSearchingWeather={isLoadingDisplay}
              currentCityName={weatherState.currentFetchedCityName}
            />
          </div>
        </section>

        {isLoadingDisplay && (
          <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 md:p-10 rounded-xl">
            <CardContent className="flex flex-col items-center justify-center space-y-5 sm:space-y-6 pt-6 sm:pt-8">
              <svg className="animate-spin h-20 w-20 sm:h-24 md:h-28 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xl sm:text-2xl text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
            </CardContent>
          </Card>
        )}

        {!isLoadingDisplay && weatherState.data && (
          <WeatherDisplay weatherData={weatherState.data} />
        )}

        {!isLoadingDisplay && !weatherState.data && weatherState.error && (
             <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 border-destructive/70 bg-destructive/15 backdrop-blur-lg shadow-xl p-6 sm:p-8 md:p-10 rounded-xl">
                <CardHeader className="items-center text-center pt-4 pb-4 sm:pb-5">
                    {weatherState.error.toLowerCase().includes("location") || weatherState.error.toLowerCase().includes("city not found") ?
                      <MapPin className="h-20 w-20 sm:h-24 md:h-28 text-destructive mb-4 sm:mb-5 drop-shadow-lg" /> :
                      <AlertCircle className="h-20 w-20 sm:h-24 md:h-28 text-destructive mb-4 sm:mb-5 drop-shadow-lg" />
                    }
                    <CardTitle className="text-3xl sm:text-4xl font-headline text-destructive">
                        {weatherState.error.toLowerCase().includes("location") ? "Location Error" :
                         weatherState.error.toLowerCase().includes("city not found") || weatherState.cityNotFound ? "City Not Found" :
                         "Weather Error"}
                    </CardTitle>
                     <CardDescription className="text-lg sm:text-xl text-destructive/90 mt-2.5 sm:mt-3.5 px-4 sm:px-6">
                        {weatherState.error}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-4 px-4 sm:px-6">
                     <Image src="https://placehold.co/400x250.png" alt="Error illustration" width={400} height={250} className="rounded-lg mt-3 sm:mt-4 opacity-90 shadow-lg border border-border/30" data-ai-hint="map network error"/>
                </CardContent>
            </Card>
        )}

        {!isLoadingDisplay && !weatherState.data && !weatherState.error && (
             <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 md:p-10 rounded-xl">
                <CardHeader className="items-center text-center pt-4 pb-4 sm:pb-5">
                    <Compass className="h-20 w-20 sm:h-24 md:h-28 text-primary mb-4 sm:mb-5 drop-shadow-lg" />
                    <CardTitle className="text-3xl sm:text-4xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-lg sm:text-xl text-muted-foreground mt-2.5 sm:mt-3.5 px-4 sm:px-6">
                        Please use the search bar above to find weather information for any city.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center pb-4 px-4 sm:px-6">
                    <Image src="https://placehold.co/420x260.png" alt="Weather exploration illustration" width={420} height={260} className="rounded-lg mt-3 sm:mt-4 shadow-lg border border-border/30" data-ai-hint="world map journey"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-6 sm:py-8 text-base sm:text-lg text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-md text-center">
        © {currentYear ?? new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
