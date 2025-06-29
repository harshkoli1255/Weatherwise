'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useTransition } from 'react';
import type { CitySuggestion, WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@clerk/nextjs';
import { saveSavedLocations } from '@/app/settings/actions';

const SAVED_LOCATIONS_STORAGE_KEY = 'weatherwise-saved-locations';

interface SavedLocationsContextType {
  savedLocations: CitySuggestion[];
  saveLocation: (city: CitySuggestion) => void;
  removeLocation: (city: CitySuggestion) => void;
  removeMultipleLocations: (citiesToRemove: CitySuggestion[]) => void;
  isLocationSaved: (city: WeatherSummaryData | CitySuggestion | null) => boolean;
  isSyncing: boolean;
}

const SavedLocationsContext = createContext<SavedLocationsContextType | undefined>(undefined);

export function SavedLocationsProvider({ children }: { children: ReactNode }) {
  const [savedLocations, setSavedLocations] = useState<CitySuggestion[]>([]);
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isSyncing, startTransition] = useTransition();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        const syncedLocations = user.publicMetadata?.savedLocations as CitySuggestion[] | undefined;
        setSavedLocations(syncedLocations || []);
      } else {
        try {
          const storedLocations = localStorage.getItem(SAVED_LOCATIONS_STORAGE_KEY);
          setSavedLocations(storedLocations ? JSON.parse(storedLocations) : []);
        } catch (error) {
          console.error("Error reading saved locations from localStorage", error);
          setSavedLocations([]);
        }
      }
    }
  }, [user, isLoaded]);

  const syncLocations = useCallback((newLocations: CitySuggestion[], successMessage: string) => {
    const originalLocations = savedLocations;
    // Optimistically update the local state for a snappy UI
    setSavedLocations(newLocations);

    if (user) {
      startTransition(async () => {
        const result = await saveSavedLocations(newLocations);
        if (result.success) {
          if (successMessage) toast({ title: "Success", description: successMessage, variant: 'success' });
        } else {
          toast({ variant: 'destructive', title: 'Sync Error', description: result.error });
          // If sync fails, revert to the original state
          setSavedLocations(originalLocations);
        }
      });
    } else {
      // For guests, just save to localStorage.
      try {
        localStorage.setItem(SAVED_LOCATIONS_STORAGE_KEY, JSON.stringify(newLocations));
        if (successMessage) toast({ title: "Success", description: successMessage, variant: 'success' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Storage Error', description: 'Could not save your locations.' });
      }
    }
  }, [user, toast, savedLocations]);

  const saveLocation = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    if (savedLocations.some(loc => `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}` === cityKey)) {
      return;
    }
    const newLocations = [...savedLocations, city];
    syncLocations(newLocations, `"${city.name}" has been added to your saved locations.`);
  }, [savedLocations, syncLocations]);

  const removeLocation = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    const newLocations = savedLocations.filter(loc => `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}` !== cityKey);
    syncLocations(newLocations, `"${city.name}" has been removed from your saved locations.`);
  }, [savedLocations, syncLocations]);

  const removeMultipleLocations = useCallback((citiesToRemove: CitySuggestion[]) => {
    const keysToRemove = new Set(citiesToRemove.map(c => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`));
    const newLocations = savedLocations.filter(loc => !keysToRemove.has(`${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`));
    syncLocations(newLocations, `${citiesToRemove.length} ${citiesToRemove.length === 1 ? 'location has' : 'locations have'} been removed.`);
  }, [savedLocations, syncLocations]);

  const isLocationSaved = useCallback((city: WeatherSummaryData | CitySuggestion | null) => {
    if (!city) return false;
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    return savedLocations.some(loc => `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}` === cityKey);
  }, [savedLocations]);
  
  const value = useMemo(() => ({
    savedLocations,
    saveLocation,
    removeLocation,
    removeMultipleLocations,
    isLocationSaved,
    isSyncing,
  }), [savedLocations, saveLocation, removeLocation, removeMultipleLocations, isLocationSaved, isSyncing]);

  return (
    <SavedLocationsContext.Provider value={value}>
      {children}
    </SavedLocationsContext.Provider>
  );
}

export function useSavedLocations() {
  const context = useContext(SavedLocationsContext);
  if (context === undefined) {
    throw new Error('useSavedLocations must be used within a SavedLocationsProvider');
  }
  return context;
}
