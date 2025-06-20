
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
        setIsSuggestionsOpen(true); // Open even if empty on focus
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow click on suggestion item
    setTimeout(() => {
        if (!document.activeElement || (inputRef.current && !inputRef.current.contains(document.activeElement))) {
            setHasFocus(false);
            setIsSuggestionsOpen(false);
        }
    }, 150); // A small delay like 150ms should be enough
  };


  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl" // Centered by parent div in page.tsx
    >
      <div className="relative">
        <Command className="relative w-full overflow-visible rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-sm group">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none z-10">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <CommandInput
            ref={inputRef}
            value={inputValue}
            onValueChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={currentCityName ? `Search (e.g., '${currentCityName}') or type city...` : "Search cities by name..."}
            className="block w-full h-14 ps-12 pe-[6.5rem] text-base text-foreground bg-transparent border-0 rounded-lg placeholder:text-muted-foreground/70 focus:ring-0"
            aria-label="City name"
            disabled={isSearchingWeather}
            name="city"
            id="default-search" // From example for accessibility with label if present
          />
          {isSuggestionsOpen && (
            <CommandList className="absolute top-full mt-1.5 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-20 border border-border max-h-64 overflow-y-auto">
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
                      className="cursor-pointer text-base py-2.5 aria-selected:bg-accent aria-selected:text-accent-foreground"
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
                    className="cursor-pointer text-base py-2.5 aria-selected:bg-accent aria-selected:text-accent-foreground"
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
          className="text-primary-foreground absolute end-2.5 inset-y-2 bg-primary hover:bg-primary/90 focus:ring-4 focus:outline-none focus:ring-ring font-medium rounded-lg text-sm px-4"
        >
          {isSearchingWeather ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground" />
              Searching
            </>
          ) : (
            'Search'
          )}
        </Button>
      </div>
    </form>
  );
}
    