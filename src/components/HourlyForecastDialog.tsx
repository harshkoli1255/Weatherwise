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

function DetailItem({ icon: Icon, label, value, className }: DetailItemProps) {
  return (
    <div className={cn("flex items-center space-x-4 rounded-lg bg-background p-4", className)}>
      <Icon className="h-7 w-7 text-primary flex-shrink-0" />
      <div className="flex flex-col">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}

export function HourlyForecastDialog({ data, open, onOpenChange }: HourlyForecastDialogProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-glass border-primary/20 shadow-2xl rounded-lg">
        <DialogHeader className="text-center items-center pb-4">
          <DialogTitle className="text-2xl font-headline text-foreground">
            Forecast for {data.time}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground/90 capitalize">
            {data.condition}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6">
            <div className="flex items-center gap-4">
                 <WeatherIcon iconCode={data.iconCode} className="h-24 w-24 text-primary drop-shadow-lg" />
                 <p className="text-7xl font-bold text-foreground drop-shadow-lg">{data.temp}°<span className="text-5xl text-foreground/70">C</span></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-6 border-t border-border/50">
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
