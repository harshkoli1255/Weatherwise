
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, Wind, Brain, Lightbulb, Bookmark, Loader2, AreaChart as AreaChartIcon, Sparkles, CloudRain, GaugeCircle, Leaf, RefreshCw, Sunrise, Sunset, Gauge } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React, { useState, useMemo } from 'react';
import { HourlyForecastDialog } from './HourlyForecastDialog';
import { useUnits } from '@/hooks/useUnits';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine, ReferenceDot } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image';

interface WeatherDisplayProps {
  weatherData: WeatherSummaryData;
  isLocationSaved: boolean;
  onSaveCityToggle: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface ForecastCardProps {
  data: HourlyForecastData;
  timezone: number;
  onClick: () => void;
}

function ForecastCard({ data, timezone, onClick }: ForecastCardProps) {
  const { convertTemperature, getTemperatureUnitSymbol, formatShortTime, formatTime } = useUnits();
  
  const displayTime = formatShortTime(data.timestamp, timezone);
  const preciseTime = formatTime(data.timestamp, timezone);
  
  const showPrecipitation = data.precipitationChance > 10;
  
  let borderColor = 'border-border/30';
  if (showPrecipitation) {
    borderColor = 'border-chart-2/50';
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-32 w-24 shrink-0 flex-col items-center justify-between rounded-lg border bg-background/50 p-2 text-center text-left shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        borderColor
      )}
      aria-label={`View forecast for ${preciseTime}`}
    >
      <p className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-primary">{displayTime}</p>
      
      <div className="flex flex-col items-center">
        <WeatherIcon iconCode={data.iconCode} className="h-8 w-8 drop-shadow-lg" />
        <p className="mt-1 text-2xl font-bold text-foreground">{Math.round(convertTemperature(data.temp))}°</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
        {showPrecipitation ? (
          <>
            <Droplets className="h-4 w-4 text-chart-2" />
            <span className="font-semibold text-chart-2">{data.precipitationChance}%</span>
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
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const CustomChartTooltipContent = ({ active, payload, label }: any) => {
  const { getTemperatureUnitSymbol, getWindSpeedUnitLabel, formatTime } = useUnits();

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    const title = data.time === "Now" 
        ? "Current Conditions" 
        : `Forecast for ${formatTime(data.originalData.timestamp, data.originalData.timezone || 0)}`;

    return (
      <div className="grid min-w-[12rem] gap-1.5 rounded-lg border bg-popover p-3 text-xs shadow-xl">
        <div className="font-bold text-foreground mb-1 capitalize">{title}</div>
        <div className="w-full h-px bg-border/50" />
        <div className="grid gap-1.5">
          {payload.map((item: any) => {
            const itemConfig = chartConfig[item.name as keyof typeof chartConfig];
            const displayName = itemConfig?.label || item.name;
            return (
              <div
                key={item.dataKey}
                className="flex w-full items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{displayName}</span>
                </div>
                <span className="font-mono font-medium tabular-nums text-foreground">
                  {item.value}{getTemperatureUnitSymbol()}
                </span>
              </div>
            )
          })}
        </div>
        <div className="w-full h-px bg-border/50" />
        <div className="grid gap-1.5">
            <div className="flex w-full items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-chart-2" />
                <span className="text-muted-foreground">Precipitation</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {data.precipitationChance}%
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-chart-5" />
                <span className="text-muted-foreground">Humidity</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {data.humidity}%
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-chart-4" />
                <span className="text-muted-foreground">Wind</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {data.windSpeed} {getWindSpeedUnitLabel()}
              </span>
            </div>
        </div>
      </div>
    );
  }

  return null;
};

interface PollutantDetailProps {
  name: string;
  description: string;
  value: number;
  unit: string;
  thresholds: { good: number; moderate: number; usg: number; unhealthy: number };
  progressMax: number;
}

const pollutantConfig: Record<string, Omit<PollutantDetailProps, 'value'>> = {
  pm2_5: {
    name: "PM₂.₅",
    description: "Fine Particles",
    unit: "µg/m³",
    thresholds: { good: 12, moderate: 35.4, usg: 55.4, unhealthy: 150.4 },
    progressMax: 150,
  },
  o3: {
    name: "O₃",
    description: "Ozone",
    unit: "µg/m³",
    thresholds: { good: 100, moderate: 168, usg: 208, unhealthy: 785 },
    progressMax: 250,
  },
  no2: {
    name: "NO₂",
    description: "Nitrogen Dioxide",
    unit: "µg/m³",
    thresholds: { good: 100, moderate: 200, usg: 1130, unhealthy: 1620 },
    progressMax: 250,
  },
  co: {
    name: "CO",
    description: "Carbon Monoxide",
    unit: "µg/m³",
    thresholds: { good: 5000, moderate: 10000, usg: 17000, unhealthy: 34000 },
    progressMax: 15000,
  },
};


const PollutantDetail: React.FC<PollutantDetailProps> = ({ name, description, value, unit, thresholds, progressMax }) => {
  const percentage = Math.min((value / progressMax) * 100, 100);
  
  let indicatorColorClass = "bg-success"; // Good
  if (value > thresholds.unhealthy) indicatorColorClass = "bg-chart-3"; // Very Poor
  else if (value > thresholds.usg) indicatorColorClass = "bg-destructive"; // Poor
  else if (value > thresholds.moderate) indicatorColorClass = "bg-chart-4"; // Moderate
  else if (value > thresholds.good) indicatorColorClass = "bg-chart-5"; // Fair

  return (
    <div className="flex flex-col space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/60 shadow-inner">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-foreground" dangerouslySetInnerHTML={{ __html: name }}></span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Progress value={percentage} indicatorClassName={indicatorColorClass} className="h-2" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{value.toFixed(1)} {unit}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const aqiScale = [
  {
    aqi: 1,
    level: "Good",
    range: "0-50",
    impact: "Air quality is satisfactory, and air pollution poses little or no risk.",
    colorClass: "text-success",
    bgColorClass: "bg-success/10",
    borderColorClass: "border-success/50",
  },
  {
    aqi: 2,
    level: "Fair",
    range: "51-100",
    impact: "Sensitive individuals may experience minor respiratory symptoms.",
    colorClass: "text-chart-5",
    bgColorClass: "bg-chart-5/10",
    borderColorClass: "border-chart-5/50",
  },
  {
    aqi: 3,
    level: "Moderate",
    range: "101-200",
    impact: "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
    colorClass: "text-chart-4",
    bgColorClass: "bg-chart-4/10",
    borderColorClass: "border-chart-4/50",
  },
  {
    aqi: 4,
    level: "Poor",
    range: "201-300",
    impact: "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.",
    colorClass: "text-destructive",
    bgColorClass: "bg-destructive/10",
    borderColorClass: "border-destructive/50",
  },
  {
    aqi: 5,
    level: "Very Poor",
    range: "301-400+",
    impact: "Health alert: everyone may experience more serious health effects. Outdoor activity is discouraged.",
    colorClass: "text-chart-3",
    bgColorClass: "bg-chart-3/10",
    borderColorClass: "border-chart-3/50",
  },
];

function AqiScaleGuide({ currentAqi }: { currentAqi: number }) {
  return (
    <InfoCard icon={Leaf} title="Air Quality Index (AQI) Guide">
      <div className="flex flex-col gap-1.5">
        {aqiScale.map((item) => (
          <div
            key={item.aqi}
            className={cn(
              "flex items-center gap-4 p-2.5 rounded-lg transition-all",
              item.aqi === currentAqi ? `${item.bgColorClass} border-l-4 ${item.borderColorClass.replace('/50', '')}` : 'border-l-4 border-transparent'
            )}
          >
            <div
              className={cn("flex h-10 w-10 items-center justify-center rounded-full font-bold flex-shrink-0 text-lg", item.bgColorClass, item.colorClass)}
            >
              {item.aqi}
            </div>
            <div className="flex-1">
              <p className={cn("font-semibold", item.colorClass)}>{item.level}</p>
              <p className="text-xs text-muted-foreground">{item.impact}</p>
            </div>
          </div>
        ))}
      </div>
    </InfoCard>
  );
}


export function WeatherDisplay({ weatherData, isLocationSaved, onSaveCityToggle, onRefresh, isRefreshing, activeTab, onTabChange }: WeatherDisplayProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyForecastData | null>(null);
  const { units, convertTemperature, getTemperatureUnitSymbol, convertWindSpeed, getWindSpeedUnitLabel, formatShortTime, formatTime } = useUnits();
  const { isSyncing } = useSavedLocations();

  const aqiInfo = useMemo(() => {
    if (!weatherData.airQuality) return null;
    return aqiScale.find(item => item.aqi === weatherData.airQuality?.aqi) || null;
  }, [weatherData.airQuality]);

  const humidityColor = useMemo(() => {
    if (weatherData.humidity > 75) return 'text-[hsl(var(--chart-2))]'; // Blue for high humidity
    if (weatherData.humidity < 30) return 'text-[hsl(var(--chart-5))]'; // Yellow for low humidity
    return 'text-primary';
  }, [weatherData.humidity]);

  const windColor = useMemo(() => {
    if (weatherData.windSpeed > 35) return 'text-[hsl(var(--chart-4))]'; // Red/Orange for high wind
    if (weatherData.windSpeed > 15) return 'text-[hsl(var(--chart-3))]'; // Violet for moderate wind
    return 'text-primary';
  }, [weatherData.windSpeed]);

  const aqiComponents = weatherData.airQuality?.components;

  const chartData = useMemo(() => {
    if (!weatherData.hourlyForecast || weatherData.hourlyForecast.length === 0) return [];
    
    const nowData = {
      time: "Now",
      temperature: Math.round(convertTemperature(weatherData.temperature)),
      feelsLike: Math.round(convertTemperature(weatherData.feelsLike)),
      iconCode: weatherData.iconCode,
      condition: weatherData.description,
      precipitationChance: weatherData.hourlyForecast[0].precipitationChance,
      humidity: weatherData.humidity,
      windSpeed: Math.round(convertWindSpeed(weatherData.windSpeed)),
      originalData: { ...weatherData, timezone: weatherData.timezone },
    };

    const forecastPoints = weatherData.hourlyForecast.map(hour => ({
      time: formatShortTime(hour.timestamp, weatherData.timezone),
      temperature: Math.round(convertTemperature(hour.temp)),
      feelsLike: Math.round(convertTemperature(hour.feelsLike)),
      iconCode: hour.iconCode,
      condition: hour.condition,
      precipitationChance: hour.precipitationChance,
      humidity: hour.humidity,
      windSpeed: Math.round(convertWindSpeed(hour.windSpeed)),
      originalData: { ...hour, timezone: weatherData.timezone },
    }));

    return [nowData, ...forecastPoints];
  }, [weatherData, convertTemperature, formatShortTime, convertWindSpeed]);

  const { tempGradientOffset } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { tempGradientOffset: 1 };
    }
    const allTemps = chartData.map(d => d.temperature);
    const yMin = Math.min(...allTemps) - 5;
    const yMax = Math.max(...allTemps) + 5;
    
    if (yMax <= yMin) { 
        return { tempGradientOffset: 1 };
    }

    const hotThreshold = units.temperature === 'celsius' ? 30 : 86;

    if (yMin >= hotThreshold) {
      return { tempGradientOffset: 0 };
    }
    if (yMax <= hotThreshold) {
      return { tempGradientOffset: 1 };
    }

    const offset = (yMax - hotThreshold) / (yMax - yMin);
    return { tempGradientOffset: Math.max(0, Math.min(1, offset)) };
  }, [chartData, units.temperature]);

  const CustomXAxisTick = (props: any) => {
    const { x, y, payload, index } = props;
    const tickData = chartData[index];
  
    if (!tickData) return null;
  
    const timeLabel = payload.value;
  
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={16} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={12}>
          {timeLabel}
        </text>
        <foreignObject x={-10} y={22} width={20} height={20}>
          <div xmlns="http://www.w3.org/1999/xhtml" className="flex justify-center items-center h-full w-full">
            <WeatherIcon iconCode={tickData.iconCode} className="h-4 w-4" />
          </div>
        </foreignObject>
      </g>
    );
  };
  
  return (
    <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-lg transition-transform duration-300 mt-4 animate-in fade-in-up">
      <CardHeader className="pt-6 pb-4 px-4 sm:px-6 border-b border-border/50">
        <div className="relative flex w-full items-center justify-center">
          <CardTitle className="min-w-0 text-center text-xl sm:text-2xl md:text-3xl font-headline font-bold text-primary drop-shadow-md leading-tight">
            {weatherData.city}, {weatherData.country}
          </CardTitle>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 flex-shrink-0">
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRefresh}
                    aria-label="Refresh weather data"
                    disabled={isRefreshing}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary"
                  >
                    <RefreshCw className={cn("h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-500", isRefreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh Data</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSaveCityToggle}
                    aria-label={isLocationSaved ? 'Remove this location' : 'Save this location'}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-primary"
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
                    ) : (
                        <Bookmark className={cn(
                            "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300",
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
        <CardDescription className="text-center text-base capitalize text-muted-foreground mt-1 sm:mt-2">{weatherData.description}</CardDescription>
      </CardHeader>

      <CardContent className="p-0 pb-4">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <div className="flex justify-center px-4 sm:px-6 pt-4">
                <TabsList className="h-auto">
                    <TabsTrigger value="forecast" className="group text-xs sm:text-sm gap-1.5 sm:gap-2 px-2 sm:px-3 h-10">
                        <AreaChartIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                        <span className="truncate">Forecast</span>
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="group text-xs sm:text-sm gap-1.5 sm:gap-2 px-2 sm:px-3 h-10">
                        <Brain className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                        <span className="truncate">AI Insights</span>
                    </TabsTrigger>
                    <TabsTrigger value="health" className="group text-xs sm:text-sm gap-1.5 sm:gap-2 px-2 sm:px-3 h-10">
                        <Leaf className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                        <span className="truncate">Health</span>
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <div className="p-4 sm:p-6 pb-2">
              <TabsContent value="forecast" className="space-y-4 pt-0">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-x-3 gap-y-2 text-center sm:text-left">
                      <div className="flex flex-col items-center sm:items-start animate-in fade-in zoom-in-95 order-1">
                          <div className="flex items-start text-6xl sm:text-7xl font-bold text-foreground drop-shadow-lg">
                              <span>{Math.round(convertTemperature(weatherData.temperature))}</span>
                              <span className="text-3xl sm:text-4xl text-muted-foreground/80 font-semibold mt-1">
                                  {getTemperatureUnitSymbol()}
                              </span>
                          </div>
                          <span className="text-base text-muted-foreground -mt-1">
                              Feels like {Math.round(convertTemperature(weatherData.feelsLike))}{getTemperatureUnitSymbol()}
                          </span>
                      </div>
                      <WeatherIcon iconCode={weatherData.iconCode} className="h-20 w-20 sm:h-24 text-primary drop-shadow-2xl order-2 animate-icon-pop-in" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} iconColor={humidityColor} className="animate-in fade-in" style={{ animationDelay: '300ms' }}/>
                      <WeatherDetailItem icon={Wind} label="Wind" value={`${convertWindSpeed(weatherData.windSpeed)} ${getWindSpeedUnitLabel()}`} iconColor={windColor} className="animate-in fade-in" style={{ animationDelay: '400ms' }}/>
                      <WeatherDetailItem icon={Gauge} label="Pressure" value={`${weatherData.pressure} hPa`} iconColor="text-primary" className="animate-in fade-in" style={{ animationDelay: '500ms' }}/>
                      {aqiInfo && weatherData.airQuality && (
                          <WeatherDetailItem 
                              icon={GaugeCircle} 
                              label="Air Quality" 
                              value={`${aqiInfo.level} (${weatherData.airQuality.aqi})`}
                              iconColor={aqiInfo.colorClass} 
                              className="animate-in fade-in" 
                              style={{ animationDelay: '600ms' }}
                          />
                      )}
                      <WeatherDetailItem icon={Sunrise} label="Sunrise" value={formatTime(weatherData.sunrise, weatherData.timezone)} iconColor="text-[hsl(var(--chart-5))]" className="animate-in fade-in" style={{ animationDelay: '700ms' }}/>
                      <WeatherDetailItem icon={Sunset} label="Sunset" value={formatTime(weatherData.sunset, weatherData.timezone)} iconColor="text-[hsl(var(--chart-4))]" className="animate-in fade-in" style={{ animationDelay: '800ms' }}/>
                  </div>
                  <div className="w-full overflow-x-auto pb-2 horizontal-scrollbar">
                      <div className="flex w-max space-x-3 py-2">
                          {weatherData.hourlyForecast.map((hour, index) => (
                             <div key={index} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 75}ms` }}>
                                <ForecastCard 
                                    data={hour}
                                    timezone={weatherData.timezone}
                                    onClick={() => setSelectedHour(hour)}
                                />
                             </div>
                          ))}
                      </div>
                  </div>
                  <div className="w-full overflow-x-auto pb-2 horizontal-scrollbar">
                      <ChartContainer config={chartConfig} className="h-52 w-full min-w-[700px] sm:h-60 md:h-64 mt-2">
                      <AreaChart
                          accessibilityLayer
                          data={chartData}
                          margin={{
                          left: -5,
                          right: 20,
                          top: 10,
                          bottom: 40,
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
                            cursor={false}
                            content={<CustomChartTooltipContent />}
                            />
                          <defs>
                          <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                              {tempGradientOffset >= 1 && (
                                  <>
                                      <stop offset="5%" stopColor="var(--color-temperature)" stopOpacity={0.8} />
                                      <stop offset="95%" stopColor="var(--color-temperature)" stopOpacity={0.1} />
                                  </>
                              )}
                              {tempGradientOffset <= 0 && (
                                  <>
                                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1} />
                                  </>
                              )}
                              {tempGradientOffset > 0 && tempGradientOffset < 1 && (
                                  <>
                                      <stop offset="0" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                                      <stop offset={tempGradientOffset} stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                                      <stop offset={tempGradientOffset} stopColor="var(--color-temperature)" stopOpacity={0.8} />
                                      <stop offset="1" stopColor="var(--color-temperature)" stopOpacity={0.1} />
                                  </>
                              )}
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
                          activeDot={{
                              r: 6,
                              strokeWidth: 2,
                              fill: "hsl(var(--background))",
                          }}
                          />
                          <Area
                          dataKey="temperature"
                          type="natural"
                          fill="url(#tempGradient)"
                          stroke="var(--color-temperature)"
                          strokeWidth={2}
                          activeDot={{
                              r: 8,
                              strokeWidth: 2,
                              fill: "hsl(var(--background))",
                          }}
                          />
                          {chartData.length > 0 && (
                          <>
                              <ReferenceLine x="Now" stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeWidth={2} />
                              <ReferenceDot x="Now" y={chartData[0].temperature} r={8} fill="hsl(var(--chart-1))" stroke="hsl(var(--background))" strokeWidth={2} />
                              <ReferenceDot x="Now" y={chartData[0].feelsLike} r={6} fill="hsl(var(--chart-3))" stroke="hsl(var(--background))" strokeWidth={2} />
                          </>
                          )}
                      </AreaChart>
                      </ChartContainer>
                  </div>
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4">
                  <InfoCard icon={Brain} title="AI Summary" animationDelay="150ms">
                      <div
                        className="text-sm text-foreground/90 leading-relaxed [&_strong]:font-bold [&_strong]:text-primary"
                        dangerouslySetInnerHTML={{ __html: weatherData.aiSummary }}
                      />
                  </InfoCard>
                  
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {weatherData.aiInsights && weatherData.aiInsights.length > 0 && (
                        <InfoCard icon={Sparkles} title="Key Insights" animationDelay="250ms">
                            <div className="space-y-3">
                              {weatherData.aiInsights.map((insight, index) => (
                                  <div key={index} className="flex items-start rounded-lg bg-muted/50 p-3 shadow-inner border border-border/60 animate-in fade-in-up" style={{ animationDelay: `${index * 100 + 100}ms`}}>
                                  <Sparkles className="h-4 w-4 text-primary/90 mr-3 mt-0.5 flex-shrink-0" />
                                  <span
                                      className="text-sm text-foreground/90 flex-1 [&_strong]:font-bold [&_strong]:text-primary"
                                      dangerouslySetInnerHTML={{ __html: insight }}
                                  />
                                  </div>
                              ))}
                            </div>
                        </InfoCard>
                    )}

                    {weatherData.activitySuggestion && (
                        <InfoCard icon={Lightbulb} title="Activity Suggestion" animationDelay="350ms">
                          <div
                              className="text-sm text-foreground/90 leading-relaxed [&_strong]:font-bold [&_strong]:text-primary"
                              dangerouslySetInnerHTML={{ __html: weatherData.activitySuggestion }}
                          />
                          {weatherData.aiImageUrl && (
                              <div className="mt-4 animate-in fade-in zoom-in-95 overflow-hidden rounded-md shadow-md border border-border/30">
                                  <Image
                                      src={weatherData.aiImageUrl}
                                      alt={`AI-generated image for ${weatherData.activitySuggestion} in ${weatherData.city}`}
                                      width={600}
                                      height={400}
                                      className="w-full h-auto aspect-[16/9] object-cover"
                                  />
                              </div>
                          )}
                        </InfoCard>
                    )}
                  </div>
              </TabsContent>
              
              <TabsContent value="health" className="space-y-6">
                {weatherData.airQuality && aqiInfo ? (
                    <>
                        <div className={cn(
                            "flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg p-4 sm:p-5 border-2 shadow-lg",
                            aqiInfo.borderColorClass,
                            aqiInfo.bgColorClass.replace('/10', '/20') // slightly stronger bg
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn("flex h-14 w-14 items-center justify-center rounded-full flex-shrink-0 bg-background/50 border", aqiInfo.borderColorClass)}>
                                    <Leaf className={cn("h-8 w-8", aqiInfo.colorClass)} />
                                </div>
                                <div>
                                    <h3 className={cn("font-headline text-2xl font-bold", aqiInfo.colorClass)}>
                                        {aqiInfo.level}
                                    </h3>
                                    <p className="text-sm text-foreground/80 max-w-sm mt-1">
                                        {aqiInfo.impact}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">AQI</p>
                                <div className="flex items-baseline justify-end gap-1">
                                    <p className={cn("text-5xl font-bold font-headline", aqiInfo.colorClass)}>
                                        {weatherData.airQuality.aqi}
                                    </p>
                                    <p className="text-2xl text-muted-foreground font-headline">/5</p>
                                </div>
                            </div>
                        </div>

                        {aqiComponents && Object.keys(aqiComponents).length > 0 && (
                            <InfoCard icon={Sparkles} title="Pollutant Breakdown">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                {Object.keys(pollutantConfig).map((key) => {
                                    if (aqiComponents[key as keyof typeof aqiComponents] !== undefined) {
                                        const value = aqiComponents[key as keyof typeof aqiComponents];
                                        const config = pollutantConfig[key];
                                        if (typeof value === 'number') {
                                            return <PollutantDetail key={key} {...config} value={value} />;
                                        }
                                    }
                                    return null;
                                })}
                                </div>
                            </InfoCard>
                        )}
                        <AqiScaleGuide currentAqi={weatherData.airQuality.aqi} />
                    </>
                  ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-in fade-in">
                      <Leaf className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="font-semibold">Air Quality Data Not Available</p>
                      <p className="text-sm mt-1">This location does not currently provide air quality information.</p>
                  </div>
                  )}
              </TabsContent>
            </div>
        </Tabs>
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
      <div className="flex-shrink-0">
        <Icon className={cn("h-6 w-6", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <p className={cn("text-lg font-bold truncate", "text-foreground")}>{value}</p>
      </div>
    </div>
  );
}

interface InfoCardProps {
    icon: React.ElementType;
    title: string;
    children: React.ReactNode;
    animationDelay?: string;
}

function InfoCard({ icon: Icon, title, children, animationDelay }: InfoCardProps) {
    return (
        <div className="h-full p-3 sm:p-4 rounded-lg bg-background/50 shadow-lg border border-border/30 animate-in fade-in-up transition-all duration-300 hover:border-primary/40 hover:scale-[1.02] hover:bg-muted/60" style={{ animationDelay }}>
            <div className="flex flex-row items-center mb-4">
                 <div className="p-2 bg-primary/10 rounded-lg mr-3">
                    <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
                <h3 className="text-base font-headline font-semibold text-primary">{title}</h3>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
}
