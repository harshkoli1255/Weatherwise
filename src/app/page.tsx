
'use client';

import React, { useEffect, useState, useTransition, useCallback, Suspense, useMemo } from 'react';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { SearchBar } from '@/components/SearchBar';
import { fetchWeatherAndSummaryAction, fetchCityByIpAction, generateAqiImageAction } from './actions';
import type { WeatherSummaryData, CitySuggestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { useDefaultLocation } from '@/hooks/useDefaultLocation';
import { useLastSearch } from '@/hooks/useLastSearch.tsx';
import { useLastWeatherResult } from '@/hooks/useLastWeatherResult';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, Compass, AlertTriangle, Loader2 } from 'lucide-react';
import { WeatherLoadingAnimation } from '@/components/WeatherLoadingAnimation';
import { SignedIn, SignedOut, useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { cn } from '@/lib/utils';

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
  isLoading: true, // Start in loading state until initialization is complete
  loadingMessage: 'Initializing...',
  cityNotFound: false,
};

// This scale is duplicated here to be used by the AQI notification logic.
const aqiScale = [
  { aqi: 1, level: "Good", impact: "Minimal impact.", borderColorClass: "border-success/50", bgColorClass: "bg-success/10", colorClass: "text-success" },
  { aqi: 2, level: "Fair", impact: "May cause minor breathing discomfort to sensitive people.", borderColorClass: "border-yellow-500/50", bgColorClass: "bg-yellow-500/10", colorClass: "text-yellow-500" },
  { aqi: 3, level: "Moderate", impact: "May cause breathing discomfort to people with lung disease, children, and older adults.", borderColorClass: "border-orange-500/50", bgColorClass: "bg-orange-500/10", colorClass: "text-orange-500" },
  { aqi: 4, level: "Poor", impact: "May cause breathing discomfort on prolonged exposure and discomfort to people with heart disease.", borderColorClass: "border-destructive/50", bgColorClass: "bg-destructive/10", colorClass: "text-destructive" },
  { aqi: 5, level: "Very Poor", impact: "May cause respiratory illness on prolonged exposure. Effects may be more pronounced in people with lung and heart diseases.", borderColorClass: "border-purple-600/50", bgColorClass: "bg-purple-600/10", colorClass: "text-purple-600" },
];


function WeatherPageContent() {
  const [weatherState, setWeatherState] = useState<WeatherPageState>(initialState);
  const [isLocating, setIsLocating] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [initialSearchTerm, setInitialSearchTerm] = useState('');
  
  const { toast } = useToast();
  const { saveLocation, removeLocation, isLocationSaved } = useSavedLocations();
  const { defaultLocation } = useDefaultLocation();
  const { lastSearch, setLastSearch } = useLastSearch();
  const { lastWeatherResult, setLastWeatherResult } = useLastWeatherResult();
  const { isLoaded: isClerkLoaded } = useUser();
  const [hasInitialized, setHasInitialized] = useState(false);

  const [activeTab, setActiveTab] = useState('forecast');
  const [isAqiNotificationVisible, setIsAqiNotificationVisible] = useState(false);
  const [aqiImageUrl, setAqiImageUrl] = useState<string | null>(null);
  const [isAqiImageLoading, setIsAqiImageLoading] = useState(false);


  const performWeatherFetch = useCallback((params: ApiLocationParams) => {
    const loadingMessage = params.forceRefresh
      ? `Refreshing data for ${params.city}...`
      : params.city 
      ? `Searching for ${params.city}...` 
      : 'Fetching weather for your location...';
      
    setWeatherState(prevState => ({
      ...prevState,
      isLoading: true,
      loadingMessage,
      error: null,
      cityNotFound: false,
    }));
    setIsAqiNotificationVisible(false); // Hide any previous notification
    setAqiImageUrl(null); // Reset AQI image on new search

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
        setLastSearch(cityForStorage);
        setLastWeatherResult(result.data); // Save the full result to the session

        // Check if we should show the AQI notification
        if (result.data.airQuality && result.data.airQuality.aqi >= 3) {
            setActiveTab('forecast'); // Reset to default tab
            setIsAqiNotificationVisible(true);

            setIsAqiImageLoading(true);
            generateAqiImageAction({
                city: result.data.city,
                aqiLevel: result.data.airQuality.level,
                condition: result.data.condition,
            }).then(url => {
                setAqiImageUrl(url);
                setIsAqiImageLoading(false);
            });

        } else if (result.data.airQuality && result.data.airQuality.aqi >= 2) {
             setActiveTab('health');
        }

      } else {
        // Clear last result on error to prevent showing stale data
        setLastWeatherResult(null);
      }
      
      setWeatherState({
        data: result.data,
        error: result.error,
        isLoading: false,
        loadingMessage: null,
        cityNotFound: result.cityNotFound,
      });
    });
  }, [setLastSearch, setLastWeatherResult]);

  const aqiInfo = useMemo(() => {
    if (!weatherState.data?.airQuality) return null;
    return aqiScale.find(item => item.aqi === weatherState.data?.airQuality?.aqi) || null;
  }, [weatherState.data?.airQuality]);

  const handleSearch = useCallback((city: string, lat?: number, lon?: number) => {
    if (!city || city.trim() === "") {
      setWeatherState(prev => ({ ...prev, error: "Please enter a city name.", data: null, isLoading: false, cityNotFound: true, loadingMessage: null }));
      return;
    }
    const params: ApiLocationParams = { city: city.trim() };
    if (typeof lat === 'number') params.lat = lat;
    if (typeof lon === 'number') params.lon = lon;
    
    performWeatherFetch(params);
  }, [performWeatherFetch]);

  const handleLocate = useCallback(async (isAutoLocate = false) => {
    if (!isAutoLocate) {
        setIsLocating(true);
    }
    setWeatherState(prev => ({
        ...prev,
        isLoading: true,
        loadingMessage: 'Detecting your location...',
    }));

    const getPosition = (): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                return reject(new Error('Geolocation is not supported by your browser.'));
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
    };

    let locationParams: ApiLocationParams | null = null;

    try {
        if (!isAutoLocate) {
            setWeatherState(prev => ({ ...prev, loadingMessage: 'Requesting location permission...' }));
        }
        const position = await getPosition();
        locationParams = { lat: position.coords.latitude, lon: position.coords.longitude };
    } catch (geoError: any) {
        console.warn(`Geolocation error: ${geoError.message}. Falling back to IP.`);
        if (!isAutoLocate) {
            toast({
                title: "Location via GPS failed",
                description: "Falling back to IP-based location, which may be less accurate.",
                duration: 5000,
            });
        }

        try {
            setWeatherState(prev => ({ ...prev, loadingMessage: 'Detecting location via IP...' }));
            const ipResult = await fetchCityByIpAction();
            if (ipResult.error || typeof ipResult.lat !== 'number' || typeof ipResult.lon !== 'number') {
                throw new Error(ipResult.error || 'Could not determine location from IP.');
            }
            locationParams = { city: ipResult.city ?? undefined, lat: ipResult.lat, lon: ipResult.lon };
        } catch (ipError: any) {
            setWeatherState({
                ...initialState,
                isLoading: false,
                error: `Location detection failed. ${isAutoLocate ? 'Please' : ipError.message + ' Please'} use the search bar.`,
            });
            if (!isAutoLocate) setIsLocating(false);
            return;
        }
    }

    if (locationParams) {
        performWeatherFetch(locationParams);
    } else {
         setWeatherState({ ...initialState, isLoading: false, error: 'Could not determine location.' });
    }
    if (!isAutoLocate) setIsLocating(false);
  }, [performWeatherFetch, toast]);
  
  const handleRefresh = useCallback(() => {
    if (!weatherState.data) return;
    console.log(`[Perf] Manual refresh requested for "${weatherState.data.city}"`);
    performWeatherFetch({
      lat: weatherState.data.lat,
      lon: weatherState.data.lon,
      city: weatherState.data.city,
      forceRefresh: true,
    });
  }, [weatherState.data, performWeatherFetch]);

  useEffect(() => {
    if (hasInitialized) return;
  
    // Priority 1: Restore from last session
    if (lastWeatherResult) {
      console.log(`[Perf] Restoring previous session for "${lastWeatherResult.city}"`);
      setWeatherState({
        data: lastWeatherResult,
        isLoading: false,
        error: null,
        loadingMessage: null,
        cityNotFound: false,
      });
      setInitialSearchTerm(lastWeatherResult.city);
      setHasInitialized(true);
      return;
    }
  
    // If no session, show loading and proceed with fetching
    setWeatherState(prev => ({...prev, isLoading: true, loadingMessage: "Finding your location..."}));
  
    const initializeWeather = () => {
      // Priority 2: Default location (if set)
      if (defaultLocation) {
        console.log(`[Perf] No session found. Initializing with default location: ${defaultLocation.name}`);
        setInitialSearchTerm(defaultLocation.name);
        handleSearch(defaultLocation.name, defaultLocation.lat, defaultLocation.lon);
        return;
      }
  
      // Priority 3: Last search term (if set)
      if (lastSearch) {
        console.log(`[Perf] No session or default found. Initializing with last search: ${lastSearch.name}`);
        setInitialSearchTerm(lastSearch.name);
        handleSearch(lastSearch.name, lastSearch.lat, lastSearch.lon);
        return;
      }
  
      // Priority 4: IP Geolocation as final fallback
      console.log('[Perf] No session, default, or last search. Initializing with IP Geolocation.');
      handleLocate(true);
    };
  
    if (isClerkLoaded) {
      initializeWeather();
      setHasInitialized(true);
    }
  }, [hasInitialized, isClerkLoaded, lastWeatherResult, defaultLocation, lastSearch, handleSearch, handleLocate]);

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
      toast({
        variant: "destructive",
        title: "Error",
        description: weatherState.error,
      });
    }
  }, [weatherState.error, weatherState.isLoading, weatherState.cityNotFound, toast]);

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

  const isCurrentLocationSaved = weatherState.data ? isLocationSaved(weatherState.data) : false;
  const isLoadingDisplay = weatherState.isLoading || isTransitionPending;

  return (
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
            isSearchingWeather={isLoadingDisplay}
            initialValue={initialSearchTerm}
            onLocate={() => handleLocate(false)}
            isLocating={isLocating}
          />
        </div>
      </section>

      {isLoadingDisplay && (
        <div className="w-full max-w-2xl mt-4 p-6 sm:p-8 rounded-xl animate-in fade-in-0">
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
            isRefreshing={isLoadingDisplay}
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
                isRefreshing={isLoadingDisplay}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />
        </SignedOut>
      )}

      {!isLoadingDisplay && !weatherState.data && (weatherState.error || weatherState.cityNotFound) && (
           <Card className="w-full max-w-2xl mt-4 bg-glass border-destructive/50 shadow-2xl p-6 sm:p-8 rounded-xl">
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
           <Card className="w-full max-w-2xl mt-4 bg-glass border-primary/20 p-6 sm:p-8 rounded-xl shadow-2xl relative overflow-hidden">
                <Image
                    src="https://placehold.co/600x400.png"
                    data-ai-hint="weather map"
                    alt="Abstract weather map"
                    fill
                    className="object-cover opacity-10 dark:opacity-5"
                />
              <div className="relative z-10">
                <CardHeader className="items-center text-center pt-2 pb-4">
                    <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
                      <Compass className="h-12 w-12 text-primary drop-shadow-lg" />
                    </div>
                    <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                    <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 px-4">
                        Use the search bar or location button to find weather information for any city.
                    </CardDescription>
                </CardHeader>
              </div>
          </Card>
      )}

      {isAqiNotificationVisible && aqiInfo && weatherState.data && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-5 slide-in-from-right-5">
            <Card className={cn("overflow-hidden border-2 shadow-xl", aqiInfo.borderColorClass, aqiInfo.bgColorClass)}>
                <div className="relative h-24 w-full">
                    {isAqiImageLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    ) : aqiImageUrl ? (
                      <Image
                        src={aqiImageUrl}
                        alt={`An artistic image representing ${aqiInfo?.level} air quality in ${weatherState.data.city}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <AlertTriangle className="h-6 w-6 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-4 w-full">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-white drop-shadow-lg" />
                            <CardTitle className="text-xl font-headline text-white drop-shadow-lg">
                                {aqiInfo.level} Air Quality
                            </CardTitle>
                        </div>
                        <p className="mt-1 text-sm text-white/90 drop-shadow-md">
                          in {weatherState.data.city}
                        </p>
                    </div>
                </div>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4 text-sm">
                      <span className="text-muted-foreground">Index Value</span>
                      <span className={cn("font-bold", aqiInfo.colorClass)}>
                          {weatherState.data.airQuality?.aqi} / 5
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-foreground/90">{aqiInfo.impact}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            className="w-full"
                            onClick={() => {
                                setActiveTab('health');
                                setIsAqiNotificationVisible(false);
                            }}
                        >
                            View Health Details
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => setIsAqiNotificationVisible(false)}
                        >
                            Dismiss
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}


export default function WeatherPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WeatherPageContent />
        </Suspense>
    )
}
