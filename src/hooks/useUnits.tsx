
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

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

// Helper to read from localStorage
function getUnitsFromStorage(): UnitPreferences {
  const defaultUnits: UnitPreferences = {
    temperature: 'celsius',
    windSpeed: 'kmh',
    timeFormat: '12h',
  };
  if (typeof window === 'undefined') {
    return defaultUnits;
  }
  try {
    const storedUnits = localStorage.getItem(UNITS_STORAGE_KEY);
    const parsed = storedUnits ? JSON.parse(storedUnits) : {};
    return { ...defaultUnits, ...parsed };
  } catch (error) {
    console.error("Error reading unit preferences from localStorage", error);
    return defaultUnits;
  }
}

export function UnitsProvider({ children }: { children: ReactNode }) {
  // Initialize with a default state that is consistent on server and client
  const [units, setUnitsState] = useState<UnitPreferences>({
    temperature: 'celsius',
    windSpeed: 'kmh',
    timeFormat: '12h',
  });

  // Load from localStorage only on the client, after the initial render
  useEffect(() => {
    setUnitsState(getUnitsFromStorage());
  }, []);

  const setUnits = useCallback((newUnits: Partial<UnitPreferences>) => {
    setUnitsState(prev => {
      const updatedUnits = { ...prev, ...newUnits };
      try {
        localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(updatedUnits));
      } catch (error) {
        console.error("Error saving unit preferences to localStorage", error);
      }
      return updatedUnits;
    });
  }, []);

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
    // The timestamp is UTC. The offset is the city's shift from UTC in seconds.
    // By adding them, we get a timestamp that, when interpreted as a UTC date,
    // represents the correct local time in the city.
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const h = date.getUTCHours();
    
    if (units.timeFormat === '12h') {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12; // convert 0 to 12
      return `${h12} ${ampm}`;
    }
    
    // For 24h format, include minutes for clarity.
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
