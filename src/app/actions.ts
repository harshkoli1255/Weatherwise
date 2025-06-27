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
    const apiKey = openWeatherApiKeys[0]; // Use the first available key for this optimized flow

    let locationIdentifier: LocationIdentifier;
    let userFriendlyCityName: string | undefined = params.city;

    // --- Step 1: Resolve location ---
    if (typeof params.lat === 'number' && typeof params.lon === 'number') {
      locationIdentifier = { type: 'coords', lat: params.lat, lon: params.lon };
      console.log(`[Perf] Using precise coordinates: ${params.lat}, ${params.lon}`);
    } else if (params.city) {
      let queryForApi = params.city;
      if (isAiConfigured()) {
        try {
          console.log(`[AI] Interpreting search query for main fetch: "${params.city}"`);
          const interpretation = await interpretSearchQuery({ query: params.city });
          
          // Use the AI's full query for the API call for maximum precision.
          queryForApi = interpretation.searchQueryForApi;
          
          // Use the more descriptive name for display purposes.
          userFriendlyCityName = interpretation.locationName || interpretation.cityName || params.city;
          
          console.log(`[AI] Main fetch interpreted. API query: "${queryForApi}", Display name: "${userFriendlyCityName}"`);

        } catch (err) {
          console.error("AI search interpretation failed during main fetch, falling back to original query:", err);
        }
      }
      locationIdentifier = { type: 'city', city: queryForApi };
    } else {
      return { data: null, error: "City name or coordinates must be provided.", cityNotFound: false };
    }

    // --- Step 2: Check cache using the most reliable identifier ---
    const cacheKey = locationIdentifier.type === 'coords'
      ? `weather-${locationIdentifier.lat.toFixed(4)}-${locationIdentifier.lon.toFixed(4)}`
      : `weather-city-${locationIdentifier.city.toLowerCase().replace(/\s/g, '_')}`;
    
    const cachedData = cacheService.get<WeatherSummaryData>(cacheKey);
    if (cachedData) {
      return { data: cachedData, error: null, cityNotFound: false };
    }
    console.log(`[Cache] No valid cache entry found for key "${cacheKey}". Fetching fresh data.`);

    // --- Step 3: Fetch all data ---
    const weatherResult = await fetchCurrentWeather(locationIdentifier, apiKey);
    
    if (!weatherResult.data || !weatherResult.rawResponse) {
      const isNotFound = weatherResult.status === 404;
      const originalQuery = locationIdentifier.type === 'city' ? locationIdentifier.city : `${locationIdentifier.lat}, ${locationIdentifier.lon}`;
      const errorMessage = isNotFound 
        ? `Could not find a valid location for "${userFriendlyCityName || originalQuery}". Please try a different search.`
        : weatherResult.error;
      return { data: null, error: errorMessage, cityNotFound: isNotFound };
    }

    const currentWeatherData = weatherResult.data;
    const resolvedLat = weatherResult.rawResponse.coord.lat;
    const resolvedLon = weatherResult.rawResponse.coord.lon;

    const finalCityName = userFriendlyCityName || currentWeatherData.city;

    const aiInput: WeatherSummaryInput = {
      city: finalCityName, // Use the preserved name
      temperature: currentWeatherData.temperature,
      feelsLike: currentWeatherData.feelsLike,
      humidity: currentWeatherData.humidity,
      windSpeed: currentWeatherData.windSpeed,
      condition: currentWeatherData.description,
    };
    
    // Fetch forecast and AI summary in parallel
    const [hourlyForecastResult, aiResult] = await Promise.all([
      fetchHourlyForecast({ type: 'coords', lat: resolvedLat, lon: resolvedLon }, apiKey),
      isAiConfigured()
        ? summarizeWeather(aiInput).then(res => ({ ...res, error: null })).catch(err => {
            console.error("Error generating AI weather summary:", err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred with the AI summary service.";
            const userFacingError = errorMessage.toLowerCase().includes('quota')
              ? "<strong>AI Summary Unavailable</strong>: The free tier quota for AI services has been reached."
              : errorMessage.toLowerCase().includes('invalid')
              ? "<strong>AI Summary Error</strong>: The AI service API keys appear to be invalid. Please check configuration."
              : `<strong>AI Summary Error</strong>: ${errorMessage}`;
            return { summary: null, subjectLine: null, weatherSentiment: null, activitySuggestion: null, error: userFacingError };
          })
        : Promise.resolve({ summary: null, subjectLine: null, weatherSentiment: null, activitySuggestion: null, error: "AI summary service is not configured (Gemini API key missing)." })
    ]);

    const hourlyForecastData = hourlyForecastResult.data ?? [];
    
    const fallbackSubject = `${currentWeatherData.temperature}°C & ${currentWeatherData.description} in ${finalCityName}`;
    
    const finalData: WeatherSummaryData = { 
        ...currentWeatherData,
        city: finalCityName, // CRITICAL: Override the city name here.
        lat: resolvedLat,
        lon: resolvedLon,
        aiSummary: aiResult.summary || aiResult.error || "AI summary not available.",
        aiSubject: aiResult.subjectLine || fallbackSubject,
        weatherSentiment: aiResult.weatherSentiment || 'neutral',
        activitySuggestion: aiResult.activitySuggestion || "Check conditions before planning activities.",
        hourlyForecast: hourlyForecastData, 
    };

    // --- Step 4: Store the fresh data in the cache before returning ---
    // Use the *new* cache key based on the coordinates returned by the API for consistency
    const finalCoordsCacheKey = `weather-${resolvedLat.toFixed(4)}-${resolvedLon.toFixed(4)}`;
    cacheService.set(finalCoordsCacheKey, finalData);
    
    // Also cache by the original city name key if that was the query type
    if (locationIdentifier.type === 'city') {
        cacheService.set(cacheKey, finalData);
    }
    
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

    let processedQuery = query.trim();

    if (isAiConfigured()) {
        try {
            console.log(`[AI] Interpreting search query: "${processedQuery}"`);
            const interpretationResult = await interpretSearchQuery({ query: processedQuery });
            
            // Use the AI's fully processed query for the suggestions API for best results.
            const newQuery = interpretationResult.searchQueryForApi;
            
            if (newQuery && newQuery.toLowerCase() !== processedQuery.toLowerCase()) {
                console.log(`[AI] Interpreted "${processedQuery}" as "${newQuery}" for suggestions API.`);
                processedQuery = newQuery;
            } else {
                console.log(`[AI] No significant interpretation change for "${processedQuery}". Using original.`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "An unknown AI error occurred.";
            console.error("AI search interpretation failed:", message);
            // Don't block search if AI fails, just use original query and log the error.
        }
    }


    const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
    if (!openWeatherApiKeysString) {
      console.error("[Server Config Error] OpenWeather API keys missing for suggestions.");
      return { suggestions: null, processedQuery, error: "Server configuration error: Geocoding keys missing." };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys found for suggestions.");
      return { suggestions: null, processedQuery, error: "Server configuration error: No valid geocoding keys." };
    }
    
    let lastTechnicalError: string | null = null;
    let currentKeyIndex = 0;

    for (const apiKey of openWeatherApiKeys) {
        currentKeyIndex++;
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(processedQuery)}&limit=8&appid=${apiKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
                lastTechnicalError = errorData.message || `Failed to fetch city suggestions (status: ${response.status}, Key ${currentKeyIndex})`;
                if ([401, 403, 429].includes(response.status)) { 
                    console.warn(`OpenWeather Geocoding API key ${currentKeyIndex} failed or rate limited. Trying next key.`);
                    continue; 
                }
                console.error("OpenWeather Geocoding API error:", { status: response.status, message: lastTechnicalError, url });
                return { suggestions: null, processedQuery, error: "Geocoding service returned an error." };
            }

            const data: any[] = await response.json();
            
            const uniqueSuggestions: CitySuggestion[] = [];
            const seenKeys = new Set<string>();

            for (const item of data) {
                const key = `${item.name}|${item.state || 'NO_STATE'}|${item.country}`;
                if (item.name && item.country && !seenKeys.has(key)) {
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
            return { suggestions: uniqueSuggestions, processedQuery, error: null };
        } catch (e) {
            lastTechnicalError = e instanceof Error ? e.message : "Unknown error fetching city suggestions";
            console.error("Error fetching city suggestions:", e);
            return { suggestions: null, processedQuery, error: "Network error while fetching suggestions." };
        }
    }
    
    const serverError = lastTechnicalError || "Failed to fetch city suggestions with all available API keys.";
    console.error("[Service Error] All geocoding API keys failed.", { details: serverError });
    const userFacingError = "Could not retrieve city suggestions due to a server-side issue.";
    return { suggestions: null, processedQuery, error: userFacingError };

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
