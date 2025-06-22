'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { Loader2, MapPin } from 'lucide-react';
import { fetchCitySuggestionsAction } from '@/app/actions';
import type { CitySuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AlertsCitySearchProps {
  defaultValue: string;
  name: string;
  id: string;
  required?: boolean;
}

export function AlertsCitySearch({ defaultValue, name, id, required }: AlertsCitySearchProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingSuggestions, startSuggestionTransition] = useTransition();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (inputValue && hasFocus && inputValue !== defaultValue) {
        debouncedFetchSuggestions(inputValue);
      } else if (!hasFocus) {
        setIsSuggestionsOpen(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [inputValue, hasFocus, defaultValue, debouncedFetchSuggestions]);

  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    setInputValue(suggestion.name);
    setIsSuggestionsOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };
  
  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length > 1) {
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
    <Command
      ref={commandRef}
      className="relative w-full overflow-visible rounded-md bg-transparent border-none p-0 shadow-none"
      shouldFilter={false}
    >
      <CommandPrimitive.Input
        ref={inputRef}
        id={id}
        name={name}
        value={inputValue}
        onValueChange={handleInputChange}
        onFocus={handleInputFocus}
        placeholder="e.g., London"
        required={required}
        autoComplete="off"
        className={cn(
          "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base font-headline ring-offset-background placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ease-in-out mt-2"
        )}
      />

        {isSuggestionsOpen && hasFocus && (
            <CommandList className="absolute top-full mt-1.5 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-20 border border-border max-h-64 overflow-y-auto">
              {isLoadingSuggestions && (
                <div className="p-2 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
              )}
              {!isLoadingSuggestions && suggestions.length === 0 && inputValue.length >= 2 && (
                <CommandEmpty>No cities found for &quot;{inputValue}&quot;.</CommandEmpty>
              )}
              {!isLoadingSuggestions && inputValue.length < 2 && (
                <CommandEmpty>Type 2+ characters to see suggestions.</CommandEmpty>
              )}
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion.name}-${suggestion.country}-${suggestion.state || 'nostate'}-${index}`}
                    value={suggestion.name}
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
                ))}
              </CommandGroup>
            </CommandList>
          )}
    </Command>
  );
}
