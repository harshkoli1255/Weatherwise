
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Moon,
  CloudMoon,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType<any>> = {
  // Day
  '01d': Sun,
  '02d': CloudSun,
  '03d': Cloud,
  '04d': Cloud,
  '09d': CloudRain,
  '10d': CloudRain,
  '11d': CloudLightning,
  '13d': CloudSnow,
  '50d': Wind, // Using Wind for Mist/Fog
  // Night
  '01n': Moon,
  '02n': CloudMoon,
  '03n': Cloud,
  '04n': Cloud,
  '09n': CloudRain,
  '10n': CloudRain,
  '11n': CloudLightning,
  '13n': CloudSnow,
  '50n': Wind, // Using Wind for Mist/Fog
  // Default
  'default': Cloud,
};

interface WeatherIconProps {
  iconCode: string;
  className?: string;
}

export function WeatherIcon({ iconCode, className, ...props }: WeatherIconProps) {
  const IconComponent = iconMap[iconCode] || iconMap['default'];
  
  // Map specific weather conditions to themeable chart colors or specific utility classes
  const colorClassMap: Record<string, string> = {
    // Sunny/Clear Day: Use a warm, golden color from the theme
    '01d': 'text-[hsl(var(--chart-3))]', 
    '02d': 'text-[hsl(var(--chart-3))]',
    // Rain: Use a blue color from the theme
    '09d': 'text-[hsl(var(--chart-2))]', 
    '10d': 'text-[hsl(var(--chart-2))]',
    // Lightning: A universal yellow/amber works best
    '11d': 'text-amber-500', 
    // Snow: A light blue works best
    '13d': 'text-blue-300 dark:text-blue-200',
    // Night: Neutral grays are suitable for night icons
    '01n': 'text-gray-300', 
    '02n': 'text-gray-300',
  };
  
  // Default color for neutral conditions like clouds, mist, etc.
  const defaultColor = 'text-muted-foreground';

  // Determine the color class based on the icon code, falling back to default
  const colorClass = colorClassMap[iconCode] || defaultColor;

  return <IconComponent className={cn("h-12 w-12", colorClass, className)} {...props} />;
}
