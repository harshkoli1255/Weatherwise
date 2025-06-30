
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useTransition } from 'react';
import type { CitySuggestion } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@clerk/nextjs';
import { saveLastSearchAction } from '@/app/settings/actions';
import { getAIErrorSummaryAction } from '@/app/actions';

const LAST_SEARCH_STORAGE_KEY = 'weatherwise-last-search';

interface LastSearchContextType {
  lastSearch: CitySuggestion | null;
  setLastSearch: (city: CitySuggestion) => void;
  isSyncing: boolean;
}

const LastSearchContext = createContext<LastSearchContextType | undefined>(undefined);

export function LastSearchProvider({ children }: { children: ReactNode }) {
  const [lastSearch, setLastSearchState] = useState<CitySuggestion | null>(null);
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [isSyncing, startTransition] = useTransition();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        const syncedSearch = user.publicMetadata?.lastSearch as CitySuggestion | null | undefined;
        setLastSearchState(syncedSearch || null);
      } else {
        try {
          const storedSearch = localStorage.getItem(LAST_SEARCH_STORAGE_KEY);
          setLastSearchState(storedSearch ? JSON.parse(storedSearch) : null);
        } catch (error) {
          console.error("Error reading last search from localStorage", error);
          setLastSearchState(null);
        }
      }
    }
  }, [user, isLoaded]);

  const setLastSearch = useCallback((search: CitySuggestion) => {
    const originalSearch = lastSearch;
    setLastSearchState(search); // Optimistic UI update

    if (user) {
      startTransition(async () => {
        const result = await saveLastSearchAction(search);
        if (result.error) {
          const t = toast({ variant: 'destructive', title: 'Sync Error', description: 'Analyzing error...' });
          getAIErrorSummaryAction(result.error).then(aiDescription => t.update({ description: aiDescription }));
          setLastSearchState(originalSearch); // Revert on failure
        }
      });
    } else {
      try {
        localStorage.setItem(LAST_SEARCH_STORAGE_KEY, JSON.stringify(search));
      } catch (error) {
        const t = toast({ variant: 'destructive', title: 'Storage Error', description: 'Analyzing error...' });
        const errorMessage = error instanceof Error ? error.message : "Could not save your last search.";
        getAIErrorSummaryAction(errorMessage).then(aiDescription => t.update({ description: aiDescription }));
      }
    }
  }, [user, toast, lastSearch]);
  
  const value = useMemo(() => ({
    lastSearch,
    setLastSearch,
    isSyncing,
  }), [lastSearch, setLastSearch, isSyncing]);

  return (
    <LastSearchContext.Provider value={value}>
      {children}
    </LastSearchContext.Provider>
  );
}

export function useLastSearch() {
  const context = useContext(LastSearchContext);
  if (context === undefined) {
    throw new Error('useLastSearch must be used within a LastSearchProvider');
  }
  return context;
}
