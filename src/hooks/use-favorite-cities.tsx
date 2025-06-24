'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { CitySuggestion, WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';

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

// Helper function to read from localStorage
function getFavoritesFromStorage(): CitySuggestion[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return storedFavorites ? JSON.parse(storedFavorites) : [];
  } catch (error) {
    console.error("Error reading favorites from localStorage", error);
    return [];
  }
}

// Create the Provider component
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<CitySuggestion[]>([]);
  const { toast } = useToast();

  // Load favorites from storage on initial mount
  useEffect(() => {
    setFavorites(getFavoritesFromStorage());
  }, []);

  const addFavorite = useCallback((city: CitySuggestion) => {
    setFavorites(prev => {
      const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
      if (prev.some(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` === cityKey)) {
        return prev;
      }
      const newFavorites = [...prev, city];
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        toast({
          title: "City Saved!",
          description: `"${city.name}" has been added to your favorites.`,
        });
      } catch (error) {
        console.error("Error saving favorites to localStorage", error);
      }
      return newFavorites;
    });
  }, [toast]);

  const removeFavorite = useCallback((city: CitySuggestion) => {
    setFavorites(prev => {
      const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
      const newFavorites = prev.filter(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` !== cityKey);
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        toast({
          description: `"${city.name}" has been removed from your favorites.`,
        });
      } catch (error) {
        console.error("Error saving favorites to localStorage", error);
      }
      return newFavorites;
    });
  }, [toast]);

  const removeMultipleFavorites = useCallback((citiesToRemove: CitySuggestion[]) => {
    setFavorites(prev => {
      const keysToRemove = new Set(citiesToRemove.map(c => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}`));
      const newFavorites = prev.filter(fav => !keysToRemove.has(`${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}`));
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        toast({
          title: "Favorites Removed",
          description: `${citiesToRemove.length} cities have been removed from your favorites.`,
        });
      } catch (error) {
        console.error("Error saving favorites to localStorage", error);
      }
      return newFavorites;
    });
  }, [toast]);

  const isFavorite = useCallback((city: WeatherSummaryData | CitySuggestion | null) => {
    if (!city) return false;
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    return favorites.some(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` === cityKey);
  }, [favorites]);
  
  const value = {
    favorites,
    addFavorite,
    removeFavorite,
    removeMultipleFavorites,
    isFavorite,
  };

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
