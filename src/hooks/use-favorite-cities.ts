
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CitySuggestion, WeatherSummaryData } from '@/lib/types';
import { useToast } from './use-toast';

const FAVORITES_STORAGE_KEY = 'weatherwise-favorite-cities';

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

export function useFavoriteCities() {
  const [favorites, setFavorites] = useState<CitySuggestion[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setFavorites(getFavoritesFromStorage());
  }, []);

  const saveFavoritesToStorage = (cities: CitySuggestion[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(cities));
      setFavorites(cities);
    } catch (error) {
      console.error("Error saving favorites to localStorage", error);
      toast({
        variant: 'destructive',
        title: 'Could not save favorites',
        description: 'Your browser might be blocking local storage.',
      });
    }
  };

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

  const isFavorite = useCallback((city: WeatherSummaryData | CitySuggestion | null): boolean => {
    if (!city) return false;
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    return favorites.some(fav => `${fav.lat.toFixed(4)},${fav.lon.toFixed(4)}` === cityKey);
  }, [favorites]);

  return { favorites, addFavorite, removeFavorite, removeMultipleFavorites, isFavorite };
}
