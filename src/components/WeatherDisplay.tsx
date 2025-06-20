
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherIcon } from './WeatherIcon';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Droplets, ThermometerSun, Wind, Brain, Clock } from 'lucide-react';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
}

export function WeatherDisplay({ weatherData }: WeatherDisplayProps) {
  let iconColorClass = 'text-primary'; // Default for neutral
  if (weatherData.weatherSentiment === 'good') {
    iconColorClass = 'text-green-500';
  } else if (weatherData.weatherSentiment === 'bad') {
    iconColorClass = 'text-destructive';
  }

  return (
    <Card className="w-full max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20 transform hover:scale-[1.005] transition-transform duration-300 mt-4 sm:mt-6">
      <CardHeader className="text-center pt-5 sm:pt-6 md:pt-7 pb-3 sm:pb-4 items-center border-b border-border/50">
        <CardTitle className="text-2xl sm:text-3xl md:text-3xl font-headline font-bold text-primary drop-shadow-md">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-base sm:text-lg capitalize text-muted-foreground mt-1 sm:mt-1.5">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-5 md:space-y-6 px-4 sm:px-5 md:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6 md:pb-7">
        <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-3 sm:gap-4 md:gap-5">
          <div className="flex-shrink-0">
            <WeatherIcon iconCode={weatherData.iconCode} className={`h-20 w-20 sm:h-24 md:h-28 ${iconColorClass} drop-shadow-xl mx-auto`} />
          </div>
          <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary drop-shadow-lg">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 text-center pt-2 sm:pt-3">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} />
        </div>
        
        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-3 sm:pt-4 md:pt-5 border-t border-border/50">
            <div className="flex items-center mb-2 sm:mb-2.5 md:mb-3">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-2.5 text-primary flex-shrink-0" />
              <h3 className="text-lg sm:text-xl md:text-2xl font-headline font-semibold text-primary">
                Hourly Forecast
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg bg-muted/50 shadow-inner border border-border/40">
              <div className="flex space-x-2 sm:space-x-2.5 p-2 sm:p-3 md:p-3.5">
                {weatherData.hourlyForecast.map((forecastItem) => (
                  <HourlyForecastItem key={forecastItem.timestamp} forecast={forecastItem} />
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <div className="pt-3 sm:pt-4 md:pt-5 border-t border-border/50">
          <div className="flex items-center mb-2 sm:mb-2.5 md:mb-3">
            <Brain className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-2.5 text-primary flex-shrink-0" />
            <h3 className="text-lg sm:text-xl md:text-2xl font-headline font-semibold text-primary">
              AI Weather Summary
            </h3>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-foreground/90 leading-relaxed bg-muted/50 p-3 sm:p-3.5 md:p-4 rounded-lg shadow-inner border border-border/40">
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
    <div className="flex flex-col items-center p-2 sm:p-3 md:p-3.5 rounded-lg bg-background/70 hover:bg-muted/90 transition-colors duration-200 shadow-lg border border-border/40">
      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary mb-1 sm:mb-1.5" />
      <p className="text-sm sm:text-base text-muted-foreground">{label}</p>
      <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

interface HourlyForecastItemProps {
  forecast: HourlyForecastData;
}

function HourlyForecastItem({ forecast }: HourlyForecastItemProps) {
  return (
    <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 md:p-3.5 rounded-lg bg-background/80 hover:bg-primary/15 transition-colors duration-200 shadow-lg border border-border/40 w-[70px] sm:w-[80px] md:w-[90px] flex-shrink-0">
      <p className="text-sm sm:text-base font-medium text-muted-foreground mb-1 sm:mb-1.5">{forecast.time}</p>
      <WeatherIcon iconCode={forecast.iconCode} className="h-7 w-7 sm:h-8 md:h-9 text-accent drop-shadow-lg mb-1" />
      <p className="text-base sm:text-lg font-bold text-primary mt-1 sm:mt-1.5">{forecast.temp}°C</p>
      <p className="text-xs sm:text-sm capitalize text-muted-foreground/90 mt-1 sm:mt-1.5">{forecast.condition}</p>
    </div>
  );
}

