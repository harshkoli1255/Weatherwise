
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { FormEvent } from 'react';

interface SearchBarProps {
  onSearch: (formData: FormData) => void;
  isSearching: boolean;
}

export function SearchBar({ onSearch, isSearching }: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSearch(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2 sm:space-x-3">
      <Input
        type="text"
        name="city"
        placeholder="E.g., London, Tokyo, New York"
        className="flex-grow text-sm md:text-base h-11 md:h-12 px-3 sm:px-4 rounded-lg sm:rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/70 transition-colors duration-150"
        aria-label="City name"
        disabled={isSearching}
        required
      />
      <Button
        type="submit"
        disabled={isSearching}
        aria-label="Search weather"
        size="lg"
        className="h-11 md:h-12 rounded-lg sm:rounded-xl px-4 sm:px-6 shadow-md hover:shadow-lg font-semibold transition-all duration-150 ease-in-out text-sm md:text-base"
      >
        {isSearching ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 md:h-5 md:w-5 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
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
