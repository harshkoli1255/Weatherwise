
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

// Interface for the location used in API calls and for polling state
interface ApiLocationParams {
  city?: string;
  lat?: number;
  lon?: number;
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
  // Store the parameters of the last successful fetch for polling
  const [lastSuccessfulApiParams, setLastSuccessfulApiParams] = useState<ApiLocationParams | null>(null);


  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    // Show toast on error, but only if not in an active loading state initiated by direct user action (search/initial)
    // This helps avoid double toasting if the error also stops a poll.
    if (weatherState.error && !weatherState.isLoading && 
        !(weatherState.loadingMessage && weatherState.loadingMessage.includes("Searching for"))) {
      toast({
        variant: "destructive",
        title: "Error",
        description: weatherState.error,
      });
    }
  }, [weatherState.error, weatherState.isLoading, weatherState.loadingMessage, toast]);

  // Unified function to fetch weather and update state
  const performWeatherFetch = useCallback((params: ApiLocationParams, isPoll: boolean = false) => {
    if (!isPoll) { // For initial load or user search
      setWeatherState(prev => ({
        ...prev,
        isLoading: true,
        loadingMessage: params.city ? `Searching for ${params.city}...` : "Fetching weather for your location...",
        data: null, // Clear previous data for a new search/load
        error: null,
        cityNotFound: false,
      }));
    } else { // For polling
      // For polls, we still set isLoading true which will show the main spinner if no data is currently displayed.
      // If data is displayed, it will refresh without showing the main spinner, just updating values.
      setWeatherState(prev => ({ ...prev, isLoading: true, error: null /* Clear previous poll error */ }));
    }

    startTransition(async () => {
      const result = await fetchWeatherAndSummaryAction(params);
      
      setWeatherState({ // This update applies to both poll and initial/search
        data: result.data,
        error: result.error,
        isLoading: false,
        loadingMessage: null, // Clear loading message after fetch
        cityNotFound: result.cityNotFound,
      });

      if (result.data) {
        // If successful, store these params for polling.
        // Use result.data.city because the API might return a canonical city name.
        // Preserve original lat/lon if they were provided in params for accuracy.
        setLastSuccessfulApiParams({
            city: result.data.city,
            lat: params.lat, 
            lon: params.lon,
        });
      } else {
        // If any fetch (initial, search, or poll) fails to get data, stop polling.
        setLastSuccessfulApiParams(null);
        if (isPoll && result.error) {
            // If a poll itself fails, show a specific toast.
             toast({
                variant: "destructive",
                title: "Refresh Failed",
                description: result.error || "Could not refresh weather data.",
            });
        }
      }
    });
  }, [startTransition, toast]);


  // Effect for initial weather fetch (geolocation or IP)
  useEffect(() => {
    setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: "Detecting your location..." }));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          performWeatherFetch({ lat: position.coords.latitude, lon: position.coords.longitude }, false);
        },
        async (geoError) => {
          console.warn(`Geolocation error: ${geoError.message}. Falling back to IP lookup.`);
          const ipResult = await fetchCityByIpAction();
          if (ipResult.error || !ipResult.city) {
            setWeatherState({ 
              data: null,
              error: ipResult.error || "Could not determine your location. Please use the search bar.",
              isLoading: false,
              loadingMessage: null,
              cityNotFound: true,
            });
            setLastSuccessfulApiParams(null); 
          } else {
            performWeatherFetch({ city: ipResult.city, lat: ipResult.lat, lon: ipResult.lon }, false);
          }
        }
      );
    } else { 
      (async () => {
        console.warn('Geolocation not supported. Falling back to IP lookup.');
        const ipResult = await fetchCityByIpAction();
        if (ipResult.error || !ipResult.city) {
           setWeatherState({ 
              data: null,
              error: ipResult.error || "Could not determine your location. Please use the search bar.",
              isLoading: false,
              loadingMessage: null,
              cityNotFound: true,
            });
           setLastSuccessfulApiParams(null); 
        } else {
          performWeatherFetch({ city: ipResult.city, lat: ipResult.lat, lon: ipResult.lon }, false);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const handleSearch = (formData: FormData) => {
    const city = formData.get('city') as string;
    if (!city || city.trim() === "") {
      setWeatherState(prev => ({ ...prev, error: "Please enter a city name.", data: null, isLoading: false, cityNotFound: true, loadingMessage: null }));
      setLastSuccessfulApiParams(null); 
      return;
    }
    performWeatherFetch({ city: city.trim() }, false);
  };

  // Effect for polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (lastSuccessfulApiParams && weatherState.data && !weatherState.error) {
      console.log(`Starting weather poll for: ${lastSuccessfulApiParams.city || `lat/lon: ${lastSuccessfulApiParams.lat}/${lastSuccessfulApiParams.lon}`}. Interval: 1 second.`);
      intervalId = setInterval(() => {
        console.log(`Polling weather data for: ${lastSuccessfulApiParams.city || `lat/lon: ${lastSuccessfulApiParams.lat}/${lastSuccessfulApiParams.lon}`}`);
        performWeatherFetch(lastSuccessfulApiParams, true);
      }, 1000); 
    } else {
      if (intervalId) clearInterval(intervalId); 
      console.log('Polling conditions not met. Current polling parameters:', lastSuccessfulApiParams, 'Data present:', !!weatherState.data, 'No error:', !weatherState.error);
    }

    return () => {
      if (intervalId) {
        console.log('Clearing weather poll interval.');
        clearInterval(intervalId);
      }
    };
  }, [lastSuccessfulApiParams, weatherState.data, weatherState.error, performWeatherFetch]);

  const isLoadingDisplay = weatherState.isLoading || isTransitionPending;

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
          {(!isLoadingDisplay || weatherState.data) && ( 
            <div className="mt-1 pl-4">
              <SearchBar onSearch={handleSearch} isSearching={isLoadingDisplay && !weatherState.data} />
            </div>
          )}
        </section>

        {isLoadingDisplay && !weatherState.data && ( 
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

        {!isLoadingDisplay && weatherState.data && (
          <WeatherDisplay weatherData={weatherState.data} />
        )}
        
        {!isLoadingDisplay && !weatherState.data && weatherState.error && (
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

        {/* Fallback for initial state or if loading is done, no data, and no error */}
        {!isLoadingDisplay && !weatherState.data && !weatherState.error && (
             <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl mt-8 sm:mt-10 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 md:p-10">
                <CardHeader className="items-center text-center pt-4 pb-4 sm:pb-5">
                    <MapPin className="h-16 w-16 sm:h-20 md:h-24 text-primary mb-4 sm:mb-5 drop-shadow-lg" />
                    <CardTitle className="text-3xl sm:text-4xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-lg sm:text-xl text-muted-foreground mt-2.5 sm:mt-3.5 px-4 sm:px-6">
                        Please use the search bar above to find weather information for any city.
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
}
    
