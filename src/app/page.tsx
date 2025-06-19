
'use client';

import React, { useEffect, useState, useTransition, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { SearchBar } from '@/components/SearchBar';
import { fetchWeatherAndSummaryAction, fetchCityByIpAction } from './actions';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, MapPin } from 'lucide-react';
import Image from 'next/image';

interface WeatherPageState {
  data: WeatherSummaryData | null;
  error: string | null;
  isLoading: boolean;
  loadingMessage: string | null;
  cityNotFound: boolean;
}

const initialState: WeatherPageState = {
  data: null,
  error: null,
  isLoading: true,
  loadingMessage: "Initializing Weatherwise...",
  cityNotFound: false,
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

  const fetchWeatherByIp = useCallback(() => {
    setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: "Geolocation failed. Trying IP lookup..." }));
    startTransition(async () => {
      const ipResult = await fetchCityByIpAction();
      if (ipResult.error || !ipResult.city) {
        setWeatherState({
          data: null,
          error: ipResult.error || "Could not determine your location via IP. Please use the search bar.",
          isLoading: false,
          loadingMessage: null,
          cityNotFound: true,
        });
      } else {
        setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: `Fetching weather for ${ipResult.city} (via IP)...` }));
        const weatherResult = await fetchWeatherAndSummaryAction({
          city: ipResult.city,
          lat: ipResult.lat ?? undefined,
          lon: ipResult.lon ?? undefined
        });
        setWeatherState({
          data: weatherResult.data,
          error: weatherResult.error,
          isLoading: false,
          loadingMessage: null,
          cityNotFound: weatherResult.cityNotFound,
        });
      }
    });
  }, [startTransition]);

  useEffect(() => {
    setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: "Detecting your location..." }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: "Fetching weather for your current location..." }));
          startTransition(async () => {
            const result = await fetchWeatherAndSummaryAction({
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
            setWeatherState({
              data: result.data,
              error: result.error,
              isLoading: false,
              loadingMessage: null,
              cityNotFound: result.cityNotFound,
            });
          });
        },
        (error) => {
          console.warn(`Geolocation error: ${error.message}`);
          fetchWeatherByIp();
        }
      );
    } else {
      fetchWeatherByIp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWeatherByIp]);

  const handleSearch = (formData: FormData) => {
    const city = formData.get('city') as string;
    if (!city || city.trim() === "") {
      setWeatherState(prev => ({ ...prev, error: "Please enter a city name.", isLoading: false, cityNotFound: false, data: null, loadingMessage: null }));
      return;
    }

    setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: `Searching for ${city}...`, data: null, error: null, cityNotFound: false }));
    startTransition(async () => {
      const result = await fetchWeatherAndSummaryAction({ city });
      setWeatherState({
        data: result.data,
        error: result.error,
        isLoading: false,
        loadingMessage: null,
        cityNotFound: result.cityNotFound,
      });
    });
  };

  const isLoading = weatherState.isLoading || isTransitionPending;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 sm:py-8 md:py-10 flex flex-col items-center">
        <section className="w-full max-w-xs sm:max-w-md md:max-w-2xl mb-6 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary mb-2 sm:mb-3 drop-shadow-lg">
            Weatherwise
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-4 sm:mb-6">
            Automatic weather for your location, or search for any city.
          </p>
          <SearchBar onSearch={handleSearch} isSearching={isLoading} />
        </section>

        {isLoading && (
          <Card className="w-full max-w-xs sm:max-w-sm md:max-w-lg mt-4 sm:mt-6 bg-card/70 backdrop-blur-md shadow-xl border border-primary/20 p-4 sm:p-6">
            <CardContent className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 pt-4 sm:pt-6">
              <svg className="animate-spin h-10 w-10 sm:h-12 sm:w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-base sm:text-lg text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && weatherState.data && (
          <WeatherDisplay weatherData={weatherState.data} />
        )}

        {!isLoading && !weatherState.data && weatherState.error && (
             <Card className="w-full max-w-xs sm:max-w-sm md:max-w-lg mt-4 sm:mt-6 border-destructive/60 bg-destructive/10 backdrop-blur-md shadow-xl p-4 sm:p-6">
                <CardHeader className="items-center text-center pt-2 pb-2 sm:pb-3">
                    {weatherState.error.toLowerCase().includes("location") || weatherState.error.toLowerCase().includes("city not found") ?
                      <MapPin className="h-12 w-12 sm:h-14 sm:w-14 text-destructive mb-2 sm:mb-3 drop-shadow-lg" /> :
                      <AlertCircle className="h-12 w-12 sm:h-14 sm:w-14 text-destructive mb-2 sm:mb-3 drop-shadow-lg" />
                    }
                    <CardTitle className="text-xl sm:text-2xl font-headline text-destructive">
                        {weatherState.error.toLowerCase().includes("location") ? "Location Error" :
                         weatherState.error.toLowerCase().includes("city not found") || weatherState.cityNotFound ? "City Not Found" :
                         "Weather Error"}
                    </CardTitle>
                     <CardDescription className="text-sm sm:text-base text-destructive/90 mt-1 sm:mt-2 px-2 sm:px-4">
                        {weatherState.error}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-2 px-2 sm:px-4">
                     <Image src="https://placehold.co/250x125.png" alt="Error illustration" width={250} height={125} className="rounded-lg mt-1 sm:mt-2 opacity-90 shadow-md border border-border/20 sm:w-[300px] sm:h-[150px]" data-ai-hint="map error network"/>
                </CardContent>
            </Card>
        )}

        {!isLoading && !weatherState.data && !weatherState.error && weatherState.loadingMessage === "Initializing Weatherwise..." && (
            <Card className="w-full max-w-xs sm:max-w-sm md:max-w-lg mt-4 sm:mt-6 bg-card/80 backdrop-blur-md shadow-xl border border-primary/20 p-4 sm:p-6">
                <CardHeader className="items-center text-center pt-2 pb-2 sm:pb-3">
                    <MapPin className="h-12 w-12 sm:h-14 sm:w-14 text-primary mb-2 sm:mb-3 drop-shadow-lg" />
                    <CardTitle className="text-xl sm:text-2xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2 px-2 sm:px-4">
                        We're attempting to fetch weather for your current location. You can also use the search bar above.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-2 px-2 sm:px-4">
                    <Image src="https://placehold.co/280x140.png" alt="Weather illustration" width={280} height={140} className="rounded-lg mt-1 sm:mt-2 shadow-md border border-border/20 sm:w-[320px] sm:h-[160px]" data-ai-hint="location world map"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-3 sm:py-4 text-sm sm:text-base text-muted-foreground/80 border-t border-border/50 bg-background/80 backdrop-blur-sm text-center">
        © {currentYear ?? new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
