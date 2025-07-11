
'use client';

import React, { useEffect, useState, useTransition, useCallback, Suspense, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { SearchBar } from '@/components/SearchBar';
import { fetchWeatherAndSummaryAction, fetchCityByIpAction, getAIErrorSummaryAction, proactiveWeatherCheckAction } from './actions';
import type { WeatherSummaryData, CitySuggestion, ProactiveAlertResult } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { useDefaultLocation } from '@/hooks/useDefaultLocation';
import { useLastSearch } from '@/hooks/useLastSearch.tsx';
import { useLastWeatherResult } from '@/hooks/useLastWeatherResult';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, Compass, Leaf, Waypoints } from 'lucide-react';
import { WeatherLoadingAnimation } from '@/components/WeatherLoadingAnimation';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { WeatherIcon } from '@/components/WeatherIcon';

interface WeatherPageState {
  data: WeatherSummaryData | null;
  error: string | null;
  isLoading: boolean;
  loadingMessage: string | null;
  cityNotFound: boolean;
}

interface ApiLocationParams {
  city?: string;
  lat?: number;
  lon?: number;
  forceRefresh?: boolean;
}

const initialState: WeatherPageState = {
  data: null,
  error: null,
  isLoading: false, 
  loadingMessage: null,
  cityNotFound: false,
};

// This scale is duplicated here to be used by the AQI notification logic.
// It now uses themed chart colors to ensure consistency with the rest of the app.
const aqiScale = [
  { aqi: 1, level: "Good", impact: "Minimal impact.", borderColorClass: "border-success/50", bgColorClass: "bg-success/10", colorClass: "text-success" },
  { aqi: 2, level: "Fair", impact: "May cause minor breathing discomfort to sensitive people.", borderColorClass: "border-chart-5/50", bgColorClass: "bg-chart-5/10", colorClass: "text-chart-5" },
  { aqi: 3, level: "Moderate", impact: "May cause breathing discomfort to people with lung disease, children, and older adults.", borderColorClass: "border-chart-4/50", bgColorClass: "bg-chart-4/10", colorClass: "text-chart-4" },
  { aqi: 4, level: "Poor", impact: "May cause breathing discomfort on prolonged exposure and discomfort to people with heart disease.", borderColorClass: "border-destructive/50", bgColorClass: "bg-destructive/10", colorClass: "text-destructive" },
  { aqi: 5, level: "Very Poor", impact: "May cause respiratory illness on prolonged exposure. Effects may be more pronounced in people with lung and heart diseases.", borderColorClass: "border-chart-3/50", bgColorClass: "bg-chart-3/10", colorClass: "text-chart-3" },
];


function WeatherPageContent() {
  const [weatherState, setWeatherState] = useState<WeatherPageState>(initialState);
  const [isLocating, setIsLocating] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [initialSearchTerm, setInitialSearchTerm] = useState('');
  
  const { toast } = useToast();
  const { saveLocation, removeLocation, isLocationSaved } = useSavedLocations();
  const { lastWeatherResult, setLastWeatherResult, clearLastWeatherResult, isInitialized: isSessionInitialized } = useLastWeatherResult();
  const { isLoaded: isClerkLoaded, isSignedIn } = useUser();

  const [activeTab, setActiveTab] = useState('forecast');
  const [isAqiNotificationVisible, setIsAqiNotificationVisible] = useState(false);
  const [proactiveAlert, setProactiveAlert] = useState<ProactiveAlertResult | null>(null);

  const lastProactiveCheckCoords = useRef<{ lat: number; lon: number } | null>(null);

  const [notificationPortal, setNotificationPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const portalRoot = document.getElementById('notification-portal-root');
    setNotificationPortal(portalRoot);
  }, []);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const performWeatherFetch = useCallback((params: ApiLocationParams) => {
    setIsAqiNotificationVisible(false);

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

      if (result.data) {
        const cityForStorage: CitySuggestion = {
            name: result.data.city,
            country: result.data.country,
            lat: result.data.lat,
            lon: result.data.lon,
        };
        setLastWeatherResult(result.data);

        if (result.data.airQuality && result.data.airQuality.aqi >= 3) {
            setActiveTab('forecast');
            setIsAqiNotificationVisible(true);
        } else if (result.data.airQuality && result.data.airQuality.aqi >= 2) {
             setActiveTab('health');
        }

      } else {
        // This is the key change: do NOT clear the last successful result on a failed search.
      }
      
      setWeatherState({
        data: result.data,
        error: result.error,
        isLoading: false,
        loadingMessage: null,
        cityNotFound: result.cityNotFound,
      });
    });
  }, [setLastWeatherResult]);

  const aqiInfo = useMemo(() => {
    if (!weatherState.data?.airQuality) return null;
    return aqiScale.find(item => item.aqi === weatherState.data?.airQuality?.aqi) || null;
  }, [weatherState.data?.airQuality]);

  const handleSearch = useCallback((city: string, lat?: number, lon?: number) => {
    if (!city || city.trim() === "") {
      setWeatherState(prev => ({ ...prev, error: "Please enter a city name.", data: null, isLoading: false, cityNotFound: true, loadingMessage: null }));
      return;
    }

    setWeatherState(prevState => ({
        ...prevState,
        isLoading: true,
        loadingMessage: `Searching for ${city.trim()}...`,
        error: null,
        cityNotFound: false,
    }));
    
    const params: ApiLocationParams = { city: city.trim() };
    if (typeof lat === 'number') params.lat = lat;
    if (typeof lon === 'number') params.lon = lon;
    
    performWeatherFetch(params);
  }, [performWeatherFetch]);

  useEffect(() => {
    // This effect runs once when the component is ready.
    // It restores the previous session if available, otherwise it does nothing.
    if (isSessionInitialized) {
        if (lastWeatherResult) {
            setWeatherState({
                data: lastWeatherResult,
                isLoading: false,
                error: null,
                loadingMessage: null,
                cityNotFound: false,
            });
            setInitialSearchTerm(lastWeatherResult.city);
        } else {
             // No session, just show the welcome screen without fetching.
             setWeatherState(initialState);
        }
    }
  }, [isSessionInitialized, lastWeatherResult]);


  useEffect(() => {
    const handleSearchEvent = (event: Event) => {
        const citySuggestion = (event as CustomEvent<CitySuggestion>).detail;
        if (citySuggestion) {
            handleSearch(citySuggestion.name, citySuggestion.lat, citySuggestion.lon);
        }
    };

    window.addEventListener('weather-search', handleSearchEvent);
    return () => {
        window.removeEventListener('weather-search', handleSearchEvent);
    };
  }, [handleSearch]);
  
  useEffect(() => {
    if (weatherState.error && !weatherState.isLoading && !weatherState.cityNotFound) {
        const t = toast({
            variant: "destructive",
            title: "An Error Occurred",
            description: "Analyzing...",
        });
        getAIErrorSummaryAction(weatherState.error).then(aiDescription => {
            t.update({ description: aiDescription });
        });
    }
  }, [weatherState.error, weatherState.isLoading, weatherState.cityNotFound, toast]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || !navigator.permissions) {
        return;
    }

    let watchId: number | null = null;

    const handlePositionChange = async (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;

        if (lastProactiveCheckCoords.current) {
            const distance = getDistance(
                lastProactiveCheckCoords.current.lat,
                lastProactiveCheckCoords.current.lon,
                latitude,
                longitude
            );

            if (distance < 1) {
                return;
            }
        }
        
        lastProactiveCheckCoords.current = { lat: latitude, lon: longitude };
        
        startTransition(async () => {
             const alertResult = await proactiveWeatherCheckAction(latitude, longitude);
             if (alertResult) {
                 setProactiveAlert(alertResult);
                 setTimeout(() => setProactiveAlert(p => p === alertResult ? null : p), 60000);
             }
        })
    };

    const handleError = (error: GeolocationPositionError) => {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    };

    const startWatching = () => {
        if (watchId === null) {
            watchId = navigator.geolocation.watchPosition(
                handlePositionChange,
                handleError,
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 15000 }
            );
        }
    };

    const stopWatching = () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    };

    const checkPermissionsAndWatch = async () => {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            if (permissionStatus.state === 'granted') {
                startWatching();
            } else {
                stopWatching();
            }
            permissionStatus.onchange = () => {
                if (permissionStatus.state === 'granted') {
                    startWatching();
                } else {
                    stopWatching();
                }
            };
        } catch(e) {
            console.error("Geolocation permissions API not supported.", e)
        }
    };

    checkPermissionsAndWatch();

    return () => {
        stopWatching();
    };
}, []);

  const handleSaveCityToggle = useCallback(() => {
    if (!weatherState.data) return;

    const cityData: CitySuggestion = {
      name: weatherState.data.city,
      country: weatherState.data.country,
      lat: weatherState.data.lat,
      lon: weatherState.data.lon,
    };

    if (isLocationSaved(cityData)) {
      removeLocation(cityData);
    } else {
      saveLocation(cityData);
    }
  }, [weatherState.data, isLocationSaved, saveLocation, removeLocation]);
  
  const handleRefresh = useCallback(() => {
    if (!weatherState.data) return;

    setWeatherState(prevState => ({
        ...prevState,
        isLoading: true,
        loadingMessage: `Refreshing data for ${prevState.data?.city}...`,
        error: null,
        cityNotFound: false,
    }));

    performWeatherFetch({
      lat: weatherState.data.lat,
      lon: weatherState.data.lon,
      city: weatherState.data.city,
      forceRefresh: true,
    });
  }, [weatherState.data, performWeatherFetch]);

  const isCurrentLocationSaved = weatherState.data ? isLocationSaved(weatherState.data) : false;
  const isLoadingDisplay = weatherState.isLoading || isTransitionPending;

  useEffect(() => {
    if (isClerkLoaded && !isSignedIn) {
      clearLastWeatherResult();
    }
  }, [isClerkLoaded, isSignedIn, clearLastWeatherResult]);

  return (
    <>
      <div className="container mx-auto px-4 py-6 sm:py-10 md:py-12 flex flex-col items-center">
        <section className="relative z-10 w-full max-w-2xl mb-6 sm:mb-8 text-center animate-in fade-in-up">
          <h1 className="text-3xl sm:text-5xl font-headline font-extrabold text-primary mb-3 drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-b from-primary to-primary/70">
            Weatherwise
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6 px-2">
            Your smart companion for real-time weather updates and AI-powered insights.
          </p>
          <div className="mt-1 w-full flex justify-center px-2 sm:px-0">
            <SearchBar
              onSearch={handleSearch}
              isSearchingWeather={isTransitionPending}
              initialValue={initialSearchTerm}
              onLocate={() => {
                setIsLocating(true);
                // The automatic search logic was removed to favor user-initiated actions.
                // This callback will be updated to trigger the search.
                fetchCityByIpAction()
                  .then(res => {
                    if (res.city && res.lat && res.lon) {
                      handleSearch(res.city, res.lat, res.lon);
                    } else {
                      toast({ title: 'Location Error', description: res.error || 'Could not find your location.' });
                    }
                  })
                  .finally(() => setIsLocating(false));
              }}
              isLocating={isLocating}
            />
          </div>
        </section>

        {isLoadingDisplay && (
          <div className="w-full max-w-2xl mt-4 p-6 sm:p-8 rounded-lg animate-in fade-in-0">
            <WeatherLoadingAnimation message={weatherState.loadingMessage || "Loading..."} />
          </div>
        )}

        {!isLoadingDisplay && weatherState.data && (
          <SignedIn>
              <WeatherDisplay
              weatherData={weatherState.data}
              isLocationSaved={isCurrentLocationSaved}
              onSaveCityToggle={handleSaveCityToggle}
              onRefresh={handleRefresh}
              isRefreshing={isTransitionPending}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              />
          </SignedIn>
        )}
        
        {!isLoadingDisplay && weatherState.data && (
          <SignedOut>
              <WeatherDisplay
                  weatherData={weatherState.data}
                  isLocationSaved={false}
                  onSaveCityToggle={() => toast({ title: "Sign in to save locations", description: "Create an account to save and manage your locations."})}
                  onRefresh={handleRefresh}
                  isRefreshing={isTransitionPending}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
              />
          </SignedOut>
        )}

        {!isLoadingDisplay && !weatherState.data && (weatherState.error || weatherState.cityNotFound) && (
            <Card className="w-full max-w-2xl mt-4 bg-glass border-destructive/50 shadow-2xl p-6 sm:p-8 rounded-lg">
                <CardHeader className="items-center text-center pt-2 pb-4">
                    <div className="p-3 bg-destructive/20 rounded-full mb-4 border border-destructive/30">
                      {weatherState.cityNotFound ?
                          <MapPin className="h-12 w-12 text-destructive drop-shadow-lg" /> :
                          <AlertCircle className="h-12 w-12 text-destructive drop-shadow-lg" />
                      }
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-headline text-destructive">
                        {weatherState.cityNotFound ? "City Not Found" : "Weather Error"}
                    </CardTitle>
                    <CardDescription className="text-base sm:text-lg text-destructive/90 mt-2 px-4">
                        {weatherState.error}
                    </CardDescription>
                </CardHeader>
            </Card>
        )}

        {!isLoadingDisplay && !weatherState.data && !weatherState.error && !weatherState.cityNotFound && (
            <Card className="w-full max-w-2xl mt-4 bg-glass border-primary/20 p-6 sm:p-8 rounded-lg shadow-2xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
                    <Compass className="h-12 w-12 text-primary drop-shadow-lg" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                  <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 px-4">
                      Use the search bar or location button to find weather information for any city.
                  </CardDescription>
              </CardHeader>
            </Card>
        )}
      </div>
      
      {notificationPortal && (isAqiNotificationVisible || proactiveAlert) && createPortal(
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm space-y-4">
          {proactiveAlert && (
            <div className="animate-in slide-in-from-bottom-5 slide-in-from-right-5">
              <Card className="bg-card shadow-xl border-primary/30">
                  <div className="p-4">
                      <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 bg-primary/10 border border-primary/20">
                              {proactiveAlert.iconCode ? (
                              <WeatherIcon iconCode={proactiveAlert.iconCode} className="h-6 w-6" />
                              ) : (
                              <Waypoints className="h-6 w-6 text-primary" />
                              )}
                          </div>
                          <div className="flex-1 grid gap-y-1">
                              <h3 className="font-headline text-base font-semibold text-primary">
                                  Weather Alert for {proactiveAlert.city}
                              </h3>
                              <div
                                  className="text-sm text-foreground/90 [&_strong]:font-bold [&_strong]:text-primary"
                                  dangerouslySetInnerHTML={{ __html: proactiveAlert.reason }}
                              />
                          </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                          <Button
                              size="sm"
                              variant="ghost"
                              className="transform-gpu transition-all duration-200 ease-in-out hover:bg-muted/80 active:scale-95"
                              onClick={() => setProactiveAlert(null)}
                          >
                              Dismiss
                          </Button>
                          <Button
                              size="sm"
                              className="transform-gpu transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                              onClick={() => {
                                  handleSearch(proactiveAlert.city);
                                  setProactiveAlert(null);
                              }}
                          >
                              <MapPin className="mr-2 h-4 w-4" />
                              View Location
                          </Button>
                      </div>
                  </div>
              </Card>
            </div>
          )}
          {isAqiNotificationVisible && aqiInfo && weatherState.data && (
             <div className="animate-in slide-in-from-bottom-5 slide-in-from-right-5">
              <Card className={cn("shadow-xl bg-card", aqiInfo.borderColorClass)}>
                  <div className="p-3">
                      <div className="grid grid-cols-3 items-center gap-2">
                          <div className="flex items-center gap-3 col-span-2">
                              <div className={cn("flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 border", aqiInfo.bgColorClass, aqiInfo.borderColorClass)}>
                                  <Leaf className={cn("h-6 w-6", aqiInfo.colorClass)} />
                              </div>
                              <h3 className={cn("font-headline text-lg font-semibold", aqiInfo.colorClass)}>
                                  {aqiInfo.level} Air Quality
                              </h3>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-muted-foreground font-semibold">AQI</p>
                              <div className="flex items-baseline justify-end gap-0.5">
                                  <p className={cn("text-3xl font-bold font-headline", aqiInfo.colorClass)}>
                                      {weatherState.data.airQuality?.aqi}
                                  </p>
                                  <p className="text-xl text-muted-foreground font-headline">/5</p>
                              </div>
                          </div>
                      </div>
                      <div className="w-full h-px bg-border my-2.5" />
                      <p className="text-sm text-muted-foreground px-1">{aqiInfo.impact}</p>
                      <div className="flex justify-end gap-2 mt-3">
                          <Button
                              size="sm"
                              variant="ghost"
                              className="transform-gpu transition-all duration-200 ease-in-out hover:bg-muted/80 active:scale-95"
                              onClick={() => setIsAqiNotificationVisible(false)}
                          >
                              Dismiss
                          </Button>
                          <Button
                              size="sm"
                              className="transform-gpu transition-all duration-200 ease-in-out hover:scale-105 active:scale-95"
                              onClick={() => {
                                  setActiveTab('health');
                                  setIsAqiNotificationVisible(false);
                              }}
                          >
                              <Leaf className="mr-2 h-4 w-4" />
                              View Details
                          </Button>
                      </div>
                  </div>
              </Card>
            </div>
          )}
        </div>,
        notificationPortal
      )}
    </>
  );
}


export default function WeatherPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WeatherPageContent />
        </Suspense>
    )
}

    
