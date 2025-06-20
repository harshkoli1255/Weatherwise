
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search, Loader2, MapPin } from 'lucide-react';
import { fetchCitySuggestionsAction } from '@/app/actions';
import type { CitySuggestion } from '@/lib/types';

interface SearchBarProps {
  onSearch: (city: string, lat?: number, lon?: number) => void;
  isSearchingWeather: boolean;
  currentCityName?: string;
}

export function SearchBar({ onSearch, isSearchingWeather, currentCityName }: SearchBarProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingSuggestions, startSuggestionTransition] = useTransition();
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedFetchSuggestions = useCallback(
    (query: string) => {
      if (query.length < 1) {
        setSuggestions([]);
        setIsSuggestionsOpen(query.length > 0 && hasFocus);
        return;
      }
      startSuggestionTransition(async () => {
        const result = await fetchCitySuggestionsAction(query);
        if (result.suggestions) {
          setSuggestions(result.suggestions.slice(0, 8));
        } else {
          setSuggestions([]);
          console.error("Suggestion fetch error:", result.error);
        }
        setIsSuggestionsOpen(true);
      });
    },
    [hasFocus]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue && hasFocus) {
        debouncedFetchSuggestions(inputValue);
      } else if (!inputValue && hasFocus && currentCityName) {
        setSuggestions([]);
        setIsSuggestionsOpen(false);
      } else if (!hasFocus) {
        setIsSuggestionsOpen(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, debouncedFetchSuggestions, hasFocus, currentCityName]);

  const handleSelectSuggestion = (suggestion: CitySuggestion) => {
    setInputValue(suggestion.name);
    setIsSuggestionsOpen(false);
    setSuggestions([]);
    onSearch(suggestion.name, suggestion.lat, suggestion.lon);
    inputRef.current?.blur();
  };

  const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (inputValue.trim()) {
      setIsSuggestionsOpen(false);
      setSuggestions([]);
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
    }
  };

  const handleInputFocus = () => {
    setHasFocus(true);
    if (inputValue) {
        debouncedFetchSuggestions(inputValue);
    } else {
        setIsSuggestionsOpen(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => {
        if (!document.activeElement || (inputRef.current && !inputRef.current.contains(document.activeElement))) {
            setHasFocus(false);
            setIsSuggestionsOpen(false);
        }
    }, 150);
  };


  return (
    <form
      onSubmit={handleSubmit}
      // w-full ensures it takes space in its centered container, max-w controls its size, ml-* pushes it right
      className="relative flex w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl items-center space-x-2 sm:space-x-3 ml-0 sm:ml-4 md:ml-8 lg:ml-12"
    >
      <Command className="relative w-full overflow-visible rounded-lg sm:rounded-xl shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all duration-150 bg-popover">
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={currentCityName ? `Search (e.g., '${currentCityName}') or type any city...` : "E.g., London, New York, Tokyo..."}
          className="flex-grow text-sm md:text-base h-12 md:h-14 px-3 sm:px-4 placeholder:text-muted-foreground/70 border-input bg-background focus:ring-0 font-headline"
          aria-label="City name"
          disabled={isSearchingWeather}
          name="city"
        />
        {isSuggestionsOpen && (
          <CommandList className="absolute top-full mt-1.5 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-50 border border-border max-h-64 overflow-y-auto">
            {isLoadingSuggestions && (
              <div className="p-2 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading suggestions...
              </div>
            )}
            {!isLoadingSuggestions && suggestions.length === 0 && inputValue.length >=1 && (
              <CommandEmpty>No cities found for &quot;{inputValue}&quot;.</CommandEmpty>
            )}
             {!isLoadingSuggestions && inputValue.length < 1 && hasFocus && (
                <CommandEmpty>Type 1+ characters to see suggestions.</CommandEmpty>
            )}

            {currentCityName && inputValue.length === 0 && !suggestions.length && hasFocus && (
                <CommandItem
                    key="current-location-suggestion"
                    onSelect={() => {
                        setInputValue(currentCityName);
                        setIsSuggestionsOpen(false);
                        onSearch(currentCityName);
                        inputRef.current?.blur();
                    }}
                    className="cursor-pointer text-base py-2.5"
                >
                    <MapPin className="mr-2 h-5 w-5" />
                    Use current location: {currentCityName}
                </CommandItem>
            )}

            <CommandGroup>
              {suggestions.map((suggestion, index) => (
                <CommandItem
                  key={`${suggestion.name}-${suggestion.country}-${suggestion.lat}-${index}`}
                  value={`${suggestion.name}, ${suggestion.state ? suggestion.state + ', ' : ''}${suggestion.country}`}
                  onSelect={() => handleSelectSuggestion(suggestion)}
                  className="cursor-pointer text-base py-2.5"
                >
                  <MapPin className="mr-2.5 h-5 w-5 text-primary/80" />
                  {suggestion.name}
                  <span className="ml-1.5 text-sm text-muted-foreground">
                    ({suggestion.state ? `${suggestion.state}, ` : ''}{suggestion.country})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
      <Button
        type="submit"
        disabled={isSearchingWeather || !inputValue.trim()}
        aria-label="Search weather"
        className="h-12 md:h-14 rounded-lg sm:rounded-xl px-4 sm:px-6 shadow-md hover:shadow-lg font-semibold transition-all duration-150 ease-in-out text-sm md:text-base"
      >
        {isSearchingWeather ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" /> Search
          </>
        )}
      </Button>
    </form>
  );
}

