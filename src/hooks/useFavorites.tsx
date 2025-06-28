'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useTransition } from 'react';
import type { CitySuggestion, WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@clerk/nextjs';
import { saveFavorites } from '@/app/settings/actions';

const FAVORITES_STORAGE_KEY = 'weatherwise-favorite-cities';

interface FavoritesContextType {
  favorites: CitySuggestion[];
  addFavorite: (city: CitySuggestion) => void;
  removeFavorite: (city: CitySuggestion) => void;
  removeMultipleFavorites: (citiesToRemove: CitySuggestion[]) => void;
  isFavorite: (city: WeatherSummaryData | CitySuggestion | null) => boolean;
  isSyncing: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<CitySuggestion[]>([]);
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isSyncing, startTransition] = useTransition();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        const syncedFavorites = user.publicMetadata?.favoriteCities as CitySuggestion[] | undefined;
        setFavorites(syncedFavorites || []);
      } else {
        try {
          const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
          setFavorites(storedFavorites ? JSON.parse(storedFavorites) : []);
        } catch (error) {
          console.error("Error reading favorites from localStorage", error);
          setFavorites([]);
        }
      }
    }
  }, [user, isLoaded]);

  const syncFavorites = useCallback((newFavorites: CitySuggestion[], successMessage: string) => {
    // Optimistically update the local state for a snappy UI
    setFavorites(newFavorites);

    if (user) {
      startTransition(async () => {
        const result = await saveFavorites(newFavorites);
        if (result.success) {
          if (successMessage) toast({ description: successMessage, variant: 'success' });
        } else {
          toast({ variant: 'destructive', title: 'Sync Error', description: result.error });
          // If sync fails, revert to the state from user.publicMetadata
          const previousSyncedState = user.publicMetadata?.favoriteCities as CitySuggestion[] | undefined;
          setFavorites(previousSyncedState || []);
        }
      });
    } else {
      // For guests, just save to localStorage.
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        if (successMessage) toast({ description: successMessage, variant: 'success' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Storage Error', description: 'Could not save your favorites.' });
      }
    }
  }, [user, toast]);

  const addFavorite = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    if (favorites.some(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` === cityKey)) {
      return;
    }
    const newFavorites = [...favorites, city];
    syncFavorites(newFavorites, `"${city.name}" has been added to your favorites.`);
  }, [favorites, syncFavorites]);

  const removeFavorite = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    const newFavorites = favorites.filter(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` !== cityKey);
    syncFavorites(newFavorites, `"${city.name}" has been removed from your favorites.`);
  }, [favorites, syncFavorites]);

  const removeMultipleFavorites = useCallback((citiesToRemove: CitySuggestion[]) => {
    const keysToRemove = new Set(citiesToRemove.map(c => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`));
    const newFavorites = favorites.filter(fav => !keysToRemove.has(`${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}`));
    syncFavorites(newFavorites, `${citiesToRemove.length} ${citiesToRemove.length === 1 ? 'city has' : 'cities have'} been removed.`);
  }, [favorites, syncFavorites]);

  const isFavorite = useCallback((city: WeatherSummaryData | CitySuggestion | null) => {
    if (!city) return false;
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    return favorites.some(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` === cityKey);
  }, [favorites]);
  
  const value = useMemo(() => ({
    favorites,
    addFavorite,
    removeFavorite,
    removeMultipleFavorites,
    isFavorite,
    isSyncing,
  }), [favorites, addFavorite, removeFavorite, removeMultipleFavorites, isFavorite, isSyncing]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoriteCities() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoriteCities must be used within a FavoritesProvider');
  }
  return context;
}
