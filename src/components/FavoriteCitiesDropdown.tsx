'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSavedLocations } from '@/hooks/useFavorites';
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
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, Trash2, Inbox, RefreshCw, AlertCircle, Bell, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { CitySuggestion, SavedLocationsWeatherMap } from '@/lib/types';
import { SignedIn } from '@clerk/nextjs';
import { fetchWeatherForSavedLocationsAction } from '@/app/actions';
import { WeatherIcon } from './WeatherIcon';
import { Skeleton } from './ui/skeleton';
import { setAlertCityAction } from '@/app/alerts/actions';
import { useToast } from '@/hooks/use-toast';
import { useUnits } from '@/hooks/useUnits';

const SavedLocationItemSkeleton = () => (
  <div className="flex items-center justify-between p-2 m-1">
    <div className="flex items-center min-w-0 gap-3">
      <Skeleton className="h-4 w-4 rounded-md flex-shrink-0" />
      <div className="flex flex-col gap-1.5 w-full">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <div className="ml-auto flex items-center gap-3">
      <Skeleton className="h-5 w-12" />
    </div>
  </div>
);


export function SavedLocationsDropdown() {
  const { savedLocations, removeMultipleLocations, isSyncing } = useSavedLocations();
  const { convertTemperature, getTemperatureUnitSymbol } = useUnits();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCities, setSelectedCities] = useState<CitySuggestion[]>([]);
  const [weatherData, setWeatherData] = useState<SavedLocationsWeatherMap>({});
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [isPendingAlert, startAlertTransition] = React.useTransition();
  const [pendingCityKey, setPendingCityKey] = useState<string | null>(null);
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadSavedLocationsWeather = useCallback(async () => {
    if (savedLocations.length === 0) return;
    setIsLoadingWeather(true);
    const data = await fetchWeatherForSavedLocationsAction(savedLocations);
    setWeatherData(data);
    setIsLoadingWeather(false);
  }, [savedLocations]);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && savedLocations.length > 0) {
      loadSavedLocationsWeather();
    } else if (!isAlertOpen) {
      setSelectedCities([]);
    }
  };

  const handleSelectionChange = (city: CitySuggestion, isChecked: boolean) => {
    setSelectedCities(prev => {
      if (isChecked) {
        return [...prev, city];
      } else {
        const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
        return prev.filter(c => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}` !== cityKey);
      }
    });
  };
  
  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedCities([...savedLocations]);
    } else {
      setSelectedCities([]);
    }
  };

  const handleDelete = () => {
    removeMultipleLocations(selectedCities);
    setSelectedCities([]);
    setIsAlertOpen(false);
  };

  const handleSetAlertCity = useCallback((city: CitySuggestion) => {
    const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
    setPendingCityKey(cityKey);

    startAlertTransition(async () => {
        const result = await setAlertCityAction(city);
        if (result.success) {
            toast({
                title: 'Alert City Set!',
                description: result.message,
                variant: 'success'
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.message,
            });
        }
        setPendingCityKey(null);
    });
  }, [toast]);


  const isAllSelected = useMemo(() => savedLocations.length > 0 && selectedCities.length === savedLocations.length, [savedLocations, selectedCities]);
  
  const handleCityClick = (city: CitySuggestion) => {
    const event = new CustomEvent('weather-search', { detail: city });
    window.dispatchEvent(event);
  };
  
  return (
    <SignedIn>
        <DropdownMenu onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Star className={cn("h-5 w-5 transition-colors", isMounted && savedLocations.length > 0 && "text-primary fill-primary")} />
                <span className="hidden md:inline">Saved</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between p-3">
                <span className="font-bold text-base">Saved Locations</span>
                <div className="flex items-center gap-1">
                    {selectedCities.length > 0 && (
                    <Button variant="destructive" size="sm" className="h-7 rounded-md" onClick={(e) => {
                        e.stopPropagation();
                        setIsAlertOpen(true);
                    }} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                        Delete ({selectedCities.length})
                    </Button>
                    )}
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadSavedLocationsWeather} disabled={isLoadingWeather || isSyncing}>
                                    <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoadingWeather && "animate-spin")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Refresh Weather</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {savedLocations.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-4">
                    <Inbox className="h-10 w-10 text-muted-foreground/50" />
                    <div>
                        <p className="font-semibold text-foreground/90">No Saved Locations Yet</p>
                        <p className="text-xs mt-1">Click the pin next to a city name to save it for quick access.</p>
                    </div>
                </div>
            ) : (
                <>
                    <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="focus:bg-transparent text-muted-foreground"
                    >
                        <div className="flex items-center space-x-3 p-1">
                            <Checkbox
                                id="select-all"
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all locations"
                                disabled={isSyncing}
                            />
                            <label
                                htmlFor="select-all"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Select All
                            </label>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <ScrollArea className="h-[250px]">
                        <DropdownMenuGroup className="p-1">
                        {isLoadingWeather ? (
                            Array.from({ length: Math.min(savedLocations.length, 3) || 3 }).map((_, i) => <SavedLocationItemSkeleton key={i} />)
                        ) : (
                            savedLocations.map((city) => {
                                const cityKey = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
                                const weather = weatherData[cityKey];
                                const isSelected = selectedCities.some(c => `${c.lat.toFixed(4)},${c.lon.toFixed(4)}` === cityKey);
                                const isThisCityPending = pendingCityKey === cityKey;

                                return (
                                <DropdownMenuItem
                                    key={cityKey}
                                    className={cn(
                                        "flex justify-between items-center p-2 cursor-pointer transition-colors focus:bg-accent rounded-md m-1",
                                        isSelected && "bg-primary/10"
                                    )}
                                    onSelect={(e) => {
                                    e.preventDefault();
                                    handleCityClick(city);
                                    }}
                                >
                                    <div className="flex items-center min-w-0 gap-3">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelectionChange(city, !!checked)}
                                            onClick={(e) => e.stopPropagation()}
                                            aria-label={`Select ${city.name}`}
                                            disabled={isSyncing}
                                        />
                                        <div className="flex flex-col truncate">
                                            <span className="font-medium text-foreground truncate">{city.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">{city.country}</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto flex items-center gap-3 text-sm flex-shrink-0">
                                      <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetAlertCity(city);
                                                    }}
                                                    disabled={isPendingAlert || isSyncing}
                                                    aria-label="Set as alert city"
                                                >
                                                    {isThisCityPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Bell className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Set as alert city</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                      {weather && 'temperature' in weather ? (
                                        isMounted ? (
                                          <>
                                            <span className="font-medium text-foreground">{convertTemperature(weather.temperature)}{getTemperatureUnitSymbol()}</span>
                                            <WeatherIcon iconCode={weather.iconCode} className="h-5 w-5 text-muted-foreground" />
                                          </>
                                        ) : <Skeleton className="h-5 w-12" />
                                      ) : null}
                                      {weather && 'error' in weather && (
                                          <TooltipProvider>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <AlertCircle className="h-5 w-5 text-destructive" />
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                      <p>{weather.error}</p>
                                                  </TooltipContent>
                                              </Tooltip>
                                          </TooltipProvider>
                                      )}
                                    </div>
                                </DropdownMenuItem>
                                );
                            })
                        )}
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
                  This will permanently delete {selectedCities.length} saved {selectedCities.length === 1 ? 'location' : 'locations'}. This action cannot be undone.
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
