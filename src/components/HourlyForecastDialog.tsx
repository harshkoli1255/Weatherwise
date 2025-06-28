'use client';

import React from 'react';
import type { HourlyForecastData } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, Wind, CloudRain, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HourlyForecastDialogProps {
  data: HourlyForecastData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DetailItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}

// A more visually rich component for displaying individual forecast details.
function DetailItem({ icon: Icon, label, value, className }: DetailItemProps) {
  return (
    <div className={cn("flex items-center space-x-3 rounded-lg bg-muted/60 p-3 shadow-inner border border-border/60", className)}>
      <div className="p-2 bg-background rounded-lg">
        <Icon className="h-6 w-6 text-primary flex-shrink-0" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-base font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}


export function HourlyForecastDialog({ data, open, onOpenChange }: HourlyForecastDialogProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-glass border-primary/20 shadow-xl rounded-lg">
        <DialogHeader className="text-center items-center pt-5 pb-4">
          <DialogTitle className="text-xl font-headline text-foreground">
            Forecast for {data.time}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/80 capitalize">
            {data.condition}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-5 px-4 pb-5">
            {/* Main Temp and Icon */}
            <div className="flex items-center justify-center gap-3">
                 <WeatherIcon iconCode={data.iconCode} className="h-24 w-24 text-primary drop-shadow-lg" />
                 <p className="text-6xl font-bold text-foreground drop-shadow-lg">{data.temp}°<span className="text-4xl text-foreground/70 align-super">C</span></p>
            </div>
            
            {/* Separator */}
            <div className="w-full h-px bg-border/50" />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
                <DetailItem icon={Thermometer} label="Feels Like" value={`${data.feelsLike}°C`} />
                <DetailItem icon={Droplets} label="Humidity" value={`${data.humidity}%`} />
                <DetailItem icon={Wind} label="Wind Speed" value={`${data.windSpeed} km/h`} />
                <DetailItem icon={CloudRain} label="Chance of Rain" value={`${data.precipitationChance}%`} />
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
