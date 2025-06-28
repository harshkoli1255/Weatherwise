
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, ThermometerSun, Wind, Brain, Clock, Lightbulb, Pin, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { HourlyForecastDialog } from './HourlyForecastDialog';
import { useUnits } from '@/hooks/useUnits';
import { useFavoriteCities } from '@/hooks/useFavorites';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
  isCitySaved: boolean;
  onSaveCityToggle: () => void;
}

interface ForecastCardProps {
  data: HourlyForecastData;
  timezone: number;
  onClick: () => void;
}

function ForecastCard({ data, timezone, onClick }: ForecastCardProps) {
  const { convertTemperature, formatTime } = useUnits();
  const showPrecipitation = data.precipitationChance > 0;
  const displayTime = formatTime(data.timestamp, timezone);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-between text-center p-2 rounded-lg bg-background/50 hover:bg-muted/80 transition-colors duration-300 shadow-lg border border-border/30 w-24 shrink-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none h-36"
      )}
      aria-label={`View forecast for ${displayTime}`}
    >
      {/* Group top content to push it up */}
      <div className="flex flex-col items-center space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{displayTime}</p>
        <WeatherIcon iconCode={data.iconCode} className="h-8 w-8 text-primary drop-shadow-lg" />
        <p className="text-lg sm:text-xl font-bold text-foreground">{convertTemperature(data.temp)}°</p>
      </div>

      {/* Group bottom content to push it down, showing precipitation or humidity */}
      <div className="flex items-center justify-center gap-1.5 text-xs font-medium pt-1 min-h-[20px]">
        {showPrecipitation ? (
          <>
            <Droplets className="h-3 w-3 text-sky-400" />
            <span className="text-sky-400">{data.precipitationChance}%</span>
          </>
        ) : (
          <>
            <Droplets className="h-3 w-3 text-muted-foreground/80" />
            <span className="text-muted-foreground/80">{data.humidity}%</span>
          </>
        )}
      </div>
    </button>
  );
}


export function WeatherDisplay({ weatherData, isCitySaved, onSaveCityToggle }: WeatherDisplayProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyForecastData | null>(null);
  const { convertTemperature, getTemperatureUnitSymbol, convertWindSpeed, getWindSpeedUnitLabel } = useUnits();
  const { isSyncing } = useFavoriteCities();

  let sentimentColorClass = 'text-primary'; // Default for neutral
  if (weatherData.weatherSentiment === 'good') {
    sentimentColorClass = 'text-success';
  } else if (weatherData.weatherSentiment === 'bad') {
    sentimentColorClass = 'text-destructive';
  }

  return (
    <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-xl transition-transform duration-300 mt-4">
      <CardHeader className="pt-6 pb-4 border-b border-border/50">
        <div className="flex w-full items-center justify-between gap-2 px-4">
          <div className="w-9" /> {/* Spacer to balance the pin icon and ensure title is centered */}
          <CardTitle className="min-w-0 text-center text-2xl sm:text-3xl font-headline font-bold text-primary drop-shadow-md leading-tight">
            {weatherData.city}, {weatherData.country}
          </CardTitle>
          <div className="flex-shrink-0">
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSaveCityToggle}
                    aria-label={isCitySaved ? 'Unpin this city' : 'Pin this city'}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                        <Pin className={cn(
                            "h-6 w-6 transition-all duration-300",
                            isCitySaved ? "fill-primary text-primary" : "fill-none"
                        )} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSyncing ? "Syncing..." : isCitySaved ? `Unpin ${weatherData.city}` : `Pin ${weatherData.city}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <CardDescription className="text-center text-lg capitalize text-muted-foreground mt-2">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center text-center gap-6">
          <div className="flex-shrink-0 order-2 sm:order-1 animate-in fade-in zoom-in-95" style={{ animationDelay: '100ms' }}>
            <div className="text-6xl sm:text-7xl font-bold text-foreground drop-shadow-lg">
              {convertTemperature(weatherData.temperature)}°
              <span className="text-4xl sm:text-5xl text-muted-foreground/80">{getTemperatureUnitSymbol().replace('°','')}</span>
            </div>
          </div>
          <div className="flex justify-center items-center order-1 sm:order-2 animate-in fade-in zoom-in-95" style={{ animationDelay: '200ms' }}>
            <WeatherIcon iconCode={weatherData.iconCode} className={`h-24 w-24 sm:h-28 sm:w-28 ${sentimentColorClass} drop-shadow-2xl`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${convertTemperature(weatherData.feelsLike)}${getTemperatureUnitSymbol()}`} iconColor="text-chart-2" className="animate-in fade-in" style={{ animationDelay: '300ms' }}/>
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} iconColor="text-chart-3" className="animate-in fade-in" style={{ animationDelay: '400ms' }}/>
          <WeatherDetailItem icon={Wind} label="Wind" value={`${convertWindSpeed(weatherData.windSpeed)} ${getWindSpeedUnitLabel()}`} iconColor="text-chart-4" className="animate-in fade-in" style={{ animationDelay: '500ms' }}/>
        </div>
        
        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 mr-3 flex-shrink-0 text-primary" />
              <h3 className="text-lg font-headline font-semibold text-primary sm:text-xl">
                Hourly Forecast
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg -mx-2 px-2">
              <div className="flex w-max space-x-3 pb-4">
                {weatherData.hourlyForecast.map((hour, index) => (
                  <ForecastCard 
                    key={index} 
                    data={hour}
                    timezone={weatherData.timezone}
                    onClick={() => setSelectedHour(hour)}
                  />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center mb-4">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-headline font-semibold text-primary">
              AI Weather Summary
            </h3>
          </div>
          <div
            className="text-base text-foreground/90 leading-relaxed bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20 [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/80 [&_strong]:px-1.5 [&_strong]:py-0.5 [&_strong]:rounded-sm"
            dangerouslySetInnerHTML={{ __html: weatherData.aiSummary }}
          />
        </div>

        {weatherData.activitySuggestion && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center mb-4">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
              <h3 className="text-lg sm:text-xl font-headline font-semibold text-primary">
                Activity Suggestion
              </h3>
            </div>
            <div
              className="text-base text-foreground/90 leading-relaxed bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20 [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/80 [&_strong]:px-1.5 [&_strong]:py-0.5 [&_strong]:rounded-sm"
              dangerouslySetInnerHTML={{ __html: weatherData.activitySuggestion }}
            />
          </div>
        )}
      </CardContent>
       {selectedHour && (
        <HourlyForecastDialog
          data={selectedHour}
          timezone={weatherData.timezone}
          open={!!selectedHour}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedHour(null);
            }
          }}
        />
      )}
    </Card>
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
    <div className={cn("flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 hover:bg-muted/80 transition-all duration-300 shadow-lg border border-border/30 hover:shadow-xl hover:scale-105", className)} {...props}>
      <Icon className={cn("h-6 w-6 mb-2", iconColor || 'text-primary')} />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}
