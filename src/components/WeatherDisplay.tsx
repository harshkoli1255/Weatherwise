import type { WeatherSummaryData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, Thermometer, Wind, Brain } from 'lucide-react'; // Brain for AI summary

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
}

export function WeatherDisplay({ weatherData }: WeatherDisplayProps) {
  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-3xl font-headline">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-lg capitalize">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-around text-center">
          <div>
            <WeatherIcon iconCode={weatherData.iconCode} size={80} className="mx-auto text-accent" />
          </div>
          <div className="text-6xl font-bold text-primary">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Thermometer className="h-6 w-6 text-primary mb-1" />
            <p className="text-sm text-muted-foreground">Feels Like</p>
            <p className="font-semibold">{weatherData.feelsLike}°C</p>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Droplets className="h-6 w-6 text-primary mb-1" />
            <p className="text-sm text-muted-foreground">Humidity</p>
            <p className="font-semibold">{weatherData.humidity}%</p>
          </div>
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <Wind className="h-6 w-6 text-primary mb-1" />
            <p className="text-sm text-muted-foreground">Wind</p>
            <p className="font-semibold">{weatherData.windSpeed} km/h</p>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h3 className="text-lg font-headline flex items-center mb-2">
            <Brain className="h-5 w-5 mr-2 text-primary" />
            AI Weather Summary
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed">{weatherData.aiSummary}</p>
        </div>
      </CardContent>
    </Card>
  );
}
