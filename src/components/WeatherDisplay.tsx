
import type { WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from './ui/button';
import { WeatherIcon } from './WeatherIcon';
import { Droplets, Wind, Brain, Lightbulb, Bookmark, Loader2, AreaChart as AreaChartIcon, Sparkles, CloudRain, GaugeCircle, Leaf, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import React, { useState, useMemo } from 'react';
import { HourlyForecastDialog } from './HourlyForecastDialog';
import { useUnits } from '@/hooks/useUnits';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine, ReferenceDot } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from 'next/image';

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
  const { convertTemperature, getTemperatureUnitSymbol, formatShortTime, formatTime } = useUnits();
  
  const displayTime = formatShortTime(data.timestamp, timezone);
  const preciseTime = formatTime(data.timestamp, timezone);
  
  const showPrecipitation = data.precipitationChance > 10;
  
  let borderColor = 'border-border/30';
  if (showPrecipitation) {
    borderColor = 'border-sky-400/50';
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-32 w-24 shrink-0 flex-col items-center justify-between rounded-lg border bg-background/50 p-2 text-center text-left shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 hover:border-accent hover:shadow-xl focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        borderColor
      )}
      aria-label={`View forecast for ${preciseTime}`}
    >
      <p className="text-sm font-semibold text-muted-foreground transition-colors group-hover:text-primary">{displayTime}</p>
      
      <div className="flex flex-col items-center">
        <WeatherIcon iconCode={data.iconCode} className="h-8 w-8 drop-shadow-lg" />
        <p className="mt-1 text-2xl font-bold text-foreground">{convertTemperature(data.temp)}°</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
        {showPrecipitation ? (
          <>
            <Droplets className="h-4 w-4 text-sky-400" />
            <span className="font-semibold text-sky-400">{data.precipitationChance}%</span>
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
                <CloudRain className="h-4 w-4 text-chart-1" />
                <span className="text-muted-foreground">Precipitation</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {data.precipitationChance}%
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-chart-4" />
                <span className="text-muted-foreground">Humidity</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {data.humidity}%
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-chart-3" />
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
  if (value > thresholds.unhealthy) indicatorColorClass = "bg-purple-600"; // Very Unhealthy
  else if (value > thresholds.usg) indicatorColorClass = "bg-destructive"; // Unhealthy
  else if (value > thresholds.moderate) indicatorColorClass = "bg-orange-500"; // Unhealthy for Sensitive Groups
  else if (value > thresholds.good) indicatorColorClass = "bg-yellow-500"; // Moderate

  return (
    <div className="flex flex-col space-y-1.5 p-3 rounded-md bg-muted/50 border border-border/70">
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
    impact: "Minimal impact.",
    colorClass: "text-success",
    bgColorClass: "bg-success/10",
    borderColorClass: "border-success/50",
  },
  {
    aqi: 2,
    level: "Satisfactory",
    range: "51-100",
    impact: "May cause minor breathing discomfort to sensitive people.",
    colorClass: "text-yellow-500",
    bgColorClass: "bg-yellow-500/10",
    borderColorClass: "border-yellow-500/50",
  },
  {
    aqi: 3,
    level: "Moderately Polluted",
    range: "101-200",
    impact: "May cause breathing discomfort to people with lung disease, children, and older adults.",
    colorClass: "text-orange-500",
    bgColorClass: "bg-orange-500/10",
    borderColorClass: "border-orange-500/50",
  },
  {
    aqi: 4,
    level: "Poor",
    range: "201-300",
    impact: "May cause breathing discomfort to people on prolonged exposure and discomfort to people with heart disease.",
    colorClass: "text-red-500",
    bgColorClass: "bg-destructive/10",
    borderColorClass: "border-destructive/50",
  },
  {
    aqi: 5,
    level: "Very Poor",
    range: "301-400+",
    impact: "May cause respiratory illness on prolonged exposure. Effects may be more pronounced in people with lung and heart diseases.",
    colorClass: "text-purple-600",
    bgColorClass: "bg-purple-600/10",
    borderColorClass: "border-purple-600/50",
  },
];

function AqiScaleGuide({ currentAqi }: { currentAqi: number }) {
  return (
    <InfoCard icon={Leaf} title="Air Quality Guide" animationDelay="150ms">
      <div className="space-y-2">
        {aqiScale.map((item) => (
          <div
            key={item.aqi}
            className={cn(
              "flex flex-col sm:flex-row items-start sm:items-center p-3 rounded-lg border-2 transition-all duration-300",
              currentAqi === item.aqi
                ? `${item.bgColorClass} ${item.borderColorClass} scale-[1.02]`
                : "bg-muted/50 border-transparent"
            )}
          >
            <div className="flex items-center w-full sm:w-1/3 mb-2 sm:mb-0">
              <span className={cn("text-base font-bold w-32", item.colorClass)}>{item.level}</span>
              <span className="text-sm text-muted-foreground font-mono">({item.range})</span>
            </div>
            <p className="w-full sm:w-2/3 text-sm text-foreground/80">{item.impact}</p>
          </div>
        ))}
      </div>
    </InfoCard>
  );
}


export function WeatherDisplay({ weatherData, isLocationSaved, onSaveCityToggle }: WeatherDisplayProps) {
  const [selectedHour, setSelectedHour] = useState<HourlyForecastData | null>(null);
  const { units, convertTemperature, getTemperatureUnitSymbol, convertWindSpeed, getWindSpeedUnitLabel, formatShortTime } = useUnits();
  const { isSyncing } = useSavedLocations();

  const aqiInfo = useMemo(() => {
    if (!weatherData.airQuality) return null;
    return aqiScale.find(item => item.level === weatherData.airQuality?.level) || null;
  }, [weatherData.airQuality]);

  const aqiComponents = weatherData.airQuality?.components;

  const chartData = useMemo(() => {
    if (!weatherData.hourlyForecast || weatherData.hourlyForecast.length === 0) return [];
    
    const nowData = {
      time: "Now",
      temperature: convertTemperature(weatherData.temperature),
      feelsLike: convertTemperature(weatherData.feelsLike),
      iconCode: weatherData.iconCode,
      condition: weatherData.description,
      precipitationChance: weatherData.hourlyForecast[0].precipitationChance,
      humidity: weatherData.humidity,
      windSpeed: Math.round(convertWindSpeed(weatherData.windSpeed)),
      originalData: { ...weatherData, timezone: weatherData.timezone },
    };

    const forecastPoints = weatherData.hourlyForecast.map(hour => ({
      time: formatShortTime(hour.timestamp, weatherData.timezone),
      temperature: convertTemperature(hour.temp),
      feelsLike: convertTemperature(hour.feelsLike),
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
    <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-xl transition-transform duration-300 mt-4 animate-in fade-in-up">
      <CardHeader className="pt-6 pb-4 px-4 sm:px-6 border-b border-border/50">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="w-8 sm:w-9" /> 
          <CardTitle className="min-w-0 text-center text-xl sm:text-2xl md:text-3xl font-headline font-bold text-primary drop-shadow-md leading-tight">
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

      <CardContent className="p-0">
        <Tabs defaultValue="forecast" className="w-full">
            <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-3 mx-auto max-w-sm h-9 sm:h-10">
                <TabsTrigger value="forecast" className="group text-xs sm:text-sm">
                    <AreaChartIcon className="mr-1.5 h-4 w-4 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                    Forecast
                </TabsTrigger>
                <TabsTrigger value="insights" className="group text-xs sm:text-sm">
                    <Brain className="mr-1.5 h-4 w-4 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                    AI Insights
                </TabsTrigger>
                <TabsTrigger value="health" className="group text-xs sm:text-sm">
                    <Leaf className="mr-1.5 h-4 w-4 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                    Health
                </TabsTrigger>
                </TabsList>
            </div>
            
            <div className="p-4 sm:p-6">
              <TabsContent value="forecast" className="space-y-4 pt-0">
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-2 text-center sm:text-left">
                      <div className="flex flex-col items-center sm:items-start animate-in fade-in zoom-in-95 order-1">
                          <div className="flex items-baseline text-6xl sm:text-7xl md:text-8xl font-bold text-foreground drop-shadow-lg">
                              <span>{convertTemperature(weatherData.temperature)}</span>
                              <span className="text-4xl sm:text-5xl md:text-6xl text-muted-foreground/70">{getTemperatureUnitSymbol()}</span>
                          </div>
                          <span className="text-base text-muted-foreground -mt-1">
                              Feels like {convertTemperature(weatherData.feelsLike)}{getTemperatureUnitSymbol()}
                          </span>
                      </div>
                      <WeatherIcon iconCode={weatherData.iconCode} className="h-20 w-20 sm:h-24 md:h-28 text-primary drop-shadow-2xl animate-in fade-in zoom-in-95 order-2" style={{ animationDelay: '100ms' }} />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-center">
                      <WeatherDetailItem icon={Droplets} label="Humidity" value={`${weatherData.humidity}%`} iconColor="text-chart-3" className="animate-in fade-in" style={{ animationDelay: '300ms' }}/>
                      <WeatherDetailItem icon={Wind} label="Wind" value={`${convertWindSpeed(weatherData.windSpeed)} ${getWindSpeedUnitLabel()}`} iconColor="text-chart-4" className="animate-in fade-in" style={{ animationDelay: '400ms' }}/>
                      {aqiInfo && weatherData.airQuality && (
                          <WeatherDetailItem 
                              icon={GaugeCircle} 
                              label="Air Quality" 
                              value={`${aqiInfo.level} (${weatherData.airQuality.aqi})`}
                              iconColor={aqiInfo.colorClass} 
                              className="animate-in fade-in" 
                              style={{ animationDelay: '500ms' }}
                          />
                      )}
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
                              <ReferenceDot x="Now" y={chartData[0].feelsLike} r={6} fill="hsl(var(--chart-2))" stroke="hsl(var(--background))" strokeWidth={2} />
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

                  {weatherData.aiInsights && weatherData.aiInsights.length > 0 && (
                      <InfoCard icon={Sparkles} title="Key Insights" animationDelay="250ms">
                          <ul className="space-y-3">
                            {weatherData.aiInsights.map((insight, index) => (
                                <li key={index} className="flex items-start rounded-lg bg-muted/50 p-3 shadow-inner border border-border/60 animate-in fade-in-up" style={{ animationDelay: `${index * 100 + 100}ms`}}>
                                <Sparkles className="h-4 w-4 text-primary/90 mr-3 mt-0.5 flex-shrink-0" />
                                <span
                                    className="text-sm text-foreground/90 flex-1 [&_strong]:font-bold [&_strong]:text-primary"
                                    dangerouslySetInnerHTML={{ __html: insight }}
                                />
                                </li>
                            ))}
                          </ul>
                      </InfoCard>
                  )}

                  {weatherData.activitySuggestion && (
                      <InfoCard icon={Lightbulb} title="Activity Suggestion" animationDelay="350ms">
                        <div
                            className="text-sm text-foreground/90 leading-relaxed [&_strong]:font-bold [&_strong]:text-primary"
                            dangerouslySetInnerHTML={{ __html: weatherData.activitySuggestion }}
                        />
                        {weatherData.aiImageUrl && (
                            <div className="mt-3 animate-in fade-in zoom-in-95 overflow-hidden rounded-md shadow-md border border-border/30">
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
              </TabsContent>
              
              <TabsContent value="health" className="space-y-4">
                {weatherData.airQuality && aqiInfo ? (
                    <>
                        <AqiScaleGuide currentAqi={weatherData.airQuality.aqi} />

                        {aqiComponents && (
                            <InfoCard icon={Sparkles} title="Pollutant Breakdown" animationDelay="300ms">
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
     <div className={cn("flex items-center space-x-2 sm:space-x-3 rounded-lg bg-muted/50 p-2 sm:p-3 shadow-inner border border-border/60", className)} {...props}>
      <div className="p-1.5 sm:p-2 bg-background rounded-lg shadow-sm">
        <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor || 'text-primary')} />
      </div>
      <div className="flex flex-col text-left">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-foreground">{value}</span>
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
        <div className="p-4 rounded-lg bg-background/50 shadow-lg border border-border/30 animate-in fade-in-up" style={{ animationDelay }}>
            <div className="flex flex-row items-center mb-3">
                <Icon className="h-5 w-5 mr-2.5 text-primary flex-shrink-0" />
                <h3 className="text-base font-headline font-semibold text-primary">{title}</h3>
            </div>
            <div className="pl-[2.125rem]">
                {children}
            </div>
        </div>
    );
}
