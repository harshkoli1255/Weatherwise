
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
    <Card className="w-full max-w-2xl shadow-xl rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20 transform hover:scale-[1.005] transition-transform duration-300">
      <CardHeader className="text-center pt-8 pb-6 items-center border-b border-border/30">
        <CardTitle className="text-4xl sm:text-5xl font-headline font-bold text-primary drop-shadow-sm">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-xl sm:text-2xl capitalize text-muted-foreground mt-1">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-10 px-4 sm:px-6 pt-8 pb-8">
        <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-6 sm:gap-10">
          <div className="flex-shrink-0">
            <WeatherIcon iconCode={weatherData.iconCode} size={120} className="mx-auto text-accent drop-shadow-lg" />
          </div>
          <div className="text-8xl sm:text-9xl font-bold text-primary drop-shadow-md">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} />
        </div>
        
        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-8 border-t border-border/30">
            <div className="flex items-center mb-4">
              <Clock className="h-7 w-7 mr-3 text-primary flex-shrink-0" />
              <h3 className="text-2xl sm:text-3xl font-headline font-semibold text-primary">
                24-Hour Forecast
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg bg-muted/30 shadow-inner border border-border/20">
              <div className="flex space-x-4 p-4">
                {weatherData.hourlyForecast.map((forecastItem) => (
                  <HourlyForecastItem key={forecastItem.timestamp} forecast={forecastItem} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="pt-8 border-t border-border/30">
          <div className="flex items-center mb-4">
            <Brain className="h-7 w-7 mr-3 text-primary flex-shrink-0" />
            <h3 className="text-2xl sm:text-3xl font-headline font-semibold text-primary">
              AI Weather Summary
            </h3>
          </div>
          <p className="text-md sm:text-lg text-foreground/90 leading-relaxed bg-muted/30 p-5 rounded-lg shadow-inner border border-border/20">
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
    <div className="flex flex-col items-center p-4 rounded-lg bg-background/70 hover:bg-muted/80 transition-colors duration-200 shadow-md border border-border/20">
      <Icon className="h-8 w-8 text-primary mb-2" />
      <p className="text-md text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface HourlyForecastItemProps {
  forecast: HourlyForecastData;
}

function HourlyForecastItem({ forecast }: HourlyForecastItemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-3 sm:p-4 rounded-lg bg-background/70 hover:bg-primary/10 transition-colors duration-200 shadow-sm border border-border/20 w-28 sm:w-32 flex-shrink-0">
      <p className="text-sm font-medium text-muted-foreground mb-1">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} size={40} className="text-accent mb-1.5 drop-shadow-sm" />
      <p className="text-lg font-bold text-primary">{forecast.temp}°C</p>
      <p className="text-xs capitalize text-muted-foreground mt-0.5">{forecast.condition}</p>
    </div>
  );
}
