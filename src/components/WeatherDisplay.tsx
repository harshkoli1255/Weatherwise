
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from './ui/button';
import { WeatherIcon } from './WeatherIcon';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Droplets, ThermometerSun, Wind, Brain, Clock, Lightbulb, Heart, Umbrella } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React from 'react';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
  isCitySaved: boolean;
  onSaveCityToggle: () => void;
}

export function WeatherDisplay({ weatherData, isCitySaved, onSaveCityToggle }: WeatherDisplayProps) {
  const [selectedForecast, setSelectedForecast] = useState<HourlyForecastData | null>(null);

  let sentimentColorClass = 'text-primary'; // Default for neutral
  if (weatherData.weatherSentiment === 'good') {
    sentimentColorClass = 'text-green-500';
  } else if (weatherData.weatherSentiment === 'bad') {
    sentimentColorClass = 'text-destructive';
  }

  return (
    <Dialog open={!!selectedForecast} onOpenChange={(isOpen) => !isOpen && setSelectedForecast(null)}>
      <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-2xl transition-transform duration-300 mt-4">
        <CardHeader className="text-center pt-6 pb-4 items-center border-b border-border/50">
          <div className="flex items-center justify-center gap-3">
            <CardTitle className="text-3xl sm:text-4xl font-headline font-bold text-primary drop-shadow-md">{weatherData.city}, {weatherData.country}</CardTitle>
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSaveCityToggle}
                    aria-label={isCitySaved ? 'Remove from favorites' : 'Add to favorites'}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-red-500"
                  >
                    <Heart className={cn(
                        "h-6 w-6 transition-all duration-300",
                        isCitySaved && "fill-red-500 text-red-600"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isCitySaved ? `Remove ${weatherData.city} from favorites` : `Save ${weatherData.city}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription className="text-lg capitalize text-muted-foreground mt-1">{weatherData.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center text-center gap-6">
            <div className="flex-shrink-0 order-2 sm:order-1 animate-in fade-in zoom-in-95" style={{ animationDelay: '100ms' }}>
              <div className="text-7xl sm:text-8xl font-bold text-amber-400 drop-shadow-lg">
                {weatherData.temperature}°
                <span className="text-5xl sm:text-6xl text-amber-400/80">C</span>
              </div>
            </div>
            <div className="flex justify-center items-center order-1 sm:order-2 animate-in fade-in zoom-in-95" style={{ animationDelay: '200ms' }}>
              <WeatherIcon iconCode={weatherData.iconCode} className={`h-28 w-28 sm:h-36 sm:w-36 ${sentimentColorClass} drop-shadow-2xl`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
            <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} iconColor="text-orange-400" className="animate-in fade-in" style={{ animationDelay: '300ms' }}/>
            <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} iconColor="text-sky-400" className="animate-in fade-in" style={{ animationDelay: '400ms' }}/>
            <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} iconColor="text-cyan-400" className="animate-in fade-in" style={{ animationDelay: '500ms' }}/>
          </div>
          
          {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center mb-4">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
                <h3 className="text-xl sm:text-2xl font-headline font-semibold text-primary">
                  Hourly Forecast
                </h3>
              </div>
              <ScrollArea className="w-full whitespace-nowrap rounded-lg">
                <div className="flex space-x-3 pb-3">
                  {weatherData.hourlyForecast.map((forecastItem, index) => (
                    <HourlyForecastItem 
                      key={forecastItem.timestamp} 
                      forecast={forecastItem} 
                      onClick={() => setSelectedForecast(forecastItem)}
                      className="animate-in fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          <div className="pt-6 border-t border-border/50">
            <div className="flex items-center mb-4">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
              <h3 className="text-xl sm:text-2xl font-headline font-semibold text-primary">
                AI Weather Summary
              </h3>
            </div>
            <div
              className="text-base text-foreground/90 leading-relaxed bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20 [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/80 [&_strong]:px-1.5 [&_strong]:py-0.5 [&_strong]:rounded-md"
              dangerouslySetInnerHTML={{ __html: weatherData.aiSummary }}
            />
          </div>

          {weatherData.activitySuggestion && (
            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center mb-4">
                <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
                <h3 className="text-xl sm:text-2xl font-headline font-semibold text-primary">
                  Activity Suggestion
                </h3>
              </div>
              <div
                className="text-base text-foreground/90 leading-relaxed bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20 [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/80 [&_strong]:px-1.5 [&_strong]:py-0.5 [&_strong]:rounded-md"
                dangerouslySetInnerHTML={{ __html: weatherData.activitySuggestion }}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {selectedForecast && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <WeatherIcon iconCode={selectedForecast.iconCode} className="h-8 w-8 text-primary" />
              Forecast for {selectedForecast.time}
            </DialogTitle>
            <DialogDescription className="text-base capitalize">
              {selectedForecast.condition}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <WeatherDetailItem icon={ThermometerSun} label="Temperature" value={`${selectedForecast.temp}°C`} iconColor="text-orange-400" />
            <WeatherDetailItem icon={Droplets} label="Humidity" value={`${selectedForecast.humidity}%`} iconColor="text-sky-400" />
            <WeatherDetailItem icon={Wind} label="Wind Speed" value={`${selectedForecast.windSpeed} km/h`} iconColor="text-cyan-400" />
            <WeatherDetailItem icon={Umbrella} label="Precipitation" value={`${selectedForecast.precipitationChance}%`} iconColor="text-blue-400" />
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

interface WeatherDetailItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
}

function WeatherDetailItem({ icon: Icon, label, value, iconColor, className, ...props }: WeatherDetailItemProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-4 rounded-lg bg-background/50 hover:bg-muted/80 transition-all duration-300 shadow-lg border border-border/30 hover:shadow-xl hover:scale-105", className)} {...props}>
      <Icon className={cn("h-7 w-7 mb-2", iconColor || 'text-primary')} />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

interface HourlyForecastItemProps extends React.HTMLAttributes<HTMLDivElement> {
  forecast: HourlyForecastData;
}

function HourlyForecastItem({ forecast, className, ...props }: HourlyForecastItemProps) {
  const getIconColor = (iconCode: string): string => {
    const isDay = iconCode.endsWith('d');
    const code = iconCode.substring(0, 2);

    switch (code) {
      case '01': // Clear sky
        return isDay ? 'text-amber-400' : 'text-sky-300';
      case '02': // Few clouds
        return isDay ? 'text-amber-400' : 'text-sky-400';
      case '03': // Scattered clouds
      case '04': // Broken clouds
        return 'text-slate-400 dark:text-slate-300';
      case '09': // Shower rain
      case '10': // Rain
        return 'text-blue-400';
      case '11': // Thunderstorm
        return 'text-indigo-500';
      case '13': // Snow
        return 'text-cyan-300';
      case '50': // Mist / Fog
        return 'text-slate-400 dark:text-slate-300';
      default:
        return 'text-accent-foreground';
    }
  };

  const iconColor = getIconColor(forecast.iconCode);

  return (
    <div className={cn("flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 hover:bg-primary/10 transition-all duration-300 shadow-lg border border-border/30 w-[85px] flex-shrink-0 hover:shadow-xl hover:scale-105 cursor-pointer", className)} {...props}>
      <p className="text-sm font-medium text-muted-foreground mb-1.5">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} className={cn("h-9 w-9 drop-shadow-lg mb-1", iconColor)} />
      <p className="text-lg font-bold text-primary mt-1.5">{forecast.temp}°</p>
    </div>
  );
}
