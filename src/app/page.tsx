
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
          error: ipResult.error || "Could not determine your location via IP. Please use the search bar if available.",
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
      <main className="flex-grow container mx-auto px-4 py-10 sm:py-12 md:py-16 lg:py-20 flex flex-col items-center">
        <section className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mb-8 sm:mb-10 md:mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-headline font-bold text-primary mb-4 sm:mb-5 md:mb-6 drop-shadow-lg">
            Weatherwise
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground mb-6 sm:mb-8 md:mb-10">
            Weather based on your location, or search any city.
          </p>
          {!isLoading && (
            <div className="mt-1 pl-4">
              <SearchBar onSearch={handleSearch} isSearching={isLoading} />
            </div>
          )}
        </section>

        {isLoading && (
          <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 md:p-10">
            <CardContent className="flex flex-col items-center justify-center space-y-5 sm:space-y-6 pt-6 sm:pt-8">
              <svg className="animate-spin h-14 w-14 sm:h-16 md:h-20 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xl sm:text-2xl text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && weatherState.data && (
          <WeatherDisplay weatherData={weatherState.data} />
        )}

        {!isLoading && !weatherState.data && weatherState.error && (
             <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 border-destructive/70 bg-destructive/15 backdrop-blur-lg shadow-xl p-6 sm:p-8 md:p-10">
                <CardHeader className="items-center text-center pt-4 pb-4 sm:pb-5">
                    {weatherState.error.toLowerCase().includes("location") || weatherState.error.toLowerCase().includes("city not found") ?
                      <MapPin className="h-16 w-16 sm:h-20 md:h-24 text-destructive mb-4 sm:mb-5 drop-shadow-lg" /> :
                      <AlertCircle className="h-16 w-16 sm:h-20 md:h-24 text-destructive mb-4 sm:mb-5 drop-shadow-lg" />
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
                     <Image src="https://placehold.co/350x175.png" alt="Error illustration" width={350} height={175} className="rounded-lg mt-3 sm:mt-4 opacity-90 shadow-lg border border-border/30 sm:w-[400px] sm:h-[200px]" data-ai-hint="map error network"/>
                </CardContent>
            </Card>
        )}

        {!isLoading && !weatherState.data && !weatherState.error && weatherState.loadingMessage === "Initializing Weatherwise..." && (
            <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 md:p-10">
                <CardHeader className="items-center text-center pt-4 pb-4 sm:pb-5">
                    <MapPin className="h-16 w-16 sm:h-20 md:h-24 text-primary mb-4 sm:mb-5 drop-shadow-lg" />
                    <CardTitle className="text-3xl sm:text-4xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-lg sm:text-xl text-muted-foreground mt-2.5 sm:mt-3.5 px-4 sm:px-6">
                        We're attempting to fetch weather for your current location. You can also use the search bar above once loading is complete.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex justify-center pb-4 px-4 sm:px-6">
                    <Image src="https://placehold.co/370x185.png" alt="Weather illustration" width={370} height={185} className="rounded-lg mt-3 sm:mt-4 shadow-lg border border-border/30 sm:w-[420px] sm:h-[210px]" data-ai-hint="location world map"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-6 sm:py-8 text-lg sm:text-xl text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-md text-center">
        © {currentYear ?? new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );

    