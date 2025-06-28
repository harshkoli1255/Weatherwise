'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import type { CitySuggestion } from '@/lib/types';
import { useToast } from './use-toast';

const DEFAULT_LOCATION_KEY = 'weatherwise-default-location';

interface DefaultLocationContextType {
  defaultLocation: CitySuggestion | null;
  setDefaultLocation: (city: CitySuggestion) => void;
  clearDefaultLocation: () => void;
}

const DefaultLocationContext = createContext<DefaultLocationContextType | undefined>(undefined);

function getLocationFromStorage(): CitySuggestion | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const storedLocation = localStorage.getItem(DEFAULT_LOCATION_KEY);
    return storedLocation ? JSON.parse(storedLocation) : null;
  } catch (error) {
    console.error("Error reading default location from localStorage", error);
    return null;
  }
}

export function DefaultLocationProvider({ children }: { children: ReactNode }) {
  const [defaultLocation, setDefaultLocationState] = useState<CitySuggestion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setDefaultLocationState(getLocationFromStorage());
  }, []);

  const setDefaultLocation = useCallback((city: CitySuggestion) => {
    try {
      localStorage.setItem(DEFAULT_LOCATION_KEY, JSON.stringify(city));
      setDefaultLocationState(city);
      toast({
        title: "Default Location Set",
        description: `${city.name} will now be shown on startup.`,
      });
    } catch (error) {
      console.error("Error saving default location to localStorage", error);
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Could not save your default location.",
      });
    }
  }, [toast]);

  const clearDefaultLocation = useCallback(() => {
    try {
      localStorage.removeItem(DEFAULT_LOCATION_KEY);
      setDefaultLocationState(null);
      toast({
        title: "Default Location Cleared",
        description: "The app will now use your last search or IP on startup.",
      });
    } catch (error) {
      console.error("Error clearing default location from localStorage", error);
       toast({
        variant: 'destructive',
        title: "Error",
        description: "Could not clear your default location.",
      });
    }
  }, [toast]);

  const value = useMemo(() => ({
    defaultLocation,
    setDefaultLocation,
    clearDefaultLocation,
  }), [defaultLocation, setDefaultLocation, clearDefaultLocation]);

  return (
    <DefaultLocationContext.Provider value={value}>
      {children}
    </DefaultLocationContext.Provider>
  );
}

export function useDefaultLocation() {
  const context = useContext(DefaultLocationContext);
  if (context === undefined) {
    throw new Error('useDefaultLocation must be used within a DefaultLocationProvider');
  }
  return context;
}
