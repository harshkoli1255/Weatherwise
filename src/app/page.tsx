
'use client';

import React, { useEffect, useState, useTransition, useCallback, useRef } from 'react';
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
  isLoading: false, 
  loadingMessage: null,
  cityNotFound: false,
  currentFetchedCityName: undefined,
};

export default function WeatherPage() {
  const [weatherState, setWeatherState] = useState<WeatherPageState>(initialState);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();
  const initialFetchAttempted = useRef(false);

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
    const loadingMessage = params.city 
      ? `Searching for ${params.city}...` 
      : 'Fetching weather for your location...';
      
    setWeatherState(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage,
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

  const fetchWeatherByIp = useCallback(async () => {
    setWeatherState(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage: "Detecting location via IP...",
      error: null,
      data: null,
    }));

    startTransition(async () => {
      const ipLocationResult = await fetchCityByIpAction();
      if (ipLocationResult.error) {
        setWeatherState(prev => ({
          ...prev,
          isLoading: false,
          loadingMessage: null,
          error: `IP-based location failed: ${ipLocationResult.error}`,
          data: null,
        }));
      } else if (ipLocationResult.lat && ipLocationResult.lon) {
        performWeatherFetch({ lat: ipLocationResult.lat, lon: ipLocationResult.lon });
      } else if (ipLocationResult.city) {
        performWeatherFetch({ city: ipLocationResult.city });
      } else {
        setWeatherState(prev => ({
            ...prev,
            isLoading: false,
            loadingMessage: null,
            error: "Could not determine location from IP.",
            data: null,
        }));
      }
    });
  }, [performWeatherFetch]);


  useEffect(() => {
    if (typeof window === 'undefined' || initialFetchAttempted.current) {
        return;
    }
    initialFetchAttempted.current = true;

    setWeatherState(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage: 'Requesting location permission...',
      error: null,
      data: null,
    }));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setWeatherState(prev => ({ ...prev, loadingMessage: 'Location found. Fetching weather...' }));
          performWeatherFetch({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.warn(`Geolocation error (${error.code}): ${error.message}`);
          toast({
            title: "Location Access Denied",
            description: "Falling back to IP-based location.",
          });
          fetchWeatherByIp();
        },
        { timeout: 10000 }
      );
    } else {
      console.warn("Geolocation is not supported by this browser.");
      toast({
        title: "Geolocation Not Supported",
        description: "Falling back to IP-based location.",
      });
      fetchWeatherByIp();
    }
  }, [performWeatherFetch, fetchWeatherByIp, toast]);


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
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 flex flex-col items-center">
      <section className="w-full max-w-2xl mb-8 sm:mb-10 text-center">
        <h1 className="text-4xl sm:text-6xl font-headline font-extrabold text-primary mb-4 drop-shadow-lg">
          Weatherwise
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-6 sm:mb-8 px-2">
          Your smart companion for real-time weather updates and AI-powered insights.
        </p>
        <div className="mt-1 w-full flex justify-center px-2 sm:px-0">
          <SearchBar
            onSearch={handleSearch}
            isSearchingWeather={isLoadingDisplay}
            currentCityName={weatherState.currentFetchedCityName}
          />
        </div>
      </section>

      {isLoadingDisplay && (
        <Card className="w-full max-w-2xl mt-4 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 rounded-xl">
          <CardContent className="flex flex-col items-center justify-center space-y-5 pt-6">
            <svg className="animate-spin h-16 w-16 sm:h-20 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg sm:text-xl text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingDisplay && weatherState.data && (
        <WeatherDisplay weatherData={weatherState.data} />
      )}

      {!isLoadingDisplay && !weatherState.data && weatherState.error && (
           <Card className="w-full max-w-2xl mt-4 border-destructive/70 bg-destructive/15 backdrop-blur-lg shadow-xl p-6 sm:p-8 rounded-xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  {weatherState.error.toLowerCase().includes("location") || weatherState.error.toLowerCase().includes("city not found") ?
                    <MapPin className="h-16 w-16 sm:h-20 text-destructive mb-4 drop-shadow-lg" /> :
                    <AlertCircle className="h-16 w-16 sm:h-20 text-destructive mb-4 drop-shadow-lg" />
                  }
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-destructive">
                      {weatherState.error.toLowerCase().includes("location") ? "Location Error" :
                       weatherState.error.toLowerCase().includes("city not found") || weatherState.cityNotFound ? "City Not Found" :
                       "Weather Error"}
                  </CardTitle>
                   <CardDescription className="text-base sm:text-lg text-destructive/90 mt-2 px-4">
                      {weatherState.error}
                  </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-2 px-4">
                   <Image src="https://placehold.co/400x250.png" alt="Error illustration" width={400} height={250} className="rounded-lg mt-2 opacity-90 shadow-lg border border-border/30" data-ai-hint="map network error"/>
              </CardContent>
          </Card>
      )}

      {!isLoadingDisplay && !weatherState.data && !weatherState.error && (
           <Card className="w-full max-w-2xl mt-4 bg-card/80 backdrop-blur-lg shadow-xl border border-primary/20 p-6 sm:p-8 rounded-xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  <Compass className="h-16 w-16 sm:h-20 text-primary mb-4 drop-shadow-lg" />
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                  <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 px-4">
                      Use the search bar above to find weather information for any city.
                  </CardDescription>
              </CardHeader>
               <CardContent className="flex justify-center pb-2 px-4">
                  <Image src="https://placehold.co/420x260.png" alt="Weather exploration illustration" width={420} height={260} className="rounded-lg mt-2 shadow-lg border border-border/30" data-ai-hint="world map journey"/>
              </CardContent>
          </Card>
      )}
    </div>
  );
}
