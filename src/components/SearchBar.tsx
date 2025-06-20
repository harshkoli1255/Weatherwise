
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandLoading, CommandGroup } from '@/components/ui/command';
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

  useEffect(() => {
    if (currentCityName && inputValue === '') {
      // Pre-fill with current city name if available and input is empty
      // No, don't pre-fill to allow user to type freely.
      // Instead, if currentCityName exists, it could be shown as a default/top suggestion
      // when the list opens without any input.
    }
  }, [currentCityName, inputValue]);


  const debouncedFetchSuggestions = useCallback(
    (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsSuggestionsOpen(query.length > 0 && hasFocus); // Keep open if focused and typed something
        return;
      }
      startSuggestionTransition(async () => {
        const result = await fetchCitySuggestionsAction(query);
        if (result.suggestions) {
          setSuggestions(result.suggestions.slice(0, 8)); // Ensure max 8 suggestions
        } else {
          setSuggestions([]);
          console.error("Suggestion fetch error:", result.error);
          // Optionally, show a toast or inline error for suggestion fetching
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
        setSuggestions([]); // Clear if input is empty but focused with a current city (to avoid stale suggestions)
        setIsSuggestionsOpen(false); // Optionally close, or keep open for "Use current location"
      } else if (!hasFocus) {
        setIsSuggestionsOpen(false);
      }
    }, 300); // 300ms debounce

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
    } else if (currentCityName) {
        // Could potentially show "Use current location: [currentCityName]" as the only item
        // For now, let's just allow typing
        setIsSuggestionsOpen(true); // Open to show empty/loading state or if user types
    } else {
        setIsSuggestionsOpen(true); // Open to show empty/loading state
    }
  };

  const handleInputBlur = () => {
    // Delay blur to allow click on suggestion item
    setTimeout(() => {
        if (!document.activeElement || (inputRef.current && !inputRef.current.contains(document.activeElement))) {
            setHasFocus(false);
            setIsSuggestionsOpen(false);
        }
    }, 150); // 150ms delay
  };


  return (
    <form onSubmit={handleSubmit} className="relative flex w-full max-w-md sm:max-w-lg md:max-w-xl items-center space-x-2 sm:space-x-3">
      <Command className="relative w-full overflow-visible rounded-lg sm:rounded-xl shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all duration-150 bg-popover">
        <CommandInput
          ref={inputRef}
          value={inputValue}
          onValueChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={currentCityName ? `Search cities or use '${currentCityName}'` : "E.g., London, Tokyo, New York"}
          className="flex-grow text-sm md:text-base h-11 md:h-12 px-3 sm:px-4 placeholder:text-muted-foreground/70 border-input bg-background focus:ring-0 font-headline"
          aria-label="City name"
          disabled={isSearchingWeather}
          name="city"
        />
        {isSuggestionsOpen && (
          <CommandList className="absolute top-full mt-1.5 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-50 border border-border">
            {isLoadingSuggestions && (
              <div className="p-2 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading suggestions...
              </div>
            )}
            {!isLoadingSuggestions && suggestions.length === 0 && inputValue.length >=2 && (
              <CommandEmpty>No cities found for &quot;{inputValue}&quot;.</CommandEmpty>
            )}
             {!isLoadingSuggestions && inputValue.length < 2 && hasFocus && !currentCityName && (
                <CommandEmpty>Type 2+ characters to see suggestions.</CommandEmpty>
            )}

            {currentCityName && inputValue.length === 0 && !suggestions.length && hasFocus && (
                <CommandItem
                    key="current-location-suggestion"
                    onSelect={() => {
                        setInputValue(currentCityName);
                        setIsSuggestionsOpen(false);
                        onSearch(currentCityName); // Assuming onSearch can handle city name directly for current location
                        inputRef.current?.blur();
                    }}
                    className="cursor-pointer text-base py-2.5"
                >
                    <MapPin className="mr-2 h-4 w-4" />
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
                  {suggestion.name}
                  <span className="ml-1 text-sm text-muted-foreground">
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
        className="h-11 md:h-12 rounded-lg sm:rounded-xl px-4 sm:px-6 shadow-md hover:shadow-lg font-semibold transition-all duration-150 ease-in-out text-sm md:text-base"
      >
        {isSearchingWeather ? (
          <>
            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-1.5 h-4 w-4 md:h-5 md:w-5" /> Search
          </>
        )}
      </Button>
    </form>
  );
}

