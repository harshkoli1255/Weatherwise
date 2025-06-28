'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useTransition } from 'react';
import type { CitySuggestion, WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@clerk/nextjs';
import { saveFavorites } from '@/app/settings/actions';

const FAVORITES_STORAGE_KEY = 'weatherwise-favorite-cities';

// Define the shape of the context data
interface FavoritesContextType {
  favorites: CitySuggestion[];
  addFavorite: (city: CitySuggestion) => void;
  removeFavorite: (city: CitySuggestion) => void;
  removeMultipleFavorites: (citiesToRemove: CitySuggestion[]) => void;
  isFavorite: (city: WeatherSummaryData | CitySuggestion | null) => boolean;
}

// Create the context with a default undefined value
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

// Create the Provider component
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<CitySuggestion[]>([]);
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isSyncing, startTransition] = useTransition();

  // Load favorites from storage on initial mount
  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // User is logged in, use their synced settings from Clerk.
        const syncedFavorites = user.publicMetadata?.favoriteCities as CitySuggestion[] | undefined;
        setFavorites(syncedFavorites || []);
      } else {
        // User is a guest, use localStorage.
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

  const updateFavorites = useCallback((newFavorites: CitySuggestion[], successMessage: string) => {
    const originalFavorites = favorites;
    setFavorites(newFavorites); // Optimistic UI update

    if (user) {
      startTransition(async () => {
        const result = await saveFavorites(newFavorites);
        if (result.success) {
           if (successMessage) { // Only show toast if a message is provided
            toast({
              description: successMessage,
            });
           }
        } else {
          toast({
            variant: 'destructive',
            title: 'Sync Error',
            description: result.error,
          });
          setFavorites(originalFavorites); // Revert on failure
        }
      });
    } else {
      // Guest user: save to localStorage
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        if (successMessage) {
            toast({
              description: successMessage,
            });
        }
      } catch (error) {
        console.error("Error saving favorites to localStorage", error);
        toast({
          variant: 'destructive',
          title: "Storage Error",
          description: "Could not save your favorites.",
        });
      }
    }
  }, [favorites, user, toast]);

  const addFavorite = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    if (favorites.some(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` === cityKey)) {
      return; // Already a favorite
    }
    const newFavorites = [...favorites, city];
    updateFavorites(newFavorites, `"${city.name}" has been added to your favorites.`);
  }, [favorites, updateFavorites]);

  const removeFavorite = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    const newFavorites = favorites.filter(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` !== cityKey);
    updateFavorites(newFavorites, `"${city.name}" has been removed from your favorites.`);
  }, [favorites, updateFavorites]);

  const removeMultipleFavorites = useCallback((citiesToRemove: CitySuggestion[]) => {
    const keysToRemove = new Set(citiesToRemove.map(c => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`));
    const newFavorites = favorites.filter(fav => !keysToRemove.has(`${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}`));
    updateFavorites(newFavorites, `${citiesToRemove.length} ${citiesToRemove.length === 1 ? 'city has' : 'cities have'} been removed.`);
  }, [favorites, updateFavorites]);

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
  }), [favorites, addFavorite, removeFavorite, removeMultipleFavorites, isFavorite]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

// Create the custom hook to consume the context
export function useFavoriteCities() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoriteCities must be used within a FavoritesProvider');
  }
  return context;
}
