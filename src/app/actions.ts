
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

async function fetchCurrentWeather(location: LocationIdentifier, apiKey: string): Promise<{data: WeatherData | null, error: string | null, status?: number}> {
  let url = '';
  if (location.type === 'city') {
    const cityValidation = CityNameSchema.safeParse(location.city);
    if (!cityValidation.success) {
      return { data: null, error: cityValidation.error.errors[0].message, status: 400 };
    }
    url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.city)}&appid=${apiKey}&units=metric`;
  } else { // type === 'coords'
    const coordsValidation = CoordinatesSchema.safeParse({ lat: location.lat, lon: location.lon });
    if (!coordsValidation.success) {
      return { data: null, error: "Invalid coordinates provided.", status: 400 };
    }
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
    let errorMessage = errorData.message || `Failed to fetch current weather data (status: ${response.status})`;
    if (response.status === 404) {
      errorMessage = location.type === 'city' ? `City "${location.city}" not found.` : "Weather data not found for the provided coordinates.";
    }
    console.error("OpenWeather Current API error:", { status: response.status, message: errorMessage, url });
    return { data: null, error: errorMessage, status: response.status };
  }

  const data: OpenWeatherCurrentAPIResponse = await response.json();

  if (!data.weather || data.weather.length === 0) {
    return { data: null, error: "Current weather condition data not available.", status: 200 }; // technically not an error, but no data
  }

  return {
    data: {
      city: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
      condition: data.weather[0].main,
      description: data.weather[0].description,
      iconCode: data.weather[0].icon,
    },
    error: null,
    status: 200
  };
}

async function fetchHourlyForecast(location: LocationIdentifier, apiKey: string): Promise<{data: HourlyForecastData[] | null, error: string | null, status?: number}> {
   let url = '';
  if (location.type === 'city') {
    const cityValidation = CityNameSchema.safeParse(location.city);
    if (!cityValidation.success) {
        return { data: null, error: cityValidation.error.errors[0].message, status: 400 };
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location.city)}&appid=${apiKey}&units=metric&cnt=8`;
  } else { // type === 'coords'
    const coordsValidation = CoordinatesSchema.safeParse({ lat: location.lat, lon: location.lon });
    if (!coordsValidation.success) {
        return { data: null, error: "Invalid coordinates provided for forecast.", status: 400 };
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&cnt=8`;
  }
  
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
    const errorMessage = typeof errorData.message === 'string' ? errorData.message : `Failed to fetch forecast data (status: ${response.status})`;
    console.error("OpenWeather Forecast API error:", { status: response.status, message: errorMessage, url });
    return { data: null, error: errorMessage, status: response.status };
  }

  const data: OpenWeatherForecastAPIResponse = await response.json();

  if (!data.list || data.list.length === 0) {
    return { data: [], error: null, status: 200 }; // No forecast items, not necessarily an error
  }
  
  const timezoneOffsetSeconds = data.city?.timezone ?? 0;

  const forecastList = data.list.map(item => {
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
  return { data: forecastList, error: null, status: 200 };
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

  const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
  if (!openWeatherApiKeysString) {
    console.error("OpenWeather API keys are not set (NEXT_PUBLIC_OPENWEATHER_API_KEYS).");
    return { data: null, error: "Server configuration error: OpenWeather API keys missing. Please try again later.", cityNotFound: false };
  }
  const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  if (openWeatherApiKeys.length === 0) {
    console.error("No valid OpenWeather API keys found in NEXT_PUBLIC_OPENWEATHER_API_KEYS.");
    return { data: null, error: "Server configuration error: No valid OpenWeather API keys. Please try again later.", cityNotFound: false };
  }
  
  const geminiApiKeysString = process.env.GEMINI_API_KEYS;
  const hasGeminiConfig = geminiApiKeysString && geminiApiKeysString.split(',').map(key => key.trim()).filter(key => key).length > 0;

  if (!hasGeminiConfig) {
    console.warn("Gemini API key(s) (GEMINI_API_KEYS) are not set or are empty. AI summaries may not be available.");
  }

  let currentWeatherData: WeatherData | null = null;
  let hourlyForecastData: HourlyForecastData[] | null = null;
  let lastOpenWeatherError: string | null = null;
  let successWithKey = false;

  for (const apiKey of openWeatherApiKeys) {
    console.log(`Attempting OpenWeatherMap API with a key.`);
    const currentWeatherResult = await fetchCurrentWeather(locationIdentifier, apiKey);

    if (currentWeatherResult.data) {
      currentWeatherData = currentWeatherResult.data;
      
      // Use coordinates from current weather data for forecast precision
      const forecastLocationIdentifier: LocationIdentifier = { 
        type: 'coords', 
        lat: (currentWeatherResult.data as any).coord?.lat ?? params.lat ?? 0, // Type assertion or check needed
        lon: (currentWeatherResult.data as any).coord?.lon ?? params.lon ?? 0  // Type assertion or check needed
      };
      
      // If initial locationIdentifier was by city, we need its coordinates for the forecast API.
      // OpenWeatherMap's forecast API works best with lat/lon.
      // We fetch current weather again (potentially) to get these if not already available.
      // This is a simplified approach; a more robust one might parse coord from the first call.
      let forecastLat = params.lat;
      let forecastLon = params.lon;

      if (locationIdentifier.type === 'city' || !forecastLat || !forecastLon) {
          const tempCoordDataResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(currentWeatherData.city)}&appid=${apiKey}&units=metric`);
          if (tempCoordDataResponse.ok) {
              const tempCoordData = await tempCoordDataResponse.json() as OpenWeatherCurrentAPIResponse;
              forecastLat = tempCoordData.coord.lat;
              forecastLon = tempCoordData.coord.lon;
          } else {
            console.warn(`Could not refine coordinates for forecast using city: ${currentWeatherData.city}`);
            // Proceed with potentially less accurate forecast or let fetchHourlyForecast handle it
          }
      }

      const finalForecastLocation: LocationIdentifier = { type: 'coords', lat: forecastLat as number, lon: forecastLon as number };
      const hourlyForecastResult = await fetchHourlyForecast(finalForecastLocation, apiKey);

      if (hourlyForecastResult.data !== null) { // Allows empty array as success
        hourlyForecastData = hourlyForecastResult.data;
        successWithKey = true;
        lastOpenWeatherError = null; // Clear last error if successful
        break; // Success with this key, no need to try others
      } else {
        lastOpenWeatherError = `Forecast fetch failed: ${hourlyForecastResult.error} (Key ending with ${apiKey.slice(-4)})`;
        // Continue to next key if forecast fails
      }
    } else {
      lastOpenWeatherError = `Current weather fetch failed: ${currentWeatherResult.error} (Key ending with ${apiKey.slice(-4)})`;
      // If error is 401, 403, or 429, it's likely a key/quota issue, so try next key.
      // For other errors (like 404 city not found), it's not a key issue, so we should probably stop.
      if (currentWeatherResult.status === 404) {
        const cityNotFound = lastOpenWeatherError.toLowerCase().includes("not found") || lastOpenWeatherError.toLowerCase().includes("city name cannot be empty");
        return { data: null, error: lastOpenWeatherError, cityNotFound };
      }
      if (![401, 403, 429].includes(currentWeatherResult.status ?? 0)) {
        // Not a key-related error, break and report this error
        break;
      }
    }
  }

  if (!successWithKey || !currentWeatherData) {
    const finalError = lastOpenWeatherError || "Failed to fetch weather data with all available API keys.";
    console.error("All OpenWeatherMap API keys failed or a non-key-related error occurred.", finalError);
    const cityNotFound = finalError.toLowerCase().includes("not found") || finalError.toLowerCase().includes("city name cannot be empty");
    return { data: null, error: finalError, cityNotFound };
  }

  // At this point, currentWeatherData is guaranteed to be non-null.
  // hourlyForecastData could be an empty array if no forecast items were returned, which is valid.
  // hourlyForecastData could also be null if all forecast attempts failed but current weather succeeded (less likely with current loop structure).

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

  if (hasGeminiConfig) {
      try {
          aiSummaryOutput = await summarizeWeather(aiInput);
      } catch (aiErr) {
          console.error("Error generating AI weather summary:", aiErr);
          aiError = aiErr instanceof Error ? aiErr.message : "An unexpected error occurred with the AI summary service.";
          
          if (aiError.toLowerCase().includes("api key not valid") || aiError.includes("429") || aiError.toLowerCase().includes("quota") || aiError.toLowerCase().includes("resource has been exhausted")) {
              aiError = "The AI weather summary service is temporarily unavailable (API key or quota issue). Weather data is still available.";
          } else {
              aiError = "Could not generate AI weather summary at this time.";
          }
      }
  } else {
      aiError = "AI summary service is not configured (Gemini API key missing).";
  }
  
  return {
    data: { 
      ...currentWeatherData, 
      aiSummary: aiSummaryOutput?.summary || aiError || "AI summary not available.",
      weatherSentiment: aiSummaryOutput?.weatherSentiment || 'neutral',
      hourlyForecast: hourlyForecastData || [], // Ensure hourlyForecast is at least an empty array
    },
    error: null,
    cityNotFound: false
  };

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

