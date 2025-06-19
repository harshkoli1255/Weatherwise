
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
    <Card className="w-full max-w-xl shadow-lg rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20 transform hover:scale-[1.005] transition-transform duration-300 mt-2">
      <CardHeader className="text-center pt-3.5 pb-1.5 items-center border-b border-border/30">
        <CardTitle className="text-xl sm:text-2xl font-headline font-bold text-primary drop-shadow-sm">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-sm sm:text-base capitalize text-muted-foreground mt-0.5">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-3 sm:px-4 pt-3 pb-3">
        <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-2 sm:gap-4">
          <div className="flex-shrink-0">
            <WeatherIcon iconCode={weatherData.iconCode} size={72} className="mx-auto text-accent drop-shadow-lg" />
          </div>
          <div className="text-5xl sm:text-6xl font-bold text-primary drop-shadow-md">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} />
        </div>
        
        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-3 border-t border-border/30">
            <div className="flex items-center mb-1.5">
              <Clock className="h-4.5 w-4.5 mr-1.5 text-primary flex-shrink-0" />
              <h3 className="text-base sm:text-lg font-headline font-semibold text-primary">
                24-Hour Forecast
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg bg-muted/30 shadow-inner border border-border/20">
              <div className="flex space-x-1.5 p-2">
                {weatherData.hourlyForecast.map((forecastItem) => (
                  <HourlyForecastItem key={forecastItem.timestamp} forecast={forecastItem} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="pt-3 border-t border-border/30">
          <div className="flex items-center mb-1.5">
            <Brain className="h-4.5 w-4.5 mr-1.5 text-primary flex-shrink-0" />
            <h3 className="text-base sm:text-lg font-headline font-semibold text-primary">
              AI Weather Summary
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 leading-normal bg-muted/30 p-2.5 rounded-lg shadow-inner border border-border/20">
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
    <div className="flex flex-col items-center p-1.5 rounded-lg bg-background/70 hover:bg-muted/80 transition-colors duration-200 shadow-sm border border-border/20">
      <Icon className="h-5 w-5 text-primary mb-0.5" />
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
    <div className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg bg-background/70 hover:bg-primary/10 transition-colors duration-200 shadow-sm border border-border/20 w-[70px] sm:w-[80px] flex-shrink-0">
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} size={28} className="text-accent drop-shadow-sm" />
      <p className="text-xs font-bold text-primary mt-0.5">{forecast.temp}°C</p>
      <p className="text-[11px] capitalize text-muted-foreground mt-0.5">{forecast.condition}</p>
    </div>
  );
}
