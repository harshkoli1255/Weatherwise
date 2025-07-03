'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useTransition } from 'react';
import type { CitySuggestion } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@clerk/nextjs';
import { saveDefaultLocation } from '@/app/settings/actions';
import { getAIErrorSummaryAction } from '@/app/actions';

const DEFAULT_LOCATION_KEY = 'weatherwise-default-location';

interface DefaultLocationContextType {
  defaultLocation: CitySuggestion | null;
  setDefaultLocation: (city: CitySuggestion) => void;
  clearDefaultLocation: () => void;
}

const DefaultLocationContext = createContext<DefaultLocationContextType | undefined>(undefined);


export function DefaultLocationProvider({ children }: { children: ReactNode }) {
  const [defaultLocation, setDefaultLocationState] = useState<CitySuggestion | null>(null);
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // Logged-in user: use synced setting from Clerk's public metadata.
        const syncedLocation = user.publicMetadata?.defaultLocation as CitySuggestion | null | undefined;
        setDefaultLocationState(syncedLocation || null);
      } else {
        // Guest user: use localStorage.
        try {
          const storedLocation = localStorage.getItem(DEFAULT_LOCATION_KEY);
          setDefaultLocationState(storedLocation ? JSON.parse(storedLocation) : null);
        } catch (error) {
          console.error("Error reading default location from localStorage", error);
          setDefaultLocationState(null);
        }
      }
    }
  }, [user, isLoaded]);

  // Syncs changes across tabs for guest users
  useEffect(() => {
    if (user) return; // This is for guest users relying on localStorage

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DEFAULT_LOCATION_KEY) {
        try {
          setDefaultLocationState(event.newValue ? JSON.parse(event.newValue) : null);
        } catch (e) {
          console.error("Error parsing default location from storage event.", e);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const updateLocation = useCallback((location: CitySuggestion | null, successMessage: string) => {
    const originalLocation = defaultLocation;
    setDefaultLocationState(location); // Optimistic UI update

    if (user) {
      // For logged-in users, sync to Clerk metadata via a server action.
      startTransition(async () => {
        const result = await saveDefaultLocation(location);
        if (result.success) {
          toast({
            title: location ? "Default Location Set" : "Default Location Cleared",
            description: successMessage,
            variant: 'success',
          });
        } else {
          const t = toast({
            variant: 'destructive',
            title: 'Sync Error',
            description: 'Analyzing error...',
          });
          getAIErrorSummaryAction(result.error || 'An unknown sync error occurred.')
            .then(aiDescription => {
              t.update({ description: aiDescription });
            });
          setDefaultLocationState(originalLocation); // Revert on failure
        }
      });
    } else {
       // For guests, save to localStorage. This will trigger the 'storage' event for other tabs.
      try {
        if (location) {
          localStorage.setItem(DEFAULT_LOCATION_KEY, JSON.stringify(location));
        } else {
          localStorage.removeItem(DEFAULT_LOCATION_KEY);
        }
        toast({
          title: location ? "Default Location Set" : "Default Location Cleared",
          description: successMessage,
          variant: 'success',
        });
      } catch (error) {
         const t = toast({
          variant: 'destructive',
          title: "Storage Error",
          description: 'Analyzing error...',
        });
        const errorMessage = error instanceof Error ? error.message : "Could not save your default location.";
        getAIErrorSummaryAction(errorMessage)
            .then(aiDescription => {
              t.update({ description: aiDescription });
            });
      }
    }
  }, [user, toast, defaultLocation]);

  const setDefaultLocation = useCallback((city: CitySuggestion) => {
    updateLocation(city, `${city.name} will now be shown on startup.`);
  }, [updateLocation]);

  const clearDefaultLocation = useCallback(() => {
    updateLocation(null, "The app will now use your last search or IP on startup.");
  }, [updateLocation]);

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
