
'use server';

import { 
  type WeatherSummaryData, 
  type HourlyForecastData, 
  type IpApiLocationResponse, 
  type CitySuggestion, 
  type LocationIdentifier, 
  type OpenWeatherCurrentAPIResponse,
  type WeatherSummaryInput,
  type WeatherSummaryOutput,
  type WeatherData,
  type FavoritesWeatherMap,
  type FavoriteCityWeatherResult,
  type InterpretSearchQueryOutput,
} from '@/lib/types';
import { summarizeWeather } from '@/ai/flows/weather-summary';
import { interpretSearchQuery } from '@/ai/flows/interpret-search-query';
import { fetchCurrentWeather, fetchHourlyForecast } from '@/services/weatherService';
import { cacheService } from '@/services/cacheService';

function isAiConfigured() {
  const geminiApiKey = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k)[0];
  return !!geminiApiKey;
}

export async function fetchWeatherAndSummaryAction(
  params: { city?: string; lat?: number; lon?: number }
): Promise<{ data: WeatherSummaryData | null; error: string | null; cityNotFound: boolean }> {
  try {
    const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
    if (!openWeatherApiKeysString) {
      console.error("[Server Config Error] OpenWeather API keys are not set (NEXT_PUBLIC_OPENWEATHER_API_KEYS).");
      return { data: null, error: "Server configuration error: Weather service keys missing. Please contact support.", cityNotFound: false };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys found in NEXT_PUBLIC_OPENWEATHER_API_KEYS.");
      return { data: null, error: "Server configuration error: No valid weather service keys. Please contact support.", cityNotFound: false };
    }
    const apiKey = openWeatherApiKeys[0];

    let locationIdentifier: LocationIdentifier;
    let userFriendlyDisplayName: string | undefined = params.city;

    // --- Step 1: Resolve the query into precise coordinates ---
    if (typeof params.lat === 'number' && typeof params.lon === 'number') {
      // User provided coordinates directly (e.g., from "use my location" or a suggestion click)
      locationIdentifier = { type: 'coords', lat: params.lat, lon: params.lon };
      // If a friendly name was also provided (from a suggestion click), use it.
      // Otherwise, we'll fetch the name from the weather data later.
      userFriendlyDisplayName = params.city; 
      console.log(`[Perf] Using precise coordinates: ${params.lat}, ${params.lon}`);
    } else if (params.city) {
      // User provided a text query. We need to interpret and geocode it.
      let queryForGeocoding = params.city;

      if (isAiConfigured()) {
        try {
          console.log(`[AI] Interpreting search query for geocoding: "${params.city}"`);
          const interpretation = await interpretSearchQuery({ query: params.city });
          queryForGeocoding = interpretation.searchQueryForApi;
          userFriendlyDisplayName = interpretation.locationName ? `${interpretation.locationName}, ${interpretation.cityName}` : interpretation.cityName || params.city;
          console.log(`[AI] Geocoding interpreted query: "${queryForGeocoding}", Display name: "${userFriendlyDisplayName}"`);
        } catch (err) {
          console.error("AI search interpretation failed, falling back to original query:", err);
        }
      }

      // Geocode the text query to get coordinates
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(queryForGeocoding)}&limit=1&appid=${apiKey}`;
      const geoResponse = await fetch(geoUrl);
      if (!geoResponse.ok) {
        console.error("Geocoding API error:", { status: geoResponse.status });
        return { data: null, error: 'Geocoding service failed.', cityNotFound: true };
      }
      const geoData = await geoResponse.json();
      if (!geoData || geoData.length === 0) {
        return { data: null, error: `Could not find a valid location for "${userFriendlyDisplayName}". Please check your search term.`, cityNotFound: true };
      }
      
      const resolvedCoords = { lat: geoData[0].lat, lon: geoData[0].lon };
      console.log(`[Geocoding] Successfully resolved "${queryForGeocoding}" to lat: ${resolvedCoords.lat}, lon: ${resolvedCoords.lon}`);
      locationIdentifier = { type: 'coords', ...resolvedCoords };
      
    } else {
      return { data: null, error: "City name or coordinates must be provided.", cityNotFound: false };
    }

    // --- Step 2: Check cache using the resolved coordinates ---
    const cacheKey = `weather-${locationIdentifier.lat.toFixed(4)}-${locationIdentifier.lon.toFixed(4)}`;
    const cachedData = cacheService.get<WeatherSummaryData>(cacheKey);
    if (cachedData) {
      return { data: cachedData, error: null, cityNotFound: false };
    }
    console.log(`[Cache] No valid cache entry found for key "${cacheKey}". Fetching fresh data.`);

    // --- Step 3: Fetch all data using coordinates ---
    const weatherResult = await fetchCurrentWeather(locationIdentifier, apiKey);
    
    if (!weatherResult.data || !weatherResult.rawResponse) {
      return { data: null, error: weatherResult.error, cityNotFound: weatherResult.status === 404 };
    }

    const currentWeatherData = weatherResult.data;
    // The final display name is the user-friendly one from AI/suggestion click if available. Otherwise, it's the name from the weather API.
    const finalDisplayName = userFriendlyDisplayName || currentWeatherData.city;

    const aiInput: WeatherSummaryInput = {
      city: finalDisplayName,
      temperature: currentWeatherData.temperature,
      feelsLike: currentWeatherData.feelsLike,
      humidity: currentWeatherData.humidity,
      windSpeed: currentWeatherData.windSpeed,
      condition: currentWeatherData.description,
    };
    
    const [hourlyForecastResult, aiResult] = await Promise.all([
      fetchHourlyForecast(locationIdentifier, apiKey),
      isAiConfigured()
        ? summarizeWeather(aiInput).then(res => ({ ...res, error: null })).catch(err => {
            console.error("Error generating AI weather summary:", err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            const userFacingError = `<strong>AI Summary Error</strong>: ${errorMessage}`;
            return { summary: null, subjectLine: null, weatherSentiment: null, activitySuggestion: null, error: userFacingError };
          })
        : Promise.resolve({ summary: null, subjectLine: null, weatherSentiment: null, activitySuggestion: null, error: "AI summary service is not configured." })
    ]);

    const fallbackSubject = `${currentWeatherData.temperature}°C & ${currentWeatherData.description} in ${finalDisplayName}`;
    
    const finalData: WeatherSummaryData = { 
        ...currentWeatherData,
        city: finalDisplayName,
        lat: locationIdentifier.lat,
        lon: locationIdentifier.lon,
        aiSummary: aiResult.summary || aiResult.error || "AI summary not available.",
        aiSubject: aiResult.subjectLine || fallbackSubject,
        weatherSentiment: aiResult.weatherSentiment || 'neutral',
        activitySuggestion: aiResult.activitySuggestion || "Check conditions before planning activities.",
        hourlyForecast: hourlyForecastResult.data ?? [], 
    };

    cacheService.set(cacheKey, finalData);
    
    return {
      data: finalData,
      error: null, 
      cityNotFound: false
    };

  } catch (error) {
    console.error("An unexpected error occurred in fetchWeatherAndSummaryAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { data: null, error: message, cityNotFound: false };
  }
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
        const fallbackResponse = await fetch('https://ip-api.com/json/?fields=status,message,country,city,lat,lon');
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

export async function fetchCitySuggestionsAction(query: string): Promise<{ suggestions: CitySuggestion[] | null; processedQuery: string; error: string | null }> {
  try {
    if (!query || query.trim().length < 2) {
      return { suggestions: [], processedQuery: query, error: null };
    }

    const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
    if (!openWeatherApiKeysString) {
      console.error("[Server Config Error] OpenWeather API keys missing for suggestions.");
      return { suggestions: null, processedQuery: query, error: "Server configuration error: Geocoding keys missing." };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys found for suggestions.");
      return { suggestions: null, processedQuery: query, error: "Server configuration error: No valid geocoding keys." };
    }
    const apiKey = openWeatherApiKeys[0];

    let interpretationResult: InterpretSearchQueryOutput | null = null;
    let queryForApi = query.trim();

    // Step 1: Interpret the user's query with AI
    if (isAiConfigured()) {
        try {
            console.log(`[AI] Interpreting search query for suggestions: "${queryForApi}"`);
            interpretationResult = await interpretSearchQuery({ query: queryForApi });
            if (interpretationResult.searchQueryForApi) {
                queryForApi = interpretationResult.searchQueryForApi;
                console.log(`[AI] Interpreted "${query.trim()}" as "${queryForApi}" for geocoding.`);
            }
        } catch (err) {
            console.error("AI search interpretation failed during suggestion fetch:", err instanceof Error ? err.message : "An unknown AI error occurred.");
        }
    }
    
    // Step 2: Geocode the (potentially AI-enhanced) query to get a list of possible locations
    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(queryForApi)}&limit=5&appid=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
        console.error("Geocoding API error during suggestion fetch:", { status: response.status });
        return { suggestions: null, processedQuery: query, error: 'Geocoding service failed.' };
    }

    const geoData: any[] = await response.json();
    const finalSuggestions: CitySuggestion[] = [];
    const seenKeys = new Set<string>();

    // Step 3: If the AI identified a specific location, manually create a suggestion for it.
    // This ensures the AI's smart result is always shown, even if the geocoding API doesn't perfectly match it.
    if (interpretationResult && interpretationResult.isSpecificLocation && geoData.length > 0) {
        const firstResult = geoData[0];
        const displayName = interpretationResult.locationName 
            ? `${interpretationResult.locationName}, ${interpretationResult.cityName}` 
            : interpretationResult.cityName || firstResult.name;

        const key = `${displayName}|${firstResult.state || 'NO_STATE'}|${firstResult.country}`;
        if (!seenKeys.has(key)) {
            finalSuggestions.push({
                name: displayName,
                lat: firstResult.lat,
                lon: firstResult.lon,
                country: firstResult.country,
                state: firstResult.state,
            });
            seenKeys.add(key);
        }
    }

    // Step 4: Process the rest of the standard geocoding results, adding them if they are unique.
    for (const item of geoData) {
        const displayName = item.name;
        const key = `${displayName}|${item.state || 'NO_STATE'}|${item.country}`;

        if (displayName && item.country && !seenKeys.has(key)) {
            finalSuggestions.push({
                name: displayName,
                lat: item.lat,
                lon: item.lon,
                country: item.country,
                state: item.state,
            });
            seenKeys.add(key);
        }
    }

    return { suggestions: finalSuggestions, processedQuery: query, error: null };

  } catch (error) {
    console.error("An unexpected error occurred in fetchCitySuggestionsAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred while fetching suggestions.";
    return { suggestions: null, processedQuery: query, error: message };
  }
}


export async function getCityFromCoordsAction(
  lat: number, 
  lon: number
): Promise<{ city: string | null; error: string | null }> {
  try {
    const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
    if (!openWeatherApiKeysString) {
      console.error("[Server Config Error] OpenWeather API keys missing for reverse geocoding.");
      return { city: null, error: "Server configuration error: API keys missing." };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys for reverse geocoding.");
      return { city: null, error: "Server configuration error: No valid API keys." };
    }

    let resultCity: string | null = null;
    let lastTechnicalError: string | null = null;

    for (const apiKey of openWeatherApiKeys) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data: OpenWeatherCurrentAPIResponse = await response.json();
          if (data.name) {
            resultCity = data.name;
            lastTechnicalError = null;
            break; // Success
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
          lastTechnicalError = errorData.message || `Failed to fetch city name (status: ${response.status})`;
          if (![401, 403, 429].includes(response.status)) {
              break; 
          }
        }
      } catch(e) {
          if (e instanceof Error) {
            lastTechnicalError = e.message;
          }
      }
    }

    if (lastTechnicalError) {
      console.error("[Service Error] Reverse geocoding failed for coords.", { lat, lon, details: lastTechnicalError });
    }
    
    const userFacingError = resultCity ? null : "Could not determine city name from your location. The service may be temporarily unavailable.";
    return { city: resultCity, error: userFacingError };

  } catch (error) {
    console.error("An unexpected error occurred in getCityFromCoordsAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred while getting city from coordinates.";
    return { city: null, error: message };
  }
}


export async function fetchWeatherForFavoritesAction(
  cities: CitySuggestion[]
): Promise<FavoritesWeatherMap> {
  const apiKey = (process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k)[0];
  const results: FavoritesWeatherMap = {};

  if (!apiKey) {
    console.error("[Server Config Error] OpenWeather API keys are not set for favorites action.");
    for (const city of cities) {
      const key = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
      results[key] = { error: "Server not configured" };
    }
    return results;
  }

  const weatherPromises = cities.map(city => 
    fetchCurrentWeather({ type: 'coords', lat: city.lat, lon: city.lon }, apiKey)
      .then(weatherResult => {
        const key = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
        const result: { key: string; value: FavoriteCityWeatherResult } = {
          key,
          value: weatherResult.data ? weatherResult.data : { error: weatherResult.error || 'Failed to load' }
        };
        return result;
      })
  );

  const settledPromises = await Promise.allSettled(weatherPromises);
  
  settledPromises.forEach(result => {
    if (result.status === 'fulfilled') {
      results[result.value.key] = result.value.value;
    } else {
      // This case is less likely because fetchCurrentWeather catches its own errors,
      // but it's good practice to handle promise rejections.
      console.error("A weather promise was unexpectedly rejected:", result.reason);
    }
  });

  return results;
}
