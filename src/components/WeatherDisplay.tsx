
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
    <Card className="w-full max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20 transform hover:scale-[1.005] transition-transform duration-300 mt-4 sm:mt-6">
      <CardHeader className="text-center pt-4 sm:pt-5 md:pt-6 pb-2 sm:pb-3 items-center border-b border-border/40">
        <CardTitle className="text-lg sm:text-xl md:text-2xl font-headline font-bold text-primary drop-shadow-md">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-sm sm:text-base capitalize text-muted-foreground mt-0.5 sm:mt-1">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 md:space-y-5 px-3 sm:px-4 md:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 md:pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-2 sm:gap-3 md:gap-4">
          <div className="flex-shrink-0">
            <WeatherIcon iconCode={weatherData.iconCode} className="h-16 w-16 sm:h-20 md:h-24 text-accent drop-shadow-xl mx-auto" />
          </div>
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary drop-shadow-lg">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 text-center pt-1 sm:pt-2">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} />
        </div>
        
        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-3 sm:pt-4 border-t border-border/40">
            <div className="flex items-center mb-1.5 sm:mb-2 md:mb-3">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-primary flex-shrink-0" />
              <h3 className="text-base sm:text-lg md:text-xl font-headline font-semibold text-primary">
                24-Hour Forecast
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg bg-muted/40 shadow-inner border border-border/30">
              <div className="flex space-x-1.5 sm:space-x-2 p-1.5 sm:p-2 md:p-3">
                {weatherData.hourlyForecast.map((forecastItem) => (
                  <HourlyForecastItem key={forecastItem.timestamp} forecast={forecastItem} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="pt-3 sm:pt-4 border-t border-border/40">
          <div className="flex items-center mb-1.5 sm:mb-2 md:mb-3">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-primary flex-shrink-0" />
            <h3 className="text-base sm:text-lg md:text-xl font-headline font-semibold text-primary">
              AI Weather Summary
            </h3>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-foreground/90 leading-relaxed bg-muted/40 p-2 sm:p-3 md:p-4 rounded-lg shadow-inner border border-border/30">
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
    <div className="flex flex-col items-center p-1.5 sm:p-2 md:p-3 rounded-lg bg-background/70 hover:bg-muted/80 transition-colors duration-200 shadow-md border border-border/30">
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary mb-0.5 sm:mb-1" />
      <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
      <p className="text-sm sm:text-base md:text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface HourlyForecastItemProps {
  forecast: HourlyForecastData;
}

function HourlyForecastItem({ forecast }: HourlyForecastItemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-2.5 md:p-3 rounded-lg bg-background/80 hover:bg-primary/10 transition-colors duration-200 shadow-md border border-border/30 w-[65px] sm:w-[75px] md:w-[85px] flex-shrink-0">
      <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-0.5 sm:mb-1">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} className="h-6 w-6 sm:h-7 md:h-8 text-accent drop-shadow-md mb-0.5" />
      <p className="text-sm sm:text-base font-bold text-primary mt-0.5 sm:mt-1">{forecast.temp}°C</p>
      <p className="text-[10px] sm:text-xs capitalize text-muted-foreground mt-0.5 sm:mt-1">{forecast.condition}</p>
    </div>
  );
}
