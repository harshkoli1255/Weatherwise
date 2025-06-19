
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
    setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: "Attempting IP lookup for location..." }));
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
  }, [fetchWeatherByIp]); // Dependencies are correct for initial load

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
      <main className="flex-grow container mx-auto px-4 py-6 sm:py-8 md:py-10 flex flex-col items-center">
        <section className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mb-6 sm:mb-8 md:mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-primary mb-3 sm:mb-4 md:mb-5 drop-shadow-lg">
            Weatherwise
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-5 sm:mb-7 md:mb-9">
            Automatic weather, or search any city.
          </p>
          <div className="mt-1 pl-2"> {/* Wrapper for SearchBar positioning */}
            <SearchBar onSearch={handleSearch} isSearching={isLoading} />
          </div>
        </section>

        {isLoading && (
          <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mt-6 sm:mt-8 bg-card/70 backdrop-blur-md shadow-xl border border-primary/20 p-5 sm:p-7">
            <CardContent className="flex flex-col items-center justify-center space-y-4 sm:space-y-5 pt-5 sm:pt-7">
              <svg className="animate-spin h-12 w-12 sm:h-14 sm:w-14 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-lg sm:text-xl text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && weatherState.data && (
          <WeatherDisplay weatherData={weatherState.data} />
        )}

        {!isLoading && !weatherState.data && weatherState.error && (
             <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mt-6 sm:mt-8 border-destructive/60 bg-destructive/10 backdrop-blur-md shadow-xl p-5 sm:p-7">
                <CardHeader className="items-center text-center pt-3 pb-3 sm:pb-4">
                    {weatherState.error.toLowerCase().includes("location") || weatherState.error.toLowerCase().includes("city not found") ?
                      <MapPin className="h-14 w-14 sm:h-16 sm:w-16 text-destructive mb-3 sm:mb-4 drop-shadow-lg" /> :
                      <AlertCircle className="h-14 w-14 sm:h-16 sm:w-16 text-destructive mb-3 sm:mb-4 drop-shadow-lg" />
                    }
                    <CardTitle className="text-2xl sm:text-3xl font-headline text-destructive">
                        {weatherState.error.toLowerCase().includes("location") ? "Location Error" :
                         weatherState.error.toLowerCase().includes("city not found") || weatherState.cityNotFound ? "City Not Found" :
                         "Weather Error"}
                    </CardTitle>
                     <CardDescription className="text-base sm:text-lg text-destructive/90 mt-2 sm:mt-3 px-3 sm:px-5">
                        {weatherState.error}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-3 px-3 sm:px-5">
                     <Image src="https://placehold.co/300x150.png" alt="Error illustration" width={300} height={150} className="rounded-lg mt-2 sm:mt-3 opacity-90 shadow-md border border-border/20 sm:w-[350px] sm:h-[175px]" data-ai-hint="map error network"/>
                </CardContent>
            </Card>
        )}

        {!isLoading && !weatherState.data && !weatherState.error && weatherState.loadingMessage === "Initializing Weatherwise..." && (
            // This state is brief, primarily for the initial "Initializing" message if geolocation & IP lookup are very fast or both fail quickly.
            // Consider if this card is still needed or if the loading spinner alone is sufficient.
            <Card className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mt-6 sm:mt-8 bg-card/80 backdrop-blur-md shadow-xl border border-primary/20 p-5 sm:p-7">
                <CardHeader className="items-center text-center pt-3 pb-3 sm:pb-4">
                    <MapPin className="h-14 w-14 sm:h-16 sm:w-16 text-primary mb-3 sm:mb-4 drop-shadow-lg" />
                    <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 sm:mt-3 px-3 sm:px-5">
                        We're attempting to fetch weather for your current location. You can also use the search bar above.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center pb-3 px-3 sm:px-5">
                    <Image src="https://placehold.co/320x160.png" alt="Weather illustration" width={320} height={160} className="rounded-lg mt-2 sm:mt-3 shadow-md border border-border/20 sm:w-[370px] sm:h-[185px]" data-ai-hint="location world map"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-4 sm:py-5 text-base sm:text-lg text-muted-foreground/80 border-t border-border/50 bg-background/80 backdrop-blur-sm text-center">
        © {currentYear ?? new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}
