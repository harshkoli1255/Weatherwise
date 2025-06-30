
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, ThermometerSun, Wind, Brain, Clock, Lightbulb, Bookmark, Loader2, AreaChart as AreaChartIcon, Sparkles } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React, { useState, useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { HourlyForecastDialog } from './HourlyForecastDialog';
import { useUnits } from '@/hooks/useUnits';
import { useSavedLocations } from '@/hooks/useFavorites';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine, ReferenceDot } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
  isLocationSaved: boolean;
  onSaveCityToggle: () => void;
}

interface ForecastCardProps {
  data: HourlyForecastData;
  timezone: number;
  onClick: () => void;
}

function ForecastCard({ data, timezone, onClick }: ForecastCardProps) {
  const { convertTemperature, formatTime, formatShortTime } = useUnits();
  
  const displayTime = formatShortTime(data.timestamp, timezone);
  const preciseTime = formatTime(data.timestamp, timezone);
  
  const condition = data.condition.toLowerCase();
  const showPrecipitation = data.precipitationChance > 10;
  const isCloudy = condition.includes('cloud');
  const isClearDay = data.iconCode === '01d';

  // Determine color for the text below the icon
  const detailColorClass = showPrecipitation
    ? "text-sky-400"
    : isCloudy
    ? "text-slate-400 dark:text-slate-500"
    : "text-muted-foreground";

  // Determine color for the icon itself
  let iconColorClass = 'text-primary'; // Default for night, etc.
  if (showPrecipitation) {
    iconColorClass = 'text-sky-400';
  } else if (isClearDay) {
    iconColorClass = 'text-yellow-400';
  } else if (isCloudy) {
    iconColorClass = 'text-slate-400 dark:text-slate-500';
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-full w-24 shrink-0 flex-col items-center justify-between rounded-lg border border-border/30 bg-background/50 p-3 text-center text-left shadow-lg transition-all duration-300 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      aria-label={`View forecast for ${preciseTime}`}
    >
      {/* Top Part: Time */}
      <p className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-primary">{displayTime}</p>
      
      {/* Middle Part: Icon and Temperature */}
      <div className="flex flex-col items-center">
        <WeatherIcon iconCode={data.iconCode} className={cn("h-10 w-10 drop-shadow-lg", iconColorClass)} />
        <p className="mt-1 text-2xl font-bold text-foreground">{convertTemperature(data.temp)}°</p>
      </div>

      {/* Bottom Part: Precipitation / Humidity */}
      <div className={cn(
          "flex items-center justify-center gap-1.5 text-xs font-medium",
          detailColorClass
        )}>
        {showPrecipitation ? (
          <>
            <Droplets className="h-4 w-4" />
            <span className="font-semibold">{data.precipitationChance}%</span>
          </>
        ) : (
          <>
            <Droplets className="h-4 w-4" />
            <span>{data.humidity}%</span>
          </>
        )}
      </div>
    </button>
  );
}

const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "hsl(var(--chart-1))",
  },
  feelsLike: {
    label: "Feels Like",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;


export function WeatherDisplay({ weatherData, isLocationSaved, onSaveCityToggle }: WeatherDisplayProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyForecastData | null>(null);
  const { convertTemperature, getTemperatureUnitSymbol, convertWindSpeed, getWindSpeedUnitLabel, formatTime, formatShortTime } = useUnits();
  const { isSyncing } = useSavedLocations();

  let sentimentColorClass = 'text-primary'; // Default for neutral
  if (weatherData.weatherSentiment === 'good') {
    sentimentColorClass = 'text-success';
  } else if (weatherData.weatherSentiment === 'bad') {
    sentimentColorClass = 'text-destructive';
  }

  const chartData = useMemo(() => {
    if (!weatherData.hourlyForecast || weatherData.hourlyForecast.length === 0) return [];
    
    // Add current time as the first data point
    const nowData = {
      time: "Now",
      temperature: convertTemperature(weatherData.temperature),
      feelsLike: convertTemperature(weatherData.feelsLike),
      iconCode: weatherData.iconCode,
      condition: weatherData.condition,
      // Use the first forecast point's precipitation chance as a reasonable proxy for "now"
      precipitationChance: weatherData.hourlyForecast[0].precipitationChance,
    };

    const forecastPoints = weatherData.hourlyForecast.map(hour => ({
      time: formatShortTime(hour.timestamp, weatherData.timezone),
      temperature: convertTemperature(hour.temp),
      feelsLike: convertTemperature(hour.feelsLike),
      iconCode: hour.iconCode,
      condition: hour.condition,
      precipitationChance: hour.precipitationChance,
    }));

    return [nowData, ...forecastPoints];
  }, [weatherData, convertTemperature, formatShortTime]);


  // Custom component for rendering X-axis ticks with icons
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload, index } = props;
    // The data for the tick is in `chartData` at the given index.
    const tickData = chartData[index];
  
    if (!tickData) return null;
  
    // Show all time labels for a more detailed, professional look.
    // The use of `formatShortTime` keeps them concise to avoid clutter.
    const timeLabel = payload.value;
  
    const condition = tickData.condition.toLowerCase();
    const showPrecipitation = tickData.precipitationChance > 10;
    const isCloudy = condition.includes('cloud');
    const isClearDay = tickData.iconCode === '01d';

    let iconColorClass = 'text-muted-foreground'; // Default for axis icons
    if (showPrecipitation) {
      iconColorClass = 'text-sky-400';
    } else if (isClearDay) {
      iconColorClass = 'text-yellow-400';
    } else if (isCloudy) {
      iconColorClass = 'text-slate-500 dark:text-slate-400';
    }

    return (
      <g transform={`translate(${x},${y})`}>
        {/* Render the time label */}
        <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
          {timeLabel}
        </text>
        {/* Use foreignObject to render an HTML element (our icon component) inside the SVG */}
        <foreignObject x={-12} y={20} width={24} height={24}>
          <div xmlns="http://www.w3.org/1999/xhtml" className="flex justify-center items-center h-full w-full">
            <WeatherIcon iconCode={tickData.iconCode} className={cn("h-5 w-5", iconColorClass)} />
          </div>
        </foreignObject>
      </g>
    );
  };


  return (
    <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-xl transition-transform duration-300 mt-4">
      <CardHeader className="pt-6 pb-4 border-b border-border/50">
        <div className="flex w-full items-center justify-between gap-2 px-4">
          <div className="w-9" /> {/* Spacer to balance the save icon and ensure title is centered */}
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
                    aria-label={isLocationSaved ? 'Remove this location' : 'Save this location'}
                    className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                        <Bookmark className={cn(
                            "h-6 w-6 transition-all duration-300",
                            isLocationSaved ? "fill-primary text-primary" : "fill-none"
                        )} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSyncing ? "Syncing..." : isLocationSaved ? `Remove ${weatherData.city}` : `Save ${weatherData.city}`}</p>
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
              <AreaChartIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-3 flex-shrink-0 text-primary" />
              <h3 className="text-lg font-headline font-semibold text-primary sm:text-xl">
                24-Hour Temperature Trend
              </h3>
            </div>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: -20,
                  right: 10,
                  top: 10,
                  bottom: 20,
                }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={<CustomXAxisTick />}
                  interval={0}
                  height={60}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tickFormatter={(value) => `${value}°`}
                />
                <ChartTooltip
                  cursor={true}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      labelFormatter={(label) => `Time: ${label}`}
                      formatter={(value, name) => {
                          const config = chartConfig[name as keyof typeof chartConfig];
                          return (
                            <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-x-2">
                                <span className="text-muted-foreground">{config.label}</span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                    {value}{getTemperatureUnitSymbol()}
                                </span>
                            </div>
                          )
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <defs>
                  <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-temperature)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-temperature)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillFeelsLike" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-feelsLike)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-feelsLike)"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <Area
                  dataKey="feelsLike"
                  type="natural"
                  fill="url(#fillFeelsLike)"
                  stroke="var(--color-feelsLike)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Area
                  dataKey="temperature"
                  type="natural"
                  fill="url(#fillTemperature)"
                  stroke="var(--color-temperature)"
                  strokeWidth={2}
                  dot={false}
                />
                 {chartData.length > 0 && (
                  <>
                    <ReferenceDot x="Now" y={chartData[0].temperature} r={5} fill="hsl(var(--chart-1))" stroke="hsl(var(--background))" strokeWidth={2} />
                    <ReferenceDot x="Now" y={chartData[0].feelsLike} r={5} fill="hsl(var(--chart-2))" stroke="hsl(var(--background))" strokeWidth={2} />
                  </>
                )}
              </AreaChart>
            </ChartContainer>
          </div>
        )}

        {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 mr-3 flex-shrink-0 text-primary" />
              <h3 className="text-lg font-headline font-semibold text-primary sm:text-xl">
                Hourly Details
              </h3>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-lg -mx-2 px-2">
              <div className="flex h-40 w-max space-x-3 pb-4">
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
            className="text-base text-foreground/90 leading-relaxed bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20 [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/90 [&_strong]:px-2 [&_strong]:py-1 [&_strong]:rounded-md"
            dangerouslySetInnerHTML={{ __html: weatherData.aiSummary }}
          />
        </div>

        {weatherData.aiInsights && weatherData.aiInsights.length > 0 && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center mb-4">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
              <h3 className="text-lg sm:text-xl font-headline font-semibold text-primary">
                Key Insights
              </h3>
            </div>
            <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20">
              <ul className="space-y-3">
                {weatherData.aiInsights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                     <div className="p-1.5 bg-primary/20 rounded-full mr-3 mt-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                     </div>
                    <span
                      className="text-base text-foreground/90 flex-1 [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/90 [&_strong]:px-2 [&_strong]:py-1 [&_strong]:rounded-md"
                      dangerouslySetInnerHTML={{ __html: insight }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {weatherData.activitySuggestion && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center mb-4">
                <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 mr-3 text-primary flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-headline font-semibold text-primary">
                    Activity Suggestion
                </h3>
            </div>
            <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-lg shadow-inner border border-primary/20 space-y-4">
                <div
                    className="text-base text-foreground/90 leading-relaxed [&_strong]:font-bold [&_strong]:text-primary-foreground [&_strong]:bg-primary/90 [&_strong]:px-2 [&_strong]:py-1 [&_strong]:rounded-md"
                    dangerouslySetInnerHTML={{ __html: weatherData.activitySuggestion }}
                />
                {weatherData.aiImageUrl && (
                    <div className="animate-in fade-in zoom-in-95">
                        <img
                            src={weatherData.aiImageUrl}
                            alt={`AI-generated image for ${weatherData.activitySuggestion} in ${weatherData.city}`}
                            className="w-full h-auto aspect-[16/9] object-cover rounded-md shadow-md border border-border/30"
                        />
                    </div>
                )}
            </div>
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
     <div className={cn("flex items-center space-x-3 rounded-lg bg-muted/50 p-3 shadow-inner border border-border/60", className)} {...props}>
      <div className="p-2 bg-background rounded-lg">
        <Icon className={cn("h-5 w-5", iconColor || 'text-primary')} />
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
    </div>
  );
}
