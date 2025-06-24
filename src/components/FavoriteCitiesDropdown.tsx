
'use client';

import React, { useState, useMemo } from 'react';
import { useFavoriteCities } from '@/hooks/use-favorite-cities';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Star, Trash2, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CitySuggestion } from '@/lib/types';
import { SignedIn } from '@clerk/nextjs';

export function FavoriteCitiesDropdown() {
  const { favorites, removeMultipleFavorites } = useFavoriteCities();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCities, setSelectedCities] = useState<CitySuggestion[]>([]);

  const handleSelectionChange = (city: CitySuggestion, isChecked: boolean) => {
    setSelectedCities(prev => {
      if (isChecked) {
        return [...prev, city];
      } else {
        const cityKey = `${city.lat},${city.lon}`;
        return prev.filter(c => `${c.lat},${c.lon}` !== cityKey);
      }
    });
  };
  
  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedCities([...favorites]);
    } else {
      setSelectedCities([]);
    }
  };

  const handleDelete = () => {
    removeMultipleFavorites(selectedCities);
    setSelectedCities([]);
    setIsAlertOpen(false);
  };

  const isAllSelected = useMemo(() => favorites.length > 0 && selectedCities.length === favorites.length, [favorites, selectedCities]);
  
  const handleCityClick = (city: CitySuggestion) => {
    // Dispatch a custom event that the main page can listen for.
    // This avoids changing the URL.
    const event = new CustomEvent('weather-search', { detail: city });
    window.dispatchEvent(event);
  };
  
  return (
    <SignedIn>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Star className={cn("h-5 w-5 transition-colors", favorites.length > 0 && "text-primary fill-primary")} />
                <span className="hidden md:inline">Favorites</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
                <span className="font-bold">Favorite Cities</span>
                {selectedCities.length > 0 && (
                <Button variant="destructive" size="sm" className="h-7" onClick={() => setIsAlertOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete ({selectedCities.length})
                </Button>
                )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {favorites.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    You have no favorite cities.
                    <p className="text-xs mt-1">Click the star next to a city name to save it.</p>
                </div>
            ) : (
                <>
                    <DropdownMenuGroup>
                        <div className="flex items-center px-2 py-1.5 text-sm">
                            <Checkbox
                                id="select-all"
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                                className="mr-2"
                            />
                            <label htmlFor="select-all" className="font-medium">Select All</label>
                        </div>
                        <DropdownMenuSeparator />
                    </DropdownMenuGroup>

                    <ScrollArea className="h-[250px]">
                        <DropdownMenuGroup>
                        {favorites.map((city) => {
                            const cityKey = `${city.lat},${city.lon}`;
                            const isSelected = selectedCities.some(c => `${c.lat},${c.lon}` === cityKey);

                            return (
                            <DropdownMenuItem
                                key={cityKey}
                                className="flex justify-between items-center p-2 cursor-pointer focus:bg-accent"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleCityClick(city);
                                }}
                            >
                                <div className="flex items-center min-w-0">
                                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                                    <div className="flex flex-col truncate">
                                    <span className="truncate">{city.name}</span>
                                    <span className="text-xs text-muted-foreground truncate">{city.country}</span>
                                    </div>
                                </div>
                                <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectionChange(city, !!checked)}
                                onClick={(e) => e.stopPropagation()}
                                />
                            </DropdownMenuItem>
                            );
                        })}
                        </DropdownMenuGroup>
                    </ScrollArea>
                </>
            )}
            
            </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                This will permanently delete {selectedCities.length} favorite city/cities. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: 'destructive' }))}>
                Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </SignedIn>
  );
}
