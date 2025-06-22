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
import { WeatherLoadingAnimation } from '@/components/WeatherLoadingAnimation';

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
      ...initialState,
      isLoading: true,
      loadingMessage,
      currentFetchedCityName: prev.currentFetchedCityName,
    }));

    startTransition(async () => {
      const result = await fetchWeatherAndSummaryAction(params);
      
      if (!result) {
        setWeatherState({
          ...initialState,
          isLoading: false,
          error: 'An unexpected server error occurred. Please try again.',
        });
        return;
      }
      
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

  useEffect(() => {
    if (typeof window === 'undefined' || initialFetchAttempted.current) {
        return;
    }
    initialFetchAttempted.current = true;

    const getInitialWeather = async () => {
      setWeatherState({
        ...initialState,
        isLoading: true,
        loadingMessage: 'Detecting your location...',
      });

      const getPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            return reject(new Error('Geolocation is not supported.'));
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
      };

      let weatherParams: ApiLocationParams | null = null;
      let locationSource = '';

      try {
        setWeatherState(prev => ({ ...prev, loadingMessage: 'Requesting location permission...' }));
        const position = await getPosition();
        weatherParams = { lat: position.coords.latitude, lon: position.coords.longitude };
        locationSource = 'geolocation';
      } catch (geoError: any) {
        console.warn(`Geolocation error: ${geoError.message}`);
        toast({
          title: "Location permission denied",
          description: "Falling back to IP-based location.",
          duration: 5000,
        });
        
        try {
          setWeatherState(prev => ({ ...prev, loadingMessage: 'Detecting location via IP...' }));
          const ipResult = await fetchCityByIpAction();
          if (ipResult.error || typeof ipResult.lat !== 'number' || typeof ipResult.lon !== 'number') {
            throw new Error(ipResult.error || 'Could not determine location coordinates from IP.');
          }
          weatherParams = { lat: ipResult.lat, lon: ipResult.lon };
          locationSource = 'IP lookup';
        } catch (ipError: any) {
          setWeatherState({
            ...initialState,
            isLoading: false,
            error: `Location detection failed. ${ipError.message} Please use the search bar.`,
          });
          return;
        }
      }
      
      if (weatherParams) {
        setWeatherState(prev => ({ ...prev, loadingMessage: `Fetching weather using ${locationSource}...` }));
        startTransition(async () => {
          const result = await fetchWeatherAndSummaryAction(weatherParams!);

          if (!result) {
            setWeatherState({
              ...initialState,
              isLoading: false,
              error: 'An unexpected server error occurred. Please try again.',
            });
            return;
          }

          setWeatherState({
            data: result.data,
            error: result.error,
            isLoading: false,
            loadingMessage: null,
            cityNotFound: result.cityNotFound,
            currentFetchedCityName: result.data ? result.data.city : undefined,
          });
        });
      } else {
        setWeatherState({ ...initialState, isLoading: false });
      }
    };

    getInitialWeather();
  }, [performWeatherFetch, toast]);


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
      <section className="w-full max-w-3xl mb-8 sm:mb-10 text-center">
        <h1 className="text-4xl sm:text-6xl font-headline font-extrabold text-primary mb-4 drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-b from-primary to-primary/70">
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
        <Card className="w-full max-w-2xl mt-4 bg-glass border-primary/20 p-6 sm:p-8 rounded-xl shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center space-y-5 pt-6">
            <WeatherLoadingAnimation className="h-20 w-20 sm:h-24 sm:w-24 text-primary" />
            <p className="text-lg sm:text-xl text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingDisplay && weatherState.data && (
        <WeatherDisplay weatherData={weatherState.data} />
      )}

      {!isLoadingDisplay && !weatherState.data && weatherState.error && (
           <Card className="w-full max-w-2xl mt-4 border-destructive/50 bg-destructive/10 backdrop-blur-lg shadow-xl p-6 sm:p-8 rounded-xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  <div className="p-3 bg-destructive/20 rounded-full mb-4 border border-destructive/30">
                    {weatherState.error.toLowerCase().includes("location") || weatherState.error.toLowerCase().includes("city not found") ?
                        <MapPin className="h-12 w-12 text-destructive drop-shadow-lg" /> :
                        <AlertCircle className="h-12 w-12 text-destructive drop-shadow-lg" />
                    }
                  </div>
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
                   <Image src="https://placehold.co/400x250.png" alt="Error illustration" width={400} height={250} className="rounded-lg mt-2 opacity-80 shadow-lg" data-ai-hint="map network error"/>
              </CardContent>
          </Card>
      )}

      {!isLoadingDisplay && !weatherState.data && !weatherState.error && (
           <Card className="w-full max-w-2xl mt-4 bg-glass border-primary/20 p-6 sm:p-8 rounded-xl shadow-2xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  <div className="p-3 bg-primary/20 rounded-full mb-4 border border-primary/30">
                    <Compass className="h-12 w-12 text-primary drop-shadow-lg" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                  <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 px-4">
                      Use the search bar above to find weather information for any city.
                  </CardDescription>
              </CardHeader>
               <CardContent className="flex justify-center pb-4 pt-8 px-4">
                  <WeatherLoadingAnimation className="h-32 w-32 text-primary" />
              </CardContent>
          </Card>
      )}
    </div>
  );
}
