
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';

const LAST_WEATHER_RESULT_KEY = 'weatherwise-last-result';

interface LastWeatherResultContextType {
  lastWeatherResult: WeatherSummaryData | null;
  setLastWeatherResult: (data: WeatherSummaryData | null) => void;
  clearLastWeatherResult: () => void;
  isInitialized: boolean;
}

const LastWeatherResultContext = createContext<LastWeatherResultContextType | undefined>(undefined);

// This function runs synchronously to get the initial state.
// It's safe because it checks for `window` and won't run on the server.
const getInitialState = (): WeatherSummaryData | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const storedResult = localStorage.getItem(LAST_WEATHER_RESULT_KEY);
    return storedResult ? JSON.parse(storedResult) : null;
  } catch (error) {
    console.error("Error reading last weather result from localStorage", error);
    return null;
  }
};


export function LastWeatherResultProvider({ children }: { children: ReactNode }) {
  // Initialize state directly from localStorage, preventing the race condition.
  const [lastWeatherResult, setLastWeatherResultState] = useState<WeatherSummaryData | null>(getInitialState);
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  // This effect now only serves to signal that the provider has mounted.
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const setLastWeatherResult = useCallback((data: WeatherSummaryData | null) => {
    setLastWeatherResultState(data);
    try {
      if (data) {
        localStorage.setItem(LAST_WEATHER_RESULT_KEY, JSON.stringify(data));
      } else {
        localStorage.removeItem(LAST_WEATHER_RESULT_KEY);
      }
    } catch (error) {
      console.error("Could not save weather result to localStorage", error);
      toast({
        variant: 'destructive',
        title: 'Storage Error',
        description: 'Could not save your last session.',
      });
    }
  }, [toast]);
  
  const clearLastWeatherResult = useCallback(() => {
    setLastWeatherResult(null);
  }, [setLastWeatherResult]);

  const value = useMemo(() => ({
    lastWeatherResult,
    setLastWeatherResult,
    clearLastWeatherResult,
    isInitialized,
  }), [isInitialized, lastWeatherResult, setLastWeatherResult, clearLastWeatherResult]);

  return (
    <LastWeatherResultContext.Provider value={value}>
      {children}
    </LastWeatherResultContext.Provider>
  );
}

export function useLastWeatherResult() {
  const context = useContext(LastWeatherResultContext);
  if (context === undefined) {
    throw new Error('useLastWeatherResult must be used within a LastWeatherResultProvider');
  }
  return context;
}
