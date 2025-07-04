'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import type { WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';

const LAST_WEATHER_RESULT_KEY = 'weatherwise-last-result';

interface LastWeatherResultContextType {
  lastWeatherResult: WeatherSummaryData | null;
  setLastWeatherResult: (data: WeatherSummaryData | null) => void;
  clearLastWeatherResult: () => void;
}

const LastWeatherResultContext = createContext<LastWeatherResultContextType | undefined>(undefined);

export function LastWeatherResultProvider({ children }: { children: ReactNode }) {
  const [lastWeatherResult, setLastWeatherResultState] = useState<WeatherSummaryData | null>(null);
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on initial mount
  useEffect(() => {
    try {
      const storedResult = localStorage.getItem(LAST_WEATHER_RESULT_KEY);
      if (storedResult) {
        setLastWeatherResultState(JSON.parse(storedResult));
      }
    } catch (error) {
      console.error("Error reading last weather result from localStorage", error);
      setLastWeatherResultState(null);
    }
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
    lastWeatherResult: isInitialized ? lastWeatherResult : null, // Don't provide stale data before initialization
    setLastWeatherResult,
    clearLastWeatherResult,
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
