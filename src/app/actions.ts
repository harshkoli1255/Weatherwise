
'use server';

import { 
  type WeatherSummaryData, 
  type InterpretSearchQueryOutput,
  type AqiImageInput,
} from '@/lib/types';
import { summarizeWeather } from '@/ai/flows/weather-summary';
import { interpretSearchQuery } from '@/ai/flows/interpret-search-query';
import { generateWeatherImage } from '@/ai/flows/generate-weather-image';
import { generateAqiImage } from '@/ai/flows/generate-aqi-image';
import { fetchCurrentWeather, fetchHourlyForecast, fetchAirQuality, geocodeCity, reverseGeocode } from '@/services/weatherService';
import { cacheService } from '@/services/cacheService';
import { summarizeError } from '@/ai/flows/summarize-error';
import type { LocationIdentifier, IpApiLocationResponse, CitySuggestion, SavedLocationsWeatherMap, SavedLocationWeatherResult, ProactiveAlertResult } from '@/lib/types';
import { shouldSendWeatherAlert } from '@/ai/flows/alert-decision';

function isAiConfigured() {
  const geminiApiKey = (process.env.GEMINI_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k)[0];
  return !!geminiApiKey;
}

export async function fetchWeatherAndSummaryAction(
  params: { city?: string; lat?: number; lon?: number; forceRefresh?: boolean }
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
    
    let locationIdentifier: LocationIdentifier;
    let userFriendlyDisplayName: string | undefined = params.city;
    let geoResult: { data: any[] | null; error: string | null; status?: number };


    // --- Step 1: Resolve the query into precise coordinates ---
    if (typeof params.lat === 'number' && typeof params.lon === 'number') {
      locationIdentifier = { type: 'coords', lat: params.lat, lon: params.lon };
      // Use the provided city name if available, otherwise it will be resolved later.
      userFriendlyDisplayName = params.city; 
    } else if (params.city) {
      let queryForGeocoding = params.city;
      
      // --- Performance Optimization: Attempt direct geocoding first. ---
      geoResult = await geocodeCity(queryForGeocoding, openWeatherApiKeys);

      // --- Fallback to AI: If direct geocoding fails and AI is available, use AI to interpret the query. ---
      if ((!geoResult.data || geoResult.data.length === 0) && isAiConfigured()) {
        try {
          const interpretation = await interpretSearchQuery({ query: params.city });
          const interpretedQuery = interpretation.cityName || interpretation.searchQueryForApi;

          if (interpretedQuery) {
            queryForGeocoding = interpretedQuery;
            if (interpretation.isSpecificLocation && interpretation.locationName && interpretation.cityName) {
              userFriendlyDisplayName = `${interpretation.locationName}, ${interpretation.cityName}`;
            } else {
              userFriendlyDisplayName = interpretation.cityName || interpretation.searchQueryForApi || params.city;
            }
            geoResult = await geocodeCity(queryForGeocoding, openWeatherApiKeys);
          } else {
             // AI didn't return a usable query, so we stick with the failed geoResult
          }
        } catch (err) {
          console.error("AI search interpretation failed, proceeding with original geocode failure:", err);
        }
      }
      
      // --- Final Location Check: After attempting geocoding (and AI fallback), check if we have a valid location. ---
      if (geoResult.error || !geoResult.data || geoResult.data.length === 0) {
        const finalDisplayName = userFriendlyDisplayName || params.city;
        return { data: null, error: `Could not find a valid location for "${finalDisplayName}". Please check your search term.`, cityNotFound: true };
      }
      
      const geoData = geoResult.data[0];
      const resolvedCoords = { lat: geoData.lat, lon: geoData.lon };
      locationIdentifier = { type: 'coords', ...resolvedCoords };
      
      // If we didn't get a friendly name from the AI, use the one from the successful geocoding.
      // This ensures landmarks are named correctly.
      if (!userFriendlyDisplayName || userFriendlyDisplayName === params.city) {
          userFriendlyDisplayName = geoData.name;
      }
    } else {
      // If we are in this block, it means no valid search parameters were provided at all.
      // This prevents the app from trying to restore a session when it shouldn't.
      return { data: null, error: "City name or coordinates must be provided.", cityNotFound: false };
    }


    // --- Step 2: Check cache using the resolved coordinates ---
    const cacheKey = `weather-${locationIdentifier.lat.toFixed(4)}-${locationIdentifier.lon.toFixed(4)}`;
    
    if (params.forceRefresh) {
        cacheService.clear(cacheKey);
    } else {
        const cachedData = cacheService.get<WeatherSummaryData>(cacheKey);
        if (cachedData) {
            return { data: cachedData, error: null, cityNotFound: false };
        }
    }
    
    // --- Step 3: Fetch all data in parallel ---
    const [weatherResult, hourlyForecastResult, airQualityResult] = await Promise.all([
        fetchCurrentWeather(locationIdentifier, openWeatherApiKeys),
        fetchHourlyForecast(locationIdentifier, openWeatherApiKeys),
        fetchAirQuality(locationIdentifier.lat, locationIdentifier.lon, openWeatherApiKeys)
    ]);
    
    if (!weatherResult.data || !weatherResult.rawResponse) {
      return { data: null, error: weatherResult.error, cityNotFound: weatherResult.status === 404 };
    }
    
    const currentWeatherData = weatherResult.data;
    const finalDisplayName = userFriendlyDisplayName || currentWeatherData.city;

    // --- Step 4: Generate AI summaries and images ---
    let aiSummaryResult;

    if (isAiConfigured()) {
        try {
            aiSummaryResult = await summarizeWeather({
                city: finalDisplayName,
                temperature: currentWeatherData.temperature,
                feelsLike: currentWeatherData.feelsLike,
                humidity: currentWeatherData.humidity,
                windSpeed: currentWeatherData.windSpeed,
                condition: currentWeatherData.description,
                hourlyForecast: hourlyForecastResult.data ?? [],
            })
        } catch(err) {
            console.error("Error generating AI weather summary:", err);
            const userFacingError = `<strong>AI Summary Error</strong>: ${err instanceof Error ? err.message : "An unexpected error occurred."}`;
            aiSummaryResult = {
                summary: userFacingError,
                subjectLine: null,
                weatherSentiment: 'neutral',
                activitySuggestion: "Check conditions before planning activities.",
                aiInsights: []
            };
        }
    } else {
        aiSummaryResult = { summary: "AI summary not available.", subjectLine: null, weatherSentiment: 'neutral', activitySuggestion: "Check conditions before planning activities.", aiInsights: [] };
    }

    let aiImageUrl: string | undefined = undefined;
    if (isAiConfigured() && aiSummaryResult.activitySuggestion) {
      try {
        const imageResult = await generateWeatherImage({
          city: finalDisplayName,
          condition: currentWeatherData.description,
          activitySuggestion: aiSummaryResult.activitySuggestion,
        });
        aiImageUrl = imageResult.imageUrl;
      } catch (err) {
        console.error("Error generating AI weather image, continuing without it.", err);
      }
    }

    const fallbackSubject = `${currentWeatherData.temperature}°C & ${currentWeatherData.description} in ${finalDisplayName}`;
    
    const finalData: WeatherSummaryData = { 
        ...currentWeatherData,
        city: finalDisplayName,
        lat: locationIdentifier.lat,
        lon: locationIdentifier.lon,
        aiSummary: aiSummaryResult.summary,
        aiSubject: aiSummaryResult.subjectLine || fallbackSubject,
        weatherSentiment: aiSummaryResult.weatherSentiment,
        activitySuggestion: aiSummaryResult.activitySuggestion,
        aiInsights: aiSummaryResult.aiInsights,
        hourlyForecast: hourlyForecastResult.data ?? [], 
        aiImageUrl: aiImageUrl,
        airQuality: airQualityResult.data ?? undefined,
    };

    cacheService.set(cacheKey, finalData);
    
    return { data: finalData, error: null, cityNotFound: false };

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

export async function fetchCitySuggestionsAction(query: string): Promise<{ suggestions: CitySuggestion[] | null; error: string | null }> {
  try {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 1) {
      return { suggestions: [], error: null };
    }

    const cacheKey = `suggestions-${trimmedQuery.toLowerCase()}`;
    const cachedSuggestions = cacheService.get<CitySuggestion[]>(cacheKey);
    if (cachedSuggestions) {
        return { suggestions: cachedSuggestions, error: null };
    }

    const apiKeys = (process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (apiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys found for suggestions.");
      return { suggestions: null, error: "Server configuration error: No valid geocoding keys." };
    }

    let queryForApi = trimmedQuery;
    let interpretationResult: InterpretSearchQueryOutput | null = null;

    if (isAiConfigured()) {
      try {
        interpretationResult = await interpretSearchQuery({ query: trimmedQuery });
        if (interpretationResult.cityName) {
          queryForApi = interpretationResult.cityName;
        } else if (interpretationResult.searchQueryForApi) {
          queryForApi = interpretationResult.searchQueryForApi;
        }
      } catch (err) {
        console.error("AI interpretation failed, falling back to original query for suggestions.", err);
      }
    }

    const geoResult = await geocodeCity(queryForApi, apiKeys);
    if (geoResult.error || !geoResult.data) {
      console.error("Geocoding API error for suggestions:", { status: geoResult.status, error: geoResult.error });
      return { suggestions: null, error: `Geocoding service failed: ${geoResult.error}` };
    }

    let suggestionsWithoutWeather: CitySuggestion[] = [];
    const seenKeys = new Set<string>();

    if (interpretationResult?.isSpecificLocation && geoResult.data.length > 0) {
      const topHit = geoResult.data[0];
      const friendlyName = interpretationResult.locationName && interpretationResult.cityName
        ? `${interpretationResult.locationName}, ${interpretationResult.cityName}`
        : interpretationResult.cityName || topHit.name;
      
      suggestionsWithoutWeather.push({
        name: friendlyName,
        lat: topHit.lat,
        lon: topHit.lon,
        country: topHit.country,
        state: topHit.state,
        isLandmark: true,
      });

      const key = `${topHit.name}|${topHit.state || 'NO_STATE'}|${topHit.country}`;
      seenKeys.add(key);
    }
    
    geoResult.data.forEach((item: any) => {
      const key = `${item.name}|${item.state || 'NO_STATE'}|${item.country}`;
      if (item.name && item.country && !seenKeys.has(key)) {
        suggestionsWithoutWeather.push({
          name: item.name,
          lat: item.lat,
          lon: item.lon,
          country: item.country,
          state: item.state,
        });
        seenKeys.add(key);
      }
    });

    if (suggestionsWithoutWeather.length === 0) {
      return { suggestions: [], error: null };
    }

    // Fetch weather for each suggestion in parallel
    const weatherPromises = suggestionsWithoutWeather.map(city => 
      fetchCurrentWeather({ type: 'coords', lat: city.lat, lon: city.lon }, apiKeys)
    );
    const weatherResults = await Promise.allSettled(weatherPromises);
    
    const finalSuggestions = suggestionsWithoutWeather.map((city, index) => {
        const weatherResult = weatherResults[index];
        if (weatherResult.status === 'fulfilled' && weatherResult.value.data) {
            return {
                ...city,
                temperature: weatherResult.value.data.temperature,
                iconCode: weatherResult.value.data.iconCode,
            };
        }
        return city; // Return city without weather data if fetch failed
    });
    
    cacheService.set(cacheKey, finalSuggestions);
    return { suggestions: finalSuggestions, error: null };

  } catch (error) {
    console.error("An unexpected error occurred in fetchCitySuggestionsAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred.";
    return { suggestions: null, error: message };
  }
}


export async function getCityFromCoordsAction(
  lat: number, 
  lon: number
): Promise<{ city: string | null; error: string | null }> {
  try {
    const openWeatherApiKeys = (process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
    if (openWeatherApiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys for reverse geocoding.");
      return { city: null, error: "Server configuration error: No valid API keys." };
    }

    const result = await reverseGeocode(lat, lon, openWeatherApiKeys);

    if (result.error || !result.data || result.data.length === 0) {
      console.error("[Service Error] Reverse geocoding failed for coords.", { lat, lon, details: result.error });
      return { city: null, error: "Could not determine city name from your location." };
    }

    const resultCity = result.data[0].name;
    return { city: resultCity, error: null };
    
  } catch (error) {
    console.error("An unexpected error occurred in getCityFromCoordsAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred while getting city from coordinates.";
    return { city: null, error: message };
  }
}


export async function fetchWeatherForSavedLocationsAction(
  cities: CitySuggestion[]
): Promise<SavedLocationsWeatherMap> {
  const apiKeys = (process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS || '').split(',').map(k => k.trim()).filter(k => k);
  const results: SavedLocationsWeatherMap = {};

  if (apiKeys.length === 0) {
    console.error("[Server Config Error] OpenWeather API keys are not set for saved locations action.");
    for (const city of cities) {
      const key = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
      results[key] = { error: "Server not configured" };
    }
    return results;
  }

  const weatherPromises = cities.map(city => 
    fetchCurrentWeather({ type: 'coords', lat: city.lat, lon: city.lon }, apiKeys)
      .then(weatherResult => {
        const key = `${city.lat.toFixed(4)},${city.lon.toFixed(4)}`;
        const result: { key: string; value: SavedLocationWeatherResult } = {
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

export async function getAIErrorSummaryAction(errorMessage: string): Promise<string> {
  if (!isAiConfigured()) {
    // Return a generic message if AI isn't set up, to avoid breaking the UI flow.
    return 'An unexpected error occurred. Please try again later.';
  }
  try {
    const result = await summarizeError({ errorMessage });
    return result.userFriendlyMessage;
  } catch (err) {
    console.error("The AI error summarization action itself failed:", err);
    return 'An unexpected error occurred. Please try again later.';
  }
}

export async function generateAqiImageAction(input: AqiImageInput): Promise<string> {
  if (!isAiConfigured()) {
    return '';
  }
  try {
    const result = await generateAqiImage(input);
    return result.imageUrl;
  } catch (err) {
    console.error("Error generating AQI image:", err);
    return '';
  }
}

export async function proactiveWeatherCheckAction(
  lat: number,
  lon: number
): Promise<ProactiveAlertResult | null> {
  try {
    const weatherResult = await fetchWeatherAndSummaryAction({ lat, lon });
    if (weatherResult.error || !weatherResult.data) {
      console.warn(`[Proactive Check] Could not fetch weather for ${lat},${lon}.`, weatherResult.error);
      return null;
    }

    const weatherData = weatherResult.data;

    const decisionResult = await shouldSendWeatherAlert({
      city: weatherData.city,
      temperature: weatherData.temperature,
      feelsLike: weatherData.feelsLike,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      condition: weatherData.condition,
      description: weatherData.description,
      hourlyForecast: weatherData.hourlyForecast,
    });

    if (decisionResult.shouldSendAlert) {
      return {
        showAlert: true,
        reason: decisionResult.reason,
        city: weatherData.city,
        iconCode: weatherData.iconCode,
      };
    }

    return null; // No alert needed
  } catch (error) {
    console.error(`[Proactive Check] Error during proactive check for ${lat},${lon}:`, error);
    return null;
  }
}
