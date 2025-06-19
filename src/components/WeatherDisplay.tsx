
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherIcon } from './WeatherIcon';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Droplets, ThermometerSun, Wind, Brain, Clock } from 'lucide-react';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
}

export function WeatherDisplay({ weatherData }: WeatherDisplayProps) {
  return (
    <Card className="w-full max-w-xl shadow-lg rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20 transform hover:scale-[1.005] transition-transform duration-300 mt-1">
      <CardHeader className="text-center pt-2.5 pb-1 items-center border-b border-border/30">
        <CardTitle className="text-lg sm:text-xl font-headline font-bold text-primary drop-shadow-sm">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-sm capitalize text-muted-foreground mt-0.5">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 px-2 sm:px-3 pt-2 pb-2">
        <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-1 sm:gap-2">
          <div className="flex-shrink-0">
            <WeatherIcon iconCode={weatherData.iconCode} size={64} className="mx-auto text-accent drop-shadow-lg" />
          </div>
          <div className="text-4xl sm:text-5xl font-bold text-primary drop-shadow-md">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} />
        </div>
        
        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-2 border-t border-border/30">
            <div className="flex items-center mb-1">
              <Clock className="h-4 w-4 mr-1.5 text-primary flex-shrink-0" />
              <h3 className="text-sm sm:text-base font-headline font-semibold text-primary">
                24-Hour Forecast
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg bg-muted/30 shadow-inner border border-border/20">
              <div className="flex space-x-1 p-1.5">
                {weatherData.hourlyForecast.map((forecastItem) => (
                  <HourlyForecastItem key={forecastItem.timestamp} forecast={forecastItem} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center mb-1">
            <Brain className="h-4 w-4 mr-1.5 text-primary flex-shrink-0" />
            <h3 className="text-sm sm:text-base font-headline font-semibold text-primary">
              AI Weather Summary
            </h3>
          </div>
          <p className="text-xs text-foreground/90 leading-normal bg-muted/30 p-2 rounded-lg shadow-inner border border-border/20">
            {weatherData.aiSummary}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface WeatherDetailItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function WeatherDetailItem({ icon: Icon, label, value }: WeatherDetailItemProps) {
  return (
    <div className="flex flex-col items-center p-1 rounded-lg bg-background/70 hover:bg-muted/80 transition-colors duration-200 shadow-sm border border-border/20">
      <Icon className="h-4 w-4 text-primary mb-0.5" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface HourlyForecastItemProps {
  forecast: HourlyForecastData;
}

function HourlyForecastItem({ forecast }: HourlyForecastItemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg bg-background/70 hover:bg-primary/10 transition-colors duration-200 shadow-sm border border-border/20 w-[60px] sm:w-[70px] flex-shrink-0">
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} size={24} className="text-accent drop-shadow-sm" />
      <p className="text-xs font-bold text-primary mt-0.5">{forecast.temp}°C</p>
      <p className="text-[10px] capitalize text-muted-foreground mt-0.5">{forecast.condition}</p>
    </div>
  );
}
