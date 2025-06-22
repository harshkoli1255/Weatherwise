
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherIcon } from './WeatherIcon';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Droplets, ThermometerSun, Wind, Brain, Clock, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
}

export function WeatherDisplay({ weatherData }: WeatherDisplayProps) {
  let sentimentColorClass = 'text-primary'; // Default for neutral
  if (weatherData.weatherSentiment === 'good') {
    sentimentColorClass = 'text-green-500';
  } else if (weatherData.weatherSentiment === 'bad') {
    sentimentColorClass = 'text-destructive';
  }

  return (
    <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-2xl transform hover:scale-[1.01] transition-transform duration-300 mt-4">
      <CardHeader className="text-center pt-6 pb-4 items-center border-b border-border/50">
        <CardTitle className="text-3xl sm:text-4xl font-headline font-bold text-primary drop-shadow-md">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-lg capitalize text-muted-foreground mt-1">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center text-center gap-6">
          <div className="flex-shrink-0 order-2 sm:order-1">
            <div className="text-7xl sm:text-8xl font-bold text-primary drop-shadow-lg">
              {weatherData.temperature}°
              <span className="text-5xl sm:text-6xl text-primary/80">C</span>
            </div>
          </div>
          <div className="flex justify-center items-center order-1 sm:order-2">
            <WeatherIcon iconCode={weatherData.iconCode} className={`h-28 w-28 sm:h-36 sm:w-36 ${sentimentColorClass} drop-shadow-2xl`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} iconColor="text-orange-400" />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} iconColor="text-sky-400" />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} iconColor="text-cyan-400" />
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
                {weatherData.hourlyForecast.map((forecastItem) => (
                  <HourlyForecastItem key={forecastItem.timestamp} forecast={forecastItem} />
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
          <p className="text-base text-foreground/90 leading-relaxed bg-muted/40 p-4 rounded-lg shadow-inner border border-border/30">
            {weatherData.aiSummary}
          </p>
        </div>

        {weatherData.activitySuggestion && (
          <div className="pt-6 border-t border-border/50">
            <div className="flex items-center mb-4">
              <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
              <h3 className="text-xl sm:text-2xl font-headline font-semibold text-primary">
                Activity Suggestion
              </h3>
            </div>
            <p className="text-base text-foreground/90 leading-relaxed bg-muted/40 p-4 rounded-lg shadow-inner border border-border/30">
              {weatherData.activitySuggestion}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WeatherDetailItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor?: string;
}

function WeatherDetailItem({ icon: Icon, label, value, iconColor }: WeatherDetailItemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-background/50 hover:bg-muted/80 transition-colors duration-200 shadow-lg border border-border/30">
      <Icon className={cn("h-7 w-7 mb-2", iconColor || 'text-primary')} />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

interface HourlyForecastItemProps {
  forecast: HourlyForecastData;
}

function HourlyForecastItem({ forecast }: HourlyForecastItemProps) {
  const getIconColor = (iconCode: string): string => {
    const isDay = iconCode.endsWith('d');
    const code = iconCode.substring(0, 2);

    switch (code) {
      case '01': // Clear sky
        return isDay ? 'text-yellow-400' : 'text-sky-300';
      case '02': // Few clouds
        return isDay ? 'text-yellow-400' : 'text-sky-400';
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
    <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background/50 hover:bg-primary/10 transition-colors duration-200 shadow-lg border border-border/30 w-[85px] flex-shrink-0">
      <p className="text-sm font-medium text-muted-foreground mb-1.5">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} className={cn("h-9 w-9 drop-shadow-lg mb-1", iconColor)} />
      <p className="text-lg font-bold text-primary mt-1.5">{forecast.temp}°</p>
    </div>
  );
}
