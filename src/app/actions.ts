
'use server';

import type { WeatherData, OpenWeatherCurrentAPIResponse, OpenWeatherForecastAPIResponse, WeatherSummaryData, HourlyForecastData, IpApiLocationResponse, CitySuggestion } from '@/lib/types';
import { summarizeWeather, type WeatherSummaryInput, type WeatherSummaryOutput } from '@/ai/flows/weather-summary';
import { correctCitySearchQuery, type CorrectCitySearchQueryInput } from '@/ai/flows/correct-search-query-flow';
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

async function fetchCurrentWeather(location: LocationIdentifier, apiKey: string): Promise<{data: WeatherData | null, error: string | null, status?: number, rawResponse?: OpenWeatherCurrentAPIResponse}> {
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
  const responseStatus = response.status;

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${responseStatus}` }));
    let errorMessage = errorData.message || `Failed to fetch current weather data (status: ${responseStatus})`;
    if (responseStatus === 404) {
      errorMessage = location.type === 'city' ? `City "${location.city}" not found.` : "Weather data not found for the provided coordinates.";
    }
    console.error("OpenWeather Current API error:", { status: responseStatus, message: errorMessage, url });
    return { data: null, error: errorMessage, status: responseStatus };
  }

  const data: OpenWeatherCurrentAPIResponse = await response.json();

  if (!data.weather || data.weather.length === 0) {
    return { data: null, error: "Current weather condition data not available.", status: 200, rawResponse: data }; 
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
    status: 200,
    rawResponse: data
  };
}

async function fetchHourlyForecast(location: LocationIdentifier, apiKey: string): Promise<{data: HourlyForecastData[] | null, error: string | null, status?: number}> {
   let url = '';
  if (location.type === 'city') {
    const cityValidation = CityNameSchema.safeParse(location.city);
    if (!cityValidation.success) {
        return { data: null, error: cityValidation.error.errors[0].message, status: 400 };
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location.city)}&appid=${apiKey}&units=metric&cnt=8`; // cnt=8 for 24hr forecast (3hr intervals)
  } else { // type === 'coords'
    const coordsValidation = CoordinatesSchema.safeParse({ lat: location.lat, lon: location.lon });
    if (!coordsValidation.success) {
        return { data: null, error: "Invalid coordinates provided for forecast.", status: 400 };
    }
    url = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&units=metric&cnt=8`;
  }
  
  const response = await fetch(url);
  const responseStatus = response.status;

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP error ${responseStatus}` }));
    const errorMessage = typeof errorData.message === 'string' ? errorData.message : `Failed to fetch forecast data (status: ${responseStatus})`;
    console.error("OpenWeather Forecast API error:", { status: responseStatus, message: errorMessage, url });
    return { data: null, error: errorMessage, status: responseStatus };
  }

  const data: OpenWeatherForecastAPIResponse = await response.json();

  if (!data.list || data.list.length === 0) {
    return { data: [], error: null, status: 200 }; 
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
    return { data: null, error: "Server configuration error: OpenWeather API keys missing. Please contact support.", cityNotFound: false };
  }
  const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  if (openWeatherApiKeys.length === 0) {
    console.error("No valid OpenWeather API keys found in NEXT_PUBLIC_OPENWEATHER_API_KEYS.");
    return { data: null, error: "Server configuration error: No valid OpenWeather API keys. Please contact support.", cityNotFound: false };
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
  let currentKeyIndex = 0;

  for (const apiKey of openWeatherApiKeys) {
    currentKeyIndex++;
    console.log(`Attempting OpenWeatherMap API with key ${currentKeyIndex} of ${openWeatherApiKeys.length}.`);
    
    const currentWeatherResult = await fetchCurrentWeather(locationIdentifier, apiKey);

    if (currentWeatherResult.data && currentWeatherResult.rawResponse) {
      currentWeatherData = currentWeatherResult.data;
      // Use coordinates from successful current weather fetch for forecast to ensure consistency
      const coord = currentWeatherResult.rawResponse.coord;
      const forecastLocationIdentifier: LocationIdentifier = { 
        type: 'coords', 
        lat: coord.lat,
        lon: coord.lon
      };
      
      const hourlyForecastResult = await fetchHourlyForecast(forecastLocationIdentifier, apiKey);

      if (hourlyForecastResult.data !== null) { // Allows empty array as success
        hourlyForecastData = hourlyForecastResult.data;
        successWithKey = true;
        lastOpenWeatherError = null; 
        break; 
      } else {
        lastOpenWeatherError = `Forecast fetch failed: ${hourlyForecastResult.error} (Key ${currentKeyIndex})`;
        if (![401, 403, 429].includes(hourlyForecastResult.status ?? 0)) {
           break; 
        }
      }
    } else {
      lastOpenWeatherError = `Current weather fetch failed: ${currentWeatherResult.error} (Key ${currentKeyIndex})`;
      if (currentWeatherResult.status === 404) {
        const cityNotFound = lastOpenWeatherError.toLowerCase().includes("not found") || lastOpenWeatherError.toLowerCase().includes("city name cannot be empty");
        return { data: null, error: lastOpenWeatherError, cityNotFound };
      }
      if (![401, 403, 429].includes(currentWeatherResult.status ?? 0)) {
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

  const aiInput: WeatherSummaryInput = {
    city: currentWeatherData.city,
    temperature: currentWeatherData.temperature,
    feelsLike: currentWeatherData.feelsLike,
    humidity: currentWeatherData.humidity,
    windSpeed: currentWeatherData.windSpeed,
    condition: currentWeatherData.description, // Use detailed description for better AI context
  };

  let aiSummaryOutput: WeatherSummaryOutput | null = null;
  let aiError: string | null = null;

  if (hasGeminiConfig) {
      try {
          console.log("Attempting to generate AI weather summary for:", aiInput.city);
          aiSummaryOutput = await summarizeWeather(aiInput);
          console.log("AI summary successfully generated.");
      } catch (err) { 
          const strongError = err as Error & { status?: number; code?: number; details?: string; cause?: any };
          console.error("Error generating AI weather summary. Raw Error:", strongError);
          console.error("Error Name:", strongError.name);
          console.error("Error Message:", strongError.message);
          console.error("Error Cause:", strongError.cause);

          aiError = strongError.message || "An unexpected error occurred with the AI summary service.";
          
          const lowerAiError = aiError.toLowerCase();
          if (lowerAiError.includes("api key not valid") || 
              lowerAiError.includes("api_key_not_valid") ||
              lowerAiError.includes("permission denied") ||
              lowerAiError.includes("billing") ||
              lowerAiError.includes("quota") ||
              lowerAiError.includes("resource has been exhausted") ||
              lowerAiError.includes("429") || 
              (strongError.status && [401, 403, 429].includes(strongError.status)) || 
              (strongError.code && [7, 8, 14].includes(strongError.code)) 
            ) {
              aiError = "The AI weather summary service is temporarily unavailable due to API key, quota, or billing issues. Please check your GEMINI_API_KEYS in the .env file and ensure the first key is valid and has quota. Weather data is still available. Review server logs for more details.";
          } else {
              aiError = "Could not generate AI weather summary at this time. This might be due to a model issue or a problem with the AI service configuration. Please review server logs for specific error messages.";
          }
          console.log("Assigned AI Error message:", aiError);
      }
  } else {
      aiError = "AI summary service is not configured (Gemini API key missing).";
      console.log(aiError);
  }
  
  return {
    data: { 
      ...currentWeatherData, 
      aiSummary: aiSummaryOutput?.summary || aiError || "AI summary not available.",
      weatherSentiment: aiSummaryOutput?.weatherSentiment || 'neutral',
      hourlyForecast: hourlyForecastData || [], 
    },
    error: null, 
    cityNotFound: false
  };
}

export async function fetchCityByIpAction(): Promise<{ city: string | null; country: string | null; lat: number | null; lon: number | null; error: string |null }> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`ipapi.co service failed with status: ${response.status}`, errorText);
        throw new Error(`IP Geolocation service failed (ipapi.co). Status: ${response.status}.`);
    }
    const data = await response.json();

    if (data.error) {
        console.error("ipapi.co API error:", data.reason);
        throw new Error(data.reason || "Failed to determine location from IP address via ipapi.co.");
    }
    
    return { city: data.city, country: data.country_name, lat: data.latitude, lon: data.longitude, error: null };

  } catch (error) {
    console.error("Error fetching city by IP (ipapi.co):", error);
    try {
        console.log("Falling back to ip-api.com for IP geolocation.");
        const fallbackResponse = await fetch('http://ip-api.com/json/?fields=status,message,country,city,lat,lon');
        if (!fallbackResponse.ok) {
            throw new Error(`IP Geolocation service (ip-api.com) failed with status: ${fallbackResponse.status}`);
        }
        const fallbackData: IpApiLocationResponse = await fallbackResponse.json();
        if (fallbackData.status === 'fail') {
            console.error("ip-api.com API error:", fallbackData.message);
            throw new Error(fallbackData.message || "Failed to determine location from IP via ip-api.com.");
        }
        return { city: fallbackData.city, country: fallbackData.country, lat: fallbackData.lat, lon: fallbackData.lon, error: null };
    } catch (fallbackError) {
        console.error("Error fetching city by IP (ip-api.com fallback):", fallbackError);
        const errorMessage = fallbackError instanceof Error ? fallbackError.message : "Could not determine location via IP from any service.";
        return { city: null, country: null, lat: null, lon: null, error: errorMessage };
    }
  }
}

export async function fetchCitySuggestionsAction(query: string): Promise<{ suggestions: CitySuggestion[] | null; error: string | null }> {
  if (!query || query.trim().length === 0) { 
    return { suggestions: [], error: null };
  }

  let processedQuery = query.trim();

  const geminiApiKeysString = process.env.GEMINI_API_KEYS;
  const hasGeminiConfig = geminiApiKeysString && geminiApiKeysString.split(',').map(key => key.trim()).filter(key => key).length > 0;

  if (hasGeminiConfig) {
    try {
      const correctionInput: CorrectCitySearchQueryInput = { query: processedQuery };
      console.log("Attempting to correct search query:", processedQuery);
      const correctionResult = await correctCitySearchQuery(correctionInput);
      if (correctionResult.wasCorrected && correctionResult.correctedQuery) {
        console.log(`Query corrected: "${processedQuery}" -> "${correctionResult.correctedQuery}"`);
        processedQuery = correctionResult.correctedQuery;
      } else {
        console.log("Query not corrected or AI correction failed, using original:", processedQuery);
      }
    } catch (correctionError) {
      console.error("Error during AI query correction:", correctionError);
    }
  } else {
    console.log("AI query correction skipped: Gemini API key not configured.");
  }


  const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
  if (!openWeatherApiKeysString) {
    return { suggestions: null, error: "Server configuration error: OpenWeather API keys missing for suggestions." };
  }
  const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
  if (openWeatherApiKeys.length === 0) {
    return { suggestions: null, error: "Server configuration error: No valid OpenWeather API keys for suggestions." };
  }

  let lastError: string | null = null;
  let currentKeyIndex = 0;

  for (const apiKey of openWeatherApiKeys) {
    currentKeyIndex++;
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(processedQuery)}&limit=8&appid=${apiKey}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
        lastError = errorData.message || `Failed to fetch city suggestions (status: ${response.status}, Key ${currentKeyIndex})`;
        if (![401, 403, 429].includes(response.status)) { 
          console.error("OpenWeather Geocoding API error:", { status: response.status, message: lastError, url });
          return { suggestions: null, error: lastError };
        }
        console.warn(`OpenWeather Geocoding API key ${currentKeyIndex} failed or rate limited. Trying next key.`);
        continue;
      }
      const data: any[] = await response.json();
      
      const uniqueSuggestions: CitySuggestion[] = [];
      const seenKeys = new Set<string>();

      for (const item of data) {
        // Create a key that identifies a unique place, allowing for minor lat/lon differences.
        // Grouping by name, country, state (if present), and lat/lon rounded to 2 decimal places (approx accuracy of 1km).
        const key = `${item.name}|${item.country}|${item.state || 'NO_STATE'}|${(item.lat || 0).toFixed(2)}|${(item.lon || 0).toFixed(2)}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueSuggestions.push({
            name: item.name,
            lat: item.lat,
            lon: item.lon,
            country: item.country,
            state: item.state,
          });
        }
      }
      return { suggestions: uniqueSuggestions, error: null };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error fetching city suggestions";
      console.error("Error fetching city suggestions:", e);
    }
  }
  return { suggestions: null, error: lastError || "Failed to fetch city suggestions with all available API keys." };
}
    

    