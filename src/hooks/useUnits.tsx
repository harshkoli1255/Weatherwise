'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useTransition } from 'react';
import { useUser } from '@clerk/nextjs';
import { saveUnitPreferences } from '@/app/settings/actions';
import { useToast } from './use-toast';

const UNITS_STORAGE_KEY = 'weatherwise-unit-preferences';

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph';
export type TimeFormatUnit = '12h' | '24h';

interface UnitPreferences {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  timeFormat: TimeFormatUnit;
}

interface UnitsContextType {
  units: UnitPreferences;
  setUnits: (newUnits: Partial<UnitPreferences>) => void;
  convertTemperature: (celsius: number) => number;
  getTemperatureUnitSymbol: () => '°C' | '°F';
  convertWindSpeed: (kmh: number) => number;
  getWindSpeedUnitLabel: () => 'km/h' | 'mph';
  formatTime: (timestamp: number, timezoneOffset: number) => string;
}

const UnitsContext = createContext<UnitsContextType | undefined>(undefined);

const defaultUnits: UnitPreferences = {
  temperature: 'celsius',
  windSpeed: 'kmh',
  timeFormat: '12h',
};

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnitsState] = useState<UnitPreferences>(defaultUnits);
  const { user, isLoaded } = useUser();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        // User is logged in, use their synced settings from Clerk.
        const syncedPrefs = user.publicMetadata?.unitPreferences as Partial<UnitPreferences> | undefined;
        setUnitsState({ ...defaultUnits, ...syncedPrefs });
      } else {
        // User is a guest, use localStorage.
        try {
          const storedUnits = localStorage.getItem(UNITS_STORAGE_KEY);
          const parsed = storedUnits ? JSON.parse(storedUnits) : {};
          setUnitsState({ ...defaultUnits, ...parsed });
        } catch (error) {
          console.error("Error reading unit preferences from localStorage", error);
          setUnitsState(defaultUnits);
        }
      }
    }
  }, [user, isLoaded]);

  const setUnits = useCallback((newUnits: Partial<UnitPreferences>) => {
    const originalUnits = units;
    const updatedUnits = { ...originalUnits, ...newUnits };
    setUnitsState(updatedUnits); // Optimistically update the UI.

    if (user) {
      // For logged-in users, sync to Clerk metadata via a server action.
      startTransition(async () => {
        const result = await saveUnitPreferences(newUnits);
        if (result.error) {
          toast({
            variant: 'destructive',
            title: 'Sync Error',
            description: result.error,
          });
          setUnitsState(originalUnits); // Revert on failure.
        }
      });
    } else {
      // For guests, save to localStorage.
      try {
        localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(updatedUnits));
      } catch (error) {
        console.error("Error saving unit preferences to localStorage", error);
      }
    }
  }, [units, user, toast]);

  const convertTemperature = useCallback((celsius: number): number => {
    if (units.temperature === 'fahrenheit') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }, [units.temperature]);
  
  const getTemperatureUnitSymbol = useCallback((): '°C' | '°F' => {
      return units.temperature === 'celsius' ? '°C' : '°F';
  }, [units.temperature]);


  const convertWindSpeed = useCallback((kmh: number): number => {
    if (units.windSpeed === 'mph') {
      return Math.round(kmh / 1.60934);
    }
    return Math.round(kmh);
  }, [units.windSpeed]);

  const getWindSpeedUnitLabel = useCallback((): 'km/h' | 'mph' => {
    return units.windSpeed === 'kmh' ? 'km/h' : 'mph';
  }, [units.windSpeed]);

  const formatTime = useCallback((timestamp: number, timezoneOffset: number): string => {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const h = date.getUTCHours();
    
    if (units.timeFormat === '12h') {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12} ${ampm}`;
    }
    
    const m = String(date.getUTCMinutes()).padStart(2, '0');
    return `${String(h).padStart(2, '0')}:${m}`;
  }, [units.timeFormat]);


  const value = useMemo(() => ({
    units,
    setUnits,
    convertTemperature,
    getTemperatureUnitSymbol,
    convertWindSpeed,
    getWindSpeedUnitLabel,
    formatTime,
  }), [units, setUnits, convertTemperature, getTemperatureUnitSymbol, convertWindSpeed, getWindSpeedUnitLabel, formatTime]);

  return (
    <UnitsContext.Provider value={value}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (context === undefined) {
    throw new Error('useUnits must be used within a UnitsProvider');
  }
  return context;
}
