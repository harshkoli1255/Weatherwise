
'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { Navbar } from '@/components/Navbar';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { fetchWeatherAndSummaryAction, fetchCityByIpAction } from './actions';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CloudSun, MapPin, WifiOff } from 'lucide-react';
import Image from 'next/image';

interface WeatherPageState {
  data: WeatherSummaryData | null;
  error: string | null;
  isLoading: boolean;
  loadingMessage: string | null;
  cityNotFound: boolean; // To retain similar error display if OpenWeather can't find by coords/city
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
    if (weatherState.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: weatherState.error,
      });
    }
  }, [weatherState.error, toast]);

  useEffect(() => {
    setWeatherState(prev => ({ ...prev, isLoading: true, loadingMessage: "Detecting your location..." }));
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setWeatherState(prev => ({ ...prev, loadingMessage: "Fetching weather for your current location..." }));
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
          setWeatherState(prev => ({ ...prev, loadingMessage: "Geolocation failed. Trying IP lookup..." }));
          fetchWeatherByIp();
        }
      );
    } else {
      setWeatherState(prev => ({ ...prev, loadingMessage: "Geolocation not supported. Trying IP lookup..." }));
      fetchWeatherByIp();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array to run once on mount

  const fetchWeatherByIp = () => {
    startTransition(async () => {
      const ipResult = await fetchCityByIpAction();
      if (ipResult.error || !ipResult.city) {
        setWeatherState({
          data: null,
          error: ipResult.error || "Could not determine your location via IP.",
          isLoading: false,
          loadingMessage: null,
          cityNotFound: true, // Use this to show a general "location not found"
        });
      } else {
        setWeatherState(prev => ({ ...prev, loadingMessage: `Fetching weather for ${ipResult.city}...` }));
        const weatherResult = await fetchWeatherAndSummaryAction({ 
          city: ipResult.city, // We can pass city, lat, lon from IP if available
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
  };
  
  const isLoading = weatherState.isLoading || isTransitionPending;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center">
        <section className="w-full max-w-2xl mb-6 sm:mb-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-3 drop-shadow-lg">
            Weatherwise
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Real-time weather updates powered by your location.
          </p>
        </section>

        {isLoading && (
          <Card className="w-full max-w-lg mt-6 bg-card/70 backdrop-blur-md shadow-xl border border-primary/20 p-6">
            <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
              <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-lg text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && weatherState.data && (
          <WeatherDisplay weatherData={weatherState.data} />
        )}
        
        {!isLoading && !weatherState.data && weatherState.error && (
             <Card className="w-full max-w-lg mt-6 border-destructive/60 bg-destructive/10 backdrop-blur-md shadow-xl p-6">
                <CardHeader className="items-center text-center pt-2 pb-3">
                    {weatherState.error.toLowerCase().includes("location") ? 
                      <WifiOff className="h-14 w-14 text-destructive mb-3 drop-shadow-lg" /> :
                      <AlertCircle className="h-14 w-14 text-destructive mb-3 drop-shadow-lg" />
                    }
                    <CardTitle className="text-2xl font-headline text-destructive">
                        {weatherState.error.toLowerCase().includes("location") ? "Location Error" : "Weather Error"}
                    </CardTitle>
                     <CardDescription className="text-base text-destructive/90 mt-2 px-4">
                        {weatherState.error}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-2 px-4">
                     <Image src="https://placehold.co/300x160.png" alt="Error illustration" width={300} height={160} className="rounded-lg mt-2 opacity-90 shadow-md border border-border/20" data-ai-hint="map error network"/>
                </CardContent>
            </Card>
        )}

        {!isLoading && !weatherState.data && !weatherState.error && ( // Fallback initial message if nothing loads and no error shown yet
            <Card className="w-full max-w-lg mt-6 bg-card/80 backdrop-blur-md shadow-xl border border-primary/20 p-6">
                <CardHeader className="items-center text-center pt-2 pb-3">
                    <MapPin className="h-14 w-14 text-primary mb-3 drop-shadow-lg" />
                    <CardTitle className="text-2xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-base text-muted-foreground mt-2 px-4">
                        We're attempting to fetch weather for your current location. Please ensure location services are enabled if prompted.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center pb-2 px-4">
                    <Image src="https://placehold.co/320x180.png" alt="Weather illustration" width={320} height={180} className="rounded-lg mt-2 shadow-md border border-border/20" data-ai-hint="location world map"/>
                </CardContent>
            </Card>
        )}
      </main>
      <footer className="py-6 text-center text-base text-muted-foreground/80 border-t border-border/50 bg-background/80 backdrop-blur-sm">
        © {currentYear ?? new Date().getFullYear()} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}

    