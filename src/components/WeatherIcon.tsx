
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
  
  let colorClass = 'text-primary';
  if (iconCode.endsWith('n')) {
      // Night icons
      if (['01n', '02n'].includes(iconCode)) colorClass = 'text-gray-300';
      else colorClass = 'text-gray-400';
  } else {
      // Day icons
      if (['01d', '02d'].includes(iconCode)) colorClass = 'text-yellow-400';
      else if (['09d', '10d'].includes(iconCode)) colorClass = 'text-blue-400';
      else if (iconCode === '11d') colorClass = 'text-amber-500';
      else colorClass = 'text-gray-400';
  }

  return <IconComponent className={cn("h-12 w-12", colorClass, className)} {...props} />;
}
