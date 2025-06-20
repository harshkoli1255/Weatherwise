
'use server';

import type { WeatherData, OpenWeatherCurrentAPIResponse, OpenWeatherForecastAPIResponse, WeatherSummaryData, HourlyForecastData, IpApiLocationResponse } from '@/lib/types';
import { summarizeWeather, type WeatherSummaryInput, type WeatherSummaryOutput } from '@/ai/flows/weather-summary';
import { z } from 'zod';
import { format } from 'date-fns';

type LocationIdentifier = 
  | { type: 'city', city: string }
  | { type: 'coords', lat: number, lon: number };

const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});
const CityNameSchema = z.string().min(1, { message: "City name cannot be empty." });

async function fetchCurrentWeather(location: LocationIdentifier, apiKey: string): Promise<WeatherData> {
  let url = '';
  if (location.type === 'city') {
    const cityValidation = CityNameSchema.safeParse(location.city);
    if (!cityValidation.success) {
      throw new Error(cityValidation.error.errors[0].message);
    }
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.city)}&appid=${apiKey}&units=metric`;
  } else { // type === 'coords'
    const coordsValidation = CoordinatesSchema.safeParse({ lat: location.lat, lon: location.lon });
    if (!coordsValidation.success) {
      throw new Error("Invalid coordinates provided.");
    }
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      const errorMessage = location.type === 'city' ? `City "${location.city}" not found.` : "Weather data not found for the provided coordinates.";
      throw new Error(errorMessage);
    }
    const errorData = await response.json();
    console.error("OpenWeather Current API error:", errorData);
    throw new Error(errorData.message || `Failed to fetch current weather data (status: ${response.status})`);
  }

  const data: OpenWeatherCurrentAPIResponse = await response.json();

  if (!data.weather || data.weather.length === 0) {
    throw new Error("Current weather condition data not available.");
  }

  return {
    city: data.name,
    country: data.sys.country,
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    condition: data.weather[0].main,
    description: data.weather[0].description,
    iconCode: data.weather[0].icon,
  };
}

async function fetchHourlyForecast(location: LocationIdentifier, apiKey: string): Promise<HourlyForecastData[]> {
   let url = '';
  if (location.type === 'city') {
    const cityValidation = CityNameSchema.safeParse(location.city);
    if (!cityValidation.success) {
        throw new Error(cityValidation.error.errors[0].message);
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location.city)}&appid=${apiKey}&units=metric&cnt=8`;
  } else { // type === 'coords'
    const coordsValidation = CoordinatesSchema.safeParse({ lat: location.lat, lon: location.lon });
    if (!coordsValidation.success) {
        throw new Error("Invalid coordinates provided for forecast.");
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&cnt=8`;
  }
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorData: OpenWeatherForecastAPIResponse | { message: string } = await response.json();
    console.error("OpenWeather Forecast API error:", errorData);
    const errorMessage = typeof errorData.message === 'string' ? errorData.message : `Failed to fetch forecast data (status: ${response.status})`;
    throw new Error(errorMessage);
  }

  const data: OpenWeatherForecastAPIResponse = await response.json();

  if (!data.list || data.list.length === 0) {
    return [];
  }
  
  const timezoneOffsetSeconds = data.city?.timezone ?? 0;

  return data.list.map(item => {
    const localTimestamp = (item.dt + timezoneOffsetSeconds) * 1000;
    const localDate = new Date(localTimestamp);
    const time = format(localDate, 'ha', { useAdditionalWeekYearTokens: false, useAdditionalDayOfYearTokens: false });

    return {
      time: time,
      timestamp: item.dt,
      temp: Math.round(item.main.temp),
      iconCode: item.weather[0].icon,
      condition: item.weather[0].main,
    };
  });
}

export async function fetchWeatherAndSummaryAction(
  params: { city?: string; lat?: number; lon?: number }
): Promise<{ data: WeatherSummaryData | null; error: string | null; cityNotFound: boolean }> {
  
  let locationIdentifier: LocationIdentifier;

  if (typeof params.lat === 'number' && typeof params.lon === 'number') {
    locationIdentifier = { type: 'coords', lat: params.lat, lon: params.lon };
  } else if (params.city) {
    locationIdentifier = { type: 'city', city: params.city };
  } else {
    return { data: null, error: "City name or coordinates must be provided.", cityNotFound: false };
  }

  const openWeatherApiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!openWeatherApiKey) {
    console.error("OpenWeather API key is not set (NEXT_PUBLIC_OPENWEATHER_API_KEY).");
    return { data: null, error: "Server configuration error: OpenWeather API key missing. Please try again later.", cityNotFound: false };
  }
  
  const geminiApiKey = process.env.GEMINI_API_KEY_1;
  if (!geminiApiKey) {
    console.warn("Gemini API key (GEMINI_API_KEY_1) is not set. AI summaries may not be available.");
  }


  try {
    const currentWeatherData = await fetchCurrentWeather(locationIdentifier, openWeatherApiKey);
    
    // To get coordinates for the forecast, we use the city name returned by the current weather API,
    // as it might be a canonical name or a location resolved from coordinates.
    // We need to fetch current weather data again just for coordinates if initial call was by city name.
    // This ensures forecast is for the exact location OpenWeatherMap identified.
    let forecastLat = params.lat;
    let forecastLon = params.lon;

    if (locationIdentifier.type === 'city' || !forecastLat || !forecastLon) {
        // If initial was by city, or if lat/lon were not originally provided,
        // use the coordinates from the current weather data response.
        const coordDataResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(currentWeatherData.city)}&appid=${openWeatherApiKey}&units=metric`);
        if (!coordDataResponse.ok) throw new Error('Failed to fetch coordinates for forecast');
        const coordData = await coordDataResponse.json() as OpenWeatherCurrentAPIResponse;
        forecastLat = coordData.coord.lat;
        forecastLon = coordData.coord.lon;
    }
    
    const forecastLocationIdentifier: LocationIdentifier = { type: 'coords', lat: forecastLat as number, lon: forecastLon as number };
    const hourlyForecastData = await fetchHourlyForecast(forecastLocationIdentifier, openWeatherApiKey);


    const aiInput: WeatherSummaryInput = {
      city: currentWeatherData.city,
      temperature: currentWeatherData.temperature,
      feelsLike: currentWeatherData.feelsLike,
      humidity: currentWeatherData.humidity,
      windSpeed: currentWeatherData.windSpeed,
      condition: currentWeatherData.description,
    };

    let aiSummaryOutput: WeatherSummaryOutput | null = null;
    let aiError: string | null = null;

    if (geminiApiKey) { // Only attempt AI summary if a key is configured
        try {
            aiSummaryOutput = await summarizeWeather(aiInput);
        } catch (aiErr) {
            console.error("Error generating AI weather summary:", aiErr);
            aiError = aiErr instanceof Error ? aiErr.message : "An unexpected error occurred with the AI summary service.";
            
            // Check for common Gemini quota error indicators
            if (aiError.includes("429") || aiError.toLowerCase().includes("quota") || aiError.toLowerCase().includes("resource has been exhausted")) {
                aiError = "The AI weather summary service is temporarily unavailable due to high demand (quota exceeded). Weather data is still available.";
            } else {
                aiError = "Could not generate AI weather summary at this time.";
            }
        }
    } else {
        aiError = "AI summary service is not configured.";
    }
    
    return {
      data: { 
        ...currentWeatherData, 
        aiSummary: aiSummaryOutput?.summary || aiError || "AI summary not available.", // Show AI error or a default message if summary fails
        weatherSentiment: aiSummaryOutput?.weatherSentiment || 'neutral', // Default to neutral if summary fails
        hourlyForecast: hourlyForecastData,
      },
      error: null, // Main weather fetch succeeded, AI error is handled within data.aiSummary
      cityNotFound: false
    };

  } catch (error) {
    console.error("Error fetching weather data:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching weather.";
    const cityNotFound = errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("city name cannot be empty");
    return { data: null, error: errorMessage, cityNotFound };
  }
}


export async function fetchCityByIpAction(): Promise<{ city: string | null; country: string | null; lat: number | null; lon: number | null; error: string |null }> {
  try {
    const response = await fetch('http://ip-api.com/json/?fields=status,message,country,city,lat,lon');
    if (!response.ok) {
      throw new Error(`IP Geolocation service failed with status: ${response.status}`);
    }
    const data: IpApiLocationResponse = await response.json();

    if (data.status === 'fail') {
      console.error("IP Geolocation API error:", data.message);
      throw new Error(data.message || "Failed to determine location from IP address.");
    }
    
    return { city: data.city, country: data.country, lat: data.lat, lon: data.lon, error: null };

  } catch (error) {
    console.error("Error fetching city by IP:", error);
    const errorMessage = error instanceof Error ? error.message : "Could not determine location via IP.";
    return { city: null, country: null, lat: null, lon: null, error: errorMessage };
  }
}
