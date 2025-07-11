
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { Loader2, MapPin, LocateFixed, Frown, Landmark } from 'lucide-react';
import { getCityFromCoordsAction, fetchCitySuggestionsAction } from '@/app/actions';
import type { CitySuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { WeatherIcon } from '@/components/WeatherIcon';
import { useUnits } from '@/hooks/useUnits';
import { Skeleton } from '@/components/ui/skeleton';

interface AlertsCitySearchProps {
  value: string;
  onValueChange: (newValue: string) => void;
  onSelectSuggestion?: (suggestion: CitySuggestion) => void;
  name: string;
  id: string;
  required?: boolean;
}

const SuggestionItemSkeleton = () => (
    <div className="flex items-center justify-between px-3 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <Skeleton className="h-5 w-5 rounded-md" />
        <div className="flex flex-col gap-1.5 w-32">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-8" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
);

export function AlertsCitySearch({ value, onValueChange, onSelectSuggestion, name, id, required }: AlertsCitySearchProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingSuggestions, startSuggestionTransition] = useTransition();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { convertTemperature, getTemperatureUnitSymbol } = useUnits();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleUseLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await getCityFromCoordsAction(latitude, longitude);

        if (result.city) {
          onValueChange(result.city);
        } else {
          toast({
            variant: 'destructive',
            title: 'Could not find city',
            description: result.error || 'Unable to determine city name from your location.',
          });
        }
        setIsLocating(false);
      },
      (error) => {
        toast({
          variant: 'destructive',
          title: 'Geolocation Error',
          description: error.message || 'Unable to retrieve your location.',
        });
        setIsLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const debouncedFetchSuggestions = useCallback(
    (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSuggestionsOpen(false);
        return;
      }
      startSuggestionTransition(async () => {
        const result = await fetchCitySuggestionsAction(query);
        if (result.suggestions) {
          setSuggestions(result.suggestions.slice(0, 5));
        } else {
          setSuggestions([]);
          console.error("Suggestion fetch error:", result.error);
        }
        setIsSuggestionsOpen(true);
      });
    },
    []
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value && hasFocus) {
        debouncedFetchSuggestions(value);
      } else if (!hasFocus) {
        setIsSuggestionsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [value, hasFocus, debouncedFetchSuggestions]);

  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    onValueChange(suggestion.name); // Use the clean name
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
    setIsSuggestionsOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };
  
  const handleInputChange = (inputValue: string) => {
    onValueChange(inputValue);
    if (inputValue.length > 1) {
      setIsSuggestionsOpen(true);
    } else {
      setIsSuggestionsOpen(false);
    }
  };

  const handleInputFocus = () => {
    setHasFocus(true);
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setIsSuggestionsOpen(false);
        setHasFocus(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [commandRef]);

  return (
    <div className="relative mt-2">
      <Command
        ref={commandRef}
        className="w-full overflow-visible rounded-md bg-transparent border-none p-0 shadow-none"
        shouldFilter={false}
      >
        <div className="relative">
            <CommandPrimitive.Input
            ref={inputRef}
            id={id}
            name={name}
            value={value}
            onValueChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder="e.g., London"
            required={required}
            autoComplete="off"
            className={cn(
                "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ease-in-out"
            )}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-primary z-10"
                onClick={handleUseLocation}
                disabled={isLocating}
                aria-label="Use current location"
            >
                {isLocating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                <LocateFixed className="h-5 w-5" />
                )}
            </Button>
        </div>

        {isSuggestionsOpen && hasFocus && (
          <div className="relative w-full">
            <CommandList className="absolute top-1.5 left-0 right-0 rounded-md bg-popover text-popover-foreground shadow-lg z-50 border border-border max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                {isLoadingSuggestions ? (
                  <div className="p-1">
                    <SuggestionItemSkeleton />
                    <SuggestionItemSkeleton />
                    <SuggestionItemSkeleton />
                  </div>
                ) : !isLoadingSuggestions && suggestions.length === 0 && value.length >= 2 ? (
                  <CommandEmpty>
                    <div className="py-6 text-center text-sm flex flex-col items-center gap-2">
                        <Frown className="h-8 w-8 text-muted-foreground/50" />
                        <p className="font-semibold text-foreground">No results found</p>
                        <p className="text-muted-foreground">Could not find a city matching "{value}".</p>
                    </div>
                  </CommandEmpty>
                ) : suggestions.length > 0 ? (
                    <CommandGroup>
                    {suggestions.map((suggestion) => {
                        const uniqueKey = `${suggestion.name}|${suggestion.country}|${suggestion.state || 'NO_STATE'}|${suggestion.lat.toFixed(4)}|${suggestion.lon.toFixed(4)}`;
                        const Icon = suggestion.isLandmark ? Landmark : MapPin;
                        const iconColor = suggestion.isLandmark ? "text-primary" : "text-muted-foreground";
                        return (
                            <CommandItem
                            key={uniqueKey}
                            value={uniqueKey}
                            onSelect={() => handleSelectSuggestion(suggestion)}
                            className="cursor-pointer text-sm py-2.5 px-3 aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center justify-between transition-colors duration-150"
                            >
                            <div className="flex items-center min-w-0 gap-3">
                                <Icon className={cn("mr-3 h-5 w-5 flex-shrink-0", iconColor)} />
                                <div className="flex flex-col items-start truncate">
                                <span className="font-medium text-foreground">{suggestion.name}</span>
                                {!suggestion.isLandmark && (
                                  <span className="text-xs text-muted-foreground">
                                      {suggestion.state ? `${suggestion.state}, ${suggestion.country}`: suggestion.country}
                                  </span>
                                )}
                                </div>
                            </div>
                            {isMounted && typeof suggestion.temperature === 'number' && suggestion.iconCode && (
                                <div className="flex items-center gap-2 text-sm ml-4 flex-shrink-0">
                                <span className="font-semibold text-foreground">{convertTemperature(suggestion.temperature)}{getTemperatureUnitSymbol()}</span>
                                <WeatherIcon iconCode={suggestion.iconCode} className="h-5 w-5 text-muted-foreground" />
                                </div>
                            )}
                            </CommandItem>
                        );
                    })}
                    </CommandGroup>
                ) : (
                  <CommandEmpty>Type 2+ characters to see suggestions.</CommandEmpty>
                )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
