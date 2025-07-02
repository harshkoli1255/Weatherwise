
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { Button } from '@/components/ui/button';
import { Search as SearchIconLucide, MapPin, LocateFixed } from 'lucide-react';
import { fetchCitySuggestionsAction } from '@/app/actions';
import type { CitySuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { WeatherIcon } from './WeatherIcon';
import { useUnits } from '@/hooks/useUnits';
import { Skeleton } from './ui/skeleton';

interface SearchBarProps {
  onSearch: (city: string, lat?: number, lon?: number) => void;
  isSearchingWeather: boolean;
  initialValue?: string;
  onLocate: () => void;
  isLocating: boolean;
}

export function SearchBar({ onSearch, isSearchingWeather, initialValue, onLocate, isLocating }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(initialValue || '');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingSuggestions, startSuggestionTransition] = useTransition();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { convertTemperature, getTemperatureUnitSymbol } = useUnits();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (initialValue) {
      setInputValue(initialValue);
    }
  }, [initialValue]);

  const fetchSuggestions = useCallback((query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      if (query.length === 0) {
        setIsSuggestionsOpen(false);
      }
      return;
    }
    startSuggestionTransition(async () => {
      const result = await fetchCitySuggestionsAction(query);
      
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Suggestion Error',
          description: result.error,
        });
        setSuggestions([]);
        setIsSuggestionsOpen(false);
      } else if (result.suggestions) {
        setSuggestions(result.suggestions.slice(0, 8));
        setIsSuggestionsOpen(true);
      } else {
        setSuggestions([]);
        console.error("Suggestion fetch error:", result.error);
        setIsSuggestionsOpen(false);
      }
    });
  }, [toast]);

  useEffect(() => {
    const handler = setTimeout(() => {
        if (inputValue && isSuggestionsOpen) {
            fetchSuggestions(inputValue);
        }
    }, 300); // Debounce time

    return () => {
        clearTimeout(handler);
    };
}, [inputValue, fetchSuggestions, isSuggestionsOpen]);


  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    setInputValue(suggestion.name); // Use the clean name in the input
    setIsSuggestionsOpen(false);
    onSearch(suggestion.name, suggestion.lat, suggestion.lon); // Search with precise coordinates
    inputRef.current?.blur();
  };

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (inputValue.trim()) {
      setIsSuggestionsOpen(false);
      onSearch(inputValue.trim());
      inputRef.current?.blur();
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length > 0) {
        setIsSuggestionsOpen(true);
    } else {
        setIsSuggestionsOpen(false);
        setSuggestions([]);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [commandRef]);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-2xl"
    >
      <Command
        ref={commandRef}
        shouldFilter={false}
        className={cn(
            "relative w-full overflow-visible rounded-full border bg-background/80 backdrop-blur-sm focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-lg group transition-all"
        )}
      >
        <div className="relative flex items-center">
            <SearchIconLucide className="absolute left-4 h-6 w-6 text-muted-foreground pointer-events-none z-10" />
            <CommandPrimitive.Input
                ref={inputRef}
                value={inputValue}
                onValueChange={handleInputChange}
                onFocus={() => { if(inputValue) setIsSuggestionsOpen(true) }}
                placeholder={initialValue ? `Try "${initialValue}" or another city` : "Search city or landmark..."}
                className="block w-full h-14 pl-14 pr-40 text-base text-foreground bg-transparent border-0 rounded-full placeholder:text-muted-foreground/70 focus:ring-0"
                aria-label="City name"
                name="city"
                autoComplete="off"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-x-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-muted-foreground hover:text-primary"
                    onClick={onLocate}
                    aria-label="Use current location"
                >
                    {isLocating ? (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                      </span>
                    ) : (
                      <LocateFixed className="h-5 w-5" />
                    )}
                </Button>
                <Button
                    type="submit"
                    disabled={!inputValue.trim() || isSearchingWeather}
                    aria-label="Search weather"
                    className="h-10 rounded-full px-6 text-sm"
                >
                    {isSearchingWeather ? (
                       <div className="flex items-center justify-center space-x-1">
                            <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse-dot" style={{ animationDelay: '0.0s' }} />
                            <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                            <span className="h-2 w-2 rounded-full bg-primary-foreground animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                        </div>
                    ) : (
                        'Search'
                    )}
                </Button>
            </div>
        </div>
        {isSuggestionsOpen && (
        <CommandList className="absolute top-full mt-2 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-50 border border-border max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 horizontal-scrollbar">
            {isLoadingSuggestions && (
            <div className="p-2 flex items-center justify-center text-sm text-muted-foreground">
                <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                </span>
                 Loading suggestions...
            </div>
            )}
            {!isLoadingSuggestions && suggestions.length === 0 && inputValue.length > 0 && (
            <CommandEmpty>No cities found for &quot;{inputValue}&quot;.</CommandEmpty>
            )}
            <CommandGroup>
            {suggestions.map((suggestion) => {
              const uniqueKey = `${suggestion.name}|${suggestion.country}|${suggestion.state || 'NO_STATE'}|${suggestion.lat.toFixed(4)}|${suggestion.lon.toFixed(4)}`;
              return (
                <CommandItem
                  key={uniqueKey}
                  value={uniqueKey}
                  onSelect={() => handleSelectSuggestion(suggestion)}
                  className="cursor-pointer text-sm py-2.5 aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center justify-between"
                >
                  <div className="flex items-center min-w-0">
                    <MapPin className="mr-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col items-start truncate">
                      <span className="font-medium text-foreground">{suggestion.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {suggestion.state ? `${suggestion.state}, ${suggestion.country}`: suggestion.country}
                      </span>
                    </div>
                  </div>
                   {typeof suggestion.temperature === 'number' && suggestion.iconCode ? (
                    <div className="flex items-center gap-2 text-sm ml-4 flex-shrink-0">
                      {isMounted ? (
                        <>
                          <span className="font-semibold text-foreground">{convertTemperature(suggestion.temperature)}{getTemperatureUnitSymbol()}</span>
                          <WeatherIcon iconCode={suggestion.iconCode} className="h-5 w-5 text-muted-foreground" />
                        </>
                      ) : (
                        <Skeleton className="h-5 w-16" />
                      )}
                    </div>
                  ) : null}
                </CommandItem>
              )
            })}
            </CommandGroup>
        </CommandList>
        )}
      </Command>
    </form>
  );
}
