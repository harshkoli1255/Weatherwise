import type { WeatherSummaryData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, ThermometerSun, Wind, Brain, Sunrise, Sunset, Compass } from 'lucide-react'; // Added more icons

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
}

export function WeatherDisplay({ weatherData }: WeatherDisplayProps) {
  return (
    <Card className="w-full max-w-lg shadow-xl rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20">
      <CardHeader className="text-center pt-6 pb-4 items-center">
        <CardTitle className="text-3xl sm:text-4xl font-headline font-bold">{weatherData.city}, {weatherData.country}</CardTitle>
        <CardDescription className="text-lg sm:text-xl capitalize text-muted-foreground">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-around text-center gap-4 sm:gap-8 py-6">
          <div className="flex-shrink-0">
            <WeatherIcon iconCode={weatherData.iconCode} size={100} className="mx-auto text-accent drop-shadow-lg" />
          </div>
          <div className="text-7xl sm:text-8xl font-bold text-primary drop-shadow-md">
            {weatherData.temperature}°C
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
          <WeatherDetailItem icon={ThermometerSun} label="Feels Like" value={`${weatherData.feelsLike}°C`} />
          <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} />
          <WeatherDetailItem icon={Wind} label="Wind" value={`${weatherData.windSpeed} km/h`} />
          {/* You can add more details here if available, e.g., sunrise, sunset, pressure */}
          {/* For example, if you had sunrise/sunset times in weatherData:
          <WeatherDetailItem icon={Sunrise} label="Sunrise" value={formatTime(weatherData.sunrise)} />
          <WeatherDetailItem icon={Sunset} label="Sunset" value={formatTime(weatherData.sunset)} />
          <WeatherDetailItem icon={Compass} label="Pressure" value={`${weatherData.pressure} hPa`} />
          */}
        </div>
        
        <div className="pt-6 border-t border-border/30">
          <div className="flex items-center mb-3">
            <Brain className="h-7 w-7 mr-3 text-primary flex-shrink-0" />
            <h3 className="text-xl sm:text-2xl font-headline font-semibold">
              AI Weather Summary
            </h3>
          </div>
          <p className="text-md text-foreground/90 leading-relaxed bg-muted/30 p-4 rounded-lg shadow-inner">
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
    <div className="flex flex-col items-center p-3 rounded-lg bg-background/60 hover:bg-muted/70 transition-colors duration-200 shadow-sm border border-border/20">
      <Icon className="h-7 w-7 text-primary mb-1.5" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

// Helper function if you decide to add time-based data like sunrise/sunset
// const formatTime = (timestamp: number) => {
//   return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// };
