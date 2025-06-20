
'use client';

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Command, CommandList, CommandItem, CommandEmpty, CommandGroup, CommandInput as CommandPrimitiveInput } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search as SearchIcon, Loader2, MapPin } from 'lucide-react';
import { fetchCitySuggestionsAction } from '@/app/actions';
import type { CitySuggestion } from '@/lib/types';
import { cn } from '@/lib/utils';

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
    const displayName = `${suggestion.name}${suggestion.country ? `, ${suggestion.country}` : ''}`;
    setInputValue(displayName);
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
      className="relative w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl"
    >
      <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none z-10">
          <SearchIcon className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
        </div>
        <Command
            className={cn(
                "relative w-full overflow-visible rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-md group",
                isSearchingWeather ? "opacity-70 cursor-not-allowed" : ""
            )}
            shouldFilter={false}
        >
          <CommandPrimitiveInput
            ref={inputRef}
            value={inputValue}
            onValueChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={currentCityName ? `Search (e.g., '${currentCityName}') or type city...` : "Search cities by name..."}
            className="block w-full h-12 md:h-14 ps-12 pe-[6.5rem] sm:pe-[7rem] md:pe-[7.5rem] text-base md:text-lg text-foreground bg-transparent border-0 rounded-lg placeholder:text-muted-foreground/70 focus:ring-0"
            aria-label="City name"
            disabled={isSearchingWeather}
            name="city"
            id="default-search"
          />
          {isSuggestionsOpen && (
            <CommandList className="absolute top-full mt-1.5 w-full rounded-md bg-popover text-popover-foreground shadow-lg z-20 border border-border max-h-64 overflow-y-scroll">
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
                      className="cursor-pointer text-sm py-2 aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center justify-between"
                  >
                     <div className="flex items-center">
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground">Use current location: {currentCityName}</span>
                      </div>
                  </CommandItem>
              )}
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`${suggestion.name}-${suggestion.country}-${suggestion.state || 'nostate'}-${suggestion.lat.toFixed(2)}-${suggestion.lon.toFixed(2)}-${index}`}
                    value={`${suggestion.name}, ${suggestion.state ? suggestion.state + ', ' : ''}${suggestion.country}`}
                    onSelect={() => handleSelectSuggestion(suggestion)}
                    className="cursor-pointer text-sm py-2 aria-selected:bg-accent aria-selected:text-accent-foreground flex items-center justify-between"
                  >
                    <div className="flex items-center min-w-0"> {/* min-w-0 for truncation */}
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
                    </div>

                    {(suggestion.lat !== undefined && suggestion.lon !== undefined) && (
                      <span className="ml-2 pl-2 text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                        {suggestion.lat.toFixed(3)}, {suggestion.lon.toFixed(3)}
                      </span>
                    )}
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
          className="text-primary-foreground absolute end-2.5 inset-y-2 bg-primary hover:bg-primary/90 focus:ring-4 focus:outline-none focus:ring-ring font-medium rounded-lg text-sm px-4 py-2 h-auto md:h-auto md:text-base md:px-5"
        >
          {isSearchingWeather ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
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
