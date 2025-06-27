
import type { WeatherSummaryData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, ThermometerSun, Wind, Brain, Clock, Lightbulb, Pin } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React from 'react';
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
  isCitySaved: boolean;
  onSaveCityToggle: () => void;
}

const chartConfig = {
  temp: {
    label: "Temp.",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function WeatherDisplay({ weatherData, isCitySaved, onSaveCityToggle }: WeatherDisplayProps) {

  let sentimentColorClass = 'text-primary'; // Default for neutral
  if (weatherData.weatherSentiment === 'good') {
    sentimentColorClass = 'text-green-500';
  } else if (weatherData.weatherSentiment === 'bad') {
    sentimentColorClass = 'text-destructive';
  }

  return (
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
                  aria-label={isCitySaved ? 'Unpin this city' : 'Pin this city'}
                  className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary"
                >
                  <Pin className={cn(
                      "h-6 w-6 transition-all duration-300",
                      isCitySaved ? "fill-primary text-primary" : "fill-none"
                  )} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCitySaved ? `Unpin ${weatherData.city}` : `Pin ${weatherData.city}`}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-lg capitalize text-muted-foreground mt-1">{weatherData.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center text-center gap-6">
          <div className="flex-shrink-0 order-2 sm:order-1 animate-in fade-in zoom-in-95" style={{ animationDelay: '100ms' }}>
            <div className="text-7xl sm:text-8xl font-bold text-foreground drop-shadow-lg">
              {weatherData.temperature}°
              <span className="text-5xl sm:text-6xl text-muted-foreground/80">C</span>
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
            <ChartContainer config={chartConfig} className="w-full h-[200px]">
              <LineChart
                accessibilityLayer
                data={weatherData.hourlyForecast}
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 0,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}°`}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <ChartTooltip
                  cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 2, strokeDasharray: '3 3' }}
                  content={<ChartTooltipContent
                    formatter={(value) => [`${value}°C`, '']}
                    labelFormatter={(label) => `Time: ${label}`}
                    indicator="dot"
                    labelClassName="font-bold"
                    className="shadow-lg"
                  />}
                />
                <Line
                  dataKey="temp"
                  type="monotone"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: "hsl(var(--primary))",
                    stroke: "hsl(var(--background))",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ChartContainer>
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
