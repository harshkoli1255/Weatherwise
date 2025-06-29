
'use client';

import React, { useEffect, useState, useTransition, useCallback, Suspense } from 'react';
import { WeatherDisplay } from '@/components/WeatherDisplay';
import { SearchBar } from '@/components/SearchBar';
import { fetchWeatherAndSummaryAction, fetchCityByIpAction } from './actions';
import type { WeatherSummaryData, CitySuggestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFavoriteCities } from '@/hooks/useFavorites';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, MapPin, Compass } from 'lucide-react';
import { WeatherLoadingAnimation } from '@/components/WeatherLoadingAnimation';
import { SignedIn, SignedOut } from '@clerk/nextjs';

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
}

const initialState: WeatherPageState = {
  data: null,
  error: null,
  isLoading: true, // Start in loading state for auto-detection
  loadingMessage: 'Initializing...',
  cityNotFound: false,
};

const LAST_SEARCH_KEY = 'weatherwise-last-search';
const LAST_RESULT_KEY = 'weatherwise-last-result';

function WeatherPageContent() {
  const [weatherState, setWeatherState] = useState<WeatherPageState>(initialState);
  const [isLocating, setIsLocating] = useState(false);
  const [isTransitionPending, startTransition] = useTransition();
  const [initialSearchTerm, setInitialSearchTerm] = useState('');
  
  const { toast } = useToast();
  const { addFavorite, removeFavorite, isFavorite } = useFavoriteCities();

  const performWeatherFetch = useCallback((params: ApiLocationParams) => {
    const loadingMessage = params.city 
      ? `Searching for ${params.city}...` 
      : 'Fetching weather for your location...';
      
    setWeatherState(prevState => ({
      ...prevState,
      isLoading: true,
      loadingMessage,
      error: null,
      cityNotFound: false,
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

      if (result.data) {
        const cityForStorage: CitySuggestion = {
            name: result.data.city,
            country: result.data.country,
            lat: result.data.lat,
            lon: result.data.lon,
        };
        try {
            localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(cityForStorage));
            localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result.data));
        } catch (e) {
            console.warn("Could not save last search to localStorage.");
        }
      }
      
      setWeatherState({
        data: result.data,
        error: result.error,
        isLoading: false,
        loadingMessage: null,
        cityNotFound: result.cityNotFound,
      });
    });
  }, []);

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
        if (!isAutoLocate) { // Only toast on manual click
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
  
  // This effect runs only once on mount to determine initial state.
  useEffect(() => {
    const initializeWeather = () => {
      // 1. Prioritize the user-set default location.
      try {
        const storedDefault = JSON.parse(localStorage.getItem('weatherwise-default-location') || 'null');
        if (storedDefault && storedDefault.name && typeof storedDefault.lat === 'number' && typeof storedDefault.lon === 'number') {
          console.log(`[Perf] Initializing with user's default location: ${storedDefault.name}`);
          setInitialSearchTerm(storedDefault.name);
          handleSearch(storedDefault.name, storedDefault.lat, storedDefault.lon);
          return;
        }
      } catch (e) {
        console.warn("Could not read default location from localStorage.");
      }

      // 2. Try to restore the last session if no default is set.
      const savedResult = localStorage.getItem(LAST_RESULT_KEY);
      if (savedResult) {
        try {
            const lastData: WeatherSummaryData = JSON.parse(savedResult);
            setWeatherState({ data: lastData, error: null, isLoading: false, loadingMessage: null, cityNotFound: false });
            const savedLastSearch = localStorage.getItem(LAST_SEARCH_KEY);
            if (savedLastSearch) {
                const lastCity: CitySuggestion = JSON.parse(savedLastSearch);
                setInitialSearchTerm(lastCity.name);
            }
            return;
        } catch (e) {
            console.warn("Could not read last session from localStorage.");
            localStorage.removeItem(LAST_RESULT_KEY);
            localStorage.removeItem(LAST_SEARCH_KEY);
        }
      }
      
      // 3. If no last session, automatically fetch location for a better first-time experience.
      handleLocate(true);
    };

    initializeWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for search events from other components (like the navbar)
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

    if (isFavorite(cityData)) {
      removeFavorite(cityData);
    } else {
      addFavorite(cityData);
    }
  }, [weatherState.data, isFavorite, addFavorite, removeFavorite]);

  const isCurrentCitySaved = weatherState.data ? isFavorite(weatherState.data) : false;
  const isLoadingDisplay = weatherState.isLoading || isTransitionPending;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10 flex flex-col items-center">
      <section className="relative z-10 w-full max-w-3xl mb-8 text-center">
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
        <Card className="w-full mt-4 bg-glass border-primary/20 p-6 sm:p-8 rounded-xl shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center space-y-5 pt-6">
            <WeatherLoadingAnimation className="h-20 w-20 sm:h-24 sm:w-24 text-primary" />
            <p className="text-lg sm:text-xl text-muted-foreground font-medium">{weatherState.loadingMessage || "Loading..."}</p>
          </CardContent>
        </Card>
      )}

      {!isLoadingDisplay && weatherState.data && (
        <SignedIn>
            <WeatherDisplay
            weatherData={weatherState.data}
            isCitySaved={isCurrentCitySaved}
            onSaveCityToggle={handleSaveCityToggle}
            />
        </SignedIn>
      )}
      
      {!isLoadingDisplay && weatherState.data && (
        // For signed-out users, show display without the save button
        <SignedOut>
             <WeatherDisplay
                weatherData={weatherState.data}
                isCitySaved={false}
                onSaveCityToggle={() => toast({ title: "Sign in to save cities", description: "Create an account to save and manage your favorite cities."})}
            />
        </SignedOut>
      )}

      {!isLoadingDisplay && !weatherState.data && weatherState.error && (
           <Card className="w-full mt-4 border-destructive/50 bg-destructive/10 backdrop-blur-lg shadow-xl p-6 sm:p-8 rounded-xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  <div className="p-3 bg-destructive/20 rounded-full mb-4 border border-destructive/30">
                    {weatherState.error.toLowerCase().includes("location") || weatherState.cityNotFound ?
                        <MapPin className="h-12 w-12 text-destructive drop-shadow-lg" /> :
                        <AlertCircle className="h-12 w-12 text-destructive drop-shadow-lg" />
                    }
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-destructive">
                      {weatherState.error.toLowerCase().includes("location") ? "Location Error" :
                       weatherState.cityNotFound ? "City Not Found" :
                       "Weather Error"}
                  </CardTitle>
                   <CardDescription className="text-base sm:text-lg text-destructive/90 mt-2 px-4">
                      {weatherState.error}
                  </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-5 pt-8 pb-4">
                  <WeatherLoadingAnimation className="h-32 w-32 text-destructive" />
              </CardContent>
          </Card>
      )}

      {!isLoadingDisplay && !weatherState.data && !weatherState.error && (
           <Card className="w-full mt-4 bg-glass border-primary/20 p-6 sm:p-8 rounded-xl shadow-2xl">
              <CardHeader className="items-center text-center pt-2 pb-4">
                  <div className="p-3 bg-primary/20 rounded-full mb-4 border border-primary/30">
                    <Compass className="h-12 w-12 text-primary drop-shadow-lg" />
                  </div>
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">Welcome to Weatherwise!</CardTitle>
                  <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2 px-4">
                      Use the search bar or location button to find weather information for any city.
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


export default function WeatherPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WeatherPageContent />
        </Suspense>
    )
}
