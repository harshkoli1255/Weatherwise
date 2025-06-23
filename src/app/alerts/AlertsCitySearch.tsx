
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { Loader2, MapPin, LocateFixed } from 'lucide-react';
import { getCityFromCoordsAction, fetchCitySuggestionsAction } from '@/app/actions';
import type { CitySuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AlertsCitySearchProps {
  value: string;
  onValueChange: (newValue: string) => void;
  name: string;
  id: string;
  required?: boolean;
}

export function AlertsCitySearch({ value, onValueChange, name, id, required }: AlertsCitySearchProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingSuggestions, startSuggestionTransition] = useTransition();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    const displayName = `${suggestion.name}${suggestion.state ? ` (${suggestion.state})` : ''}${suggestion.country ? `, ${suggestion.country}` : ''}`;
    onValueChange(displayName);
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
            <CommandList className="absolute top-1.5 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-20 border border-border max-h-64 overflow-y-auto animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
                {isLoadingSuggestions && (
                <div className="p-2 flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
                )}
                {!isLoadingSuggestions && suggestions.length === 0 && value.length >= 2 && (
                <CommandEmpty>No cities found for &quot;{value}&quot;.</CommandEmpty>
                )}
                {!isLoadingSuggestions && value.length < 2 && (
                <CommandEmpty>Type 2+ characters to see suggestions.</CommandEmpty>
                )}
                <CommandGroup>
                {suggestions.map((suggestion) => {
                    const uniqueKey = `${suggestion.name}|${suggestion.country}|${suggestion.state || 'NO_STATE'}|${suggestion.lat.toFixed(4)}|${suggestion.lon.toFixed(4)}`;
                    return (
                        <CommandItem
                        key={uniqueKey}
                        value={uniqueKey}
                        onSelect={() => handleSelectSuggestion(suggestion)}
                        className="cursor-pointer text-sm py-2 aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center"
                        >
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground truncate">{suggestion.name}</span>
                        {suggestion.country && (
                            <span className="ml-1 text-muted-foreground flex-shrink-0">
                                , {suggestion.country}
                            </span>
                            )}
                            {suggestion.state && (
                            <span className="ml-1 text-xs text-muted-foreground flex-shrink-0">
                                ({suggestion.state})
                            </span>
                            )}
                        </CommandItem>
                    );
                })}
                </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
