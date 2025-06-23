
'use server';

import { 
  type WeatherSummaryData, 
  type HourlyForecastData, 
  type IpApiLocationResponse, 
  type CitySuggestion, 
  type LocationIdentifier, 
  type OpenWeatherCurrentAPIResponse,
  type WeatherSummaryInput,
  type WeatherSummaryOutput
} from '@/lib/types';
import { summarizeWeather } from '@/ai/flows/weather-summary';
import { correctCitySpelling } from '@/ai/flows/city-correction';
import { hasGeminiConfig } from '@/ai/genkit';
import { fetchCurrentWeather, fetchHourlyForecast } from '@/services/weatherService';

export async function fetchWeatherAndSummaryAction(
  params: { city?: string; lat?: number; lon?: number }
): Promise<{ data: WeatherSummaryData | null; error: string | null; cityNotFound: boolean }> {
  try {
    let locationIdentifier: LocationIdentifier;
    let resolvedCityNameForError: string | undefined = params.city;

    // If only a city name is provided, resolve it to coordinates first for a more robust search.
    if (params.city && (typeof params.lat !== 'number' || typeof params.lon !== 'number')) {
      console.log(`Resolving city name "${params.city}" to coordinates.`);
      const suggestionsResult = await fetchCitySuggestionsAction(params.city);
      
      if (suggestionsResult.error) {
        // Propagate server/network errors from the suggestion fetch.
        return { data: null, error: suggestionsResult.error, cityNotFound: false };
      }
      
      if (!suggestionsResult.suggestions || suggestionsResult.suggestions.length === 0) {
        console.log(`No suggestions found for "${params.city}", even after AI correction.`);
        const errorMessage = `City "${params.city}" not found. Please check the spelling or try a nearby city.`;
        return { data: null, error: errorMessage, cityNotFound: true };
      }
      
      // --- START: INTELLIGENT MATCH SELECTION ---
      // The `correctCitySpelling` flow inside `fetchCitySuggestionsAction` already cleans the query.
      // We perform a client-side cleaning here as well to find the best match from the suggestion list.
      const cleanedQuery = params.city.toLowerCase().replace(/weather in|weather of|weather|forecast for|forecast in|forecast/gi, '').split(',')[0].trim();

      // Default to the first result provided by the API.
      let bestMatch = suggestionsResult.suggestions[0];
      
      // Prioritize an exact match if one exists in the suggestions.
      const exactMatch = suggestionsResult.suggestions.find(s => s.name.toLowerCase() === cleanedQuery);
      
      if (exactMatch) {
          console.log(`Found an exact match for "${cleanedQuery}": ${exactMatch.name}`);
          bestMatch = exactMatch;
      } else {
          console.log(`No exact match for "${cleanedQuery}". Using the first suggestion: ${bestMatch.name}`);
      }
      // --- END: INTELLIGENT MATCH SELECTION ---

      console.log(`Found best match for "${params.city}": ${bestMatch.name}, ${bestMatch.country} at ${bestMatch.lat}, ${bestMatch.lon}`);
      locationIdentifier = { type: 'coords', lat: bestMatch.lat, lon: bestMatch.lon };
      resolvedCityNameForError = bestMatch.name;
    } else if (typeof params.lat === 'number' && typeof params.lon === 'number') {
      locationIdentifier = { type: 'coords', lat: params.lat, lon: params.lon };
    } else {
      return { data: null, error: "City name or coordinates must be provided.", cityNotFound: false };
    }

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
    
    if (!hasGeminiConfig) {
      console.warn("Gemini API key(s) (GEMINI_API_KEYS) are not set or are empty. AI summaries will not be available.");
    }

    let currentWeatherData: any | null = null;
    let hourlyForecastData: HourlyForecastData[] | null = null;
    let lastTechnicalError: string | null = null;
    let successWithKey = false;
    let currentKeyIndex = 0;

    for (const apiKey of openWeatherApiKeys) {
      currentKeyIndex++;
      console.log(`Attempting OpenWeatherMap API with key ${currentKeyIndex} of ${openWeatherApiKeys.length}.`);
      
      const [currentWeatherResult, hourlyForecastResult] = await Promise.all([
        fetchCurrentWeather(locationIdentifier, apiKey),
        fetchHourlyForecast(locationIdentifier, apiKey),
      ]);

      if (currentWeatherResult.status === 404) {
        // This is highly unlikely now because we pre-validated the location.
        // But if it happens, it's a data availability issue, not a "not found" issue.
        const dataUnavailableError = `Weather data is not available for "${resolvedCityNameForError || 'the selected location'}". Please try a different nearby city.`;
        return { data: null, error: dataUnavailableError, cityNotFound: true };
      }

      const isKeyError = [401, 403, 429].includes(currentWeatherResult.status ?? 0) || [401, 403, 429].includes(hourlyForecastResult.status ?? 0);

      if (currentWeatherResult.data) {
        currentWeatherData = currentWeatherResult.data;
        hourlyForecastData = hourlyForecastResult.data ?? []; 
        successWithKey = true;
        lastTechnicalError = null;
        break; 
      } else {
        lastTechnicalError = `API failure on key ${currentKeyIndex}. Current: "${currentWeatherResult.error}". Forecast: "${hourlyForecastResult.error}".`;
        if (!isKeyError) {
          break; 
        }
      }
    }

    if (!successWithKey || !currentWeatherData) {
      const serverError = lastTechnicalError || "Failed to fetch weather data with all available API keys.";
      console.error("[Service Error] All OpenWeatherMap API keys failed or a non-retriable error occurred.", { details: serverError });

      const userFacingError = "The weather service is temporarily unavailable. This could be due to a server configuration issue or a problem with the external provider. Please try again later.";
      
      const cityNotFound = serverError.toLowerCase().includes("not found");

      return { data: null, error: userFacingError, cityNotFound };
    }

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
            console.log("Attempting to generate AI weather summary for:", aiInput.city);
            aiSummaryOutput = await summarizeWeather(aiInput);
            console.log("AI summary and subject successfully generated.");
        } catch (err) {
            console.error("Error generating AI weather summary:", err);
            aiError = err instanceof Error ? err.message : "An unexpected error occurred with the AI summary service.";
            console.log("Assigned AI Error message:", aiError);
        }
    } else {
        aiError = "AI summary service is not configured (Gemini API key missing).";
        console.log(aiError);
    }
    
    const fallbackSubject = `${currentWeatherData.temperature}°C & ${currentWeatherData.description} in ${currentWeatherData.city}`;
    
    return {
      data: { 
        ...currentWeatherData, 
        aiSummary: aiSummaryOutput?.summary || aiError || "AI summary not available.",
        aiSubject: aiSummaryOutput?.subjectLine || fallbackSubject,
        weatherSentiment: aiSummaryOutput?.weatherSentiment || 'neutral',
        activitySuggestion: aiSummaryOutput?.activitySuggestion || "Check conditions before planning activities.",
        hourlyForecast: hourlyForecastData || [], 
      },
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

export async function fetchCitySuggestionsAction(query: string): Promise<{ suggestions: CitySuggestion[] | null; error: string | null }> {
  try {
    if (!query || query.trim().length < 2) {
      return { suggestions: [], error: null };
    }

    let processedQuery = query.trim();

    // Use AI to correct spelling *before* calling the geocoding API.
    if (hasGeminiConfig) {
        console.log(`Attempting AI spelling correction for "${processedQuery}".`);
        const correctionResult = await correctCitySpelling({ query: processedQuery });
        const correctedQuery = correctionResult.correctedQuery;
        
        if (correctedQuery && correctedQuery.toLowerCase() !== processedQuery.toLowerCase()) {
            console.log(`AI corrected "${processedQuery}" to "${correctedQuery}".`);
            processedQuery = correctedQuery;
        } else {
            console.log(`AI did not provide a different correction for "${processedQuery}".`);
        }
    }


    const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
    if (!openWeatherApiKeysString) {
      console.error("[Server Config Error] OpenWeather API keys missing for suggestions.");
      return { suggestions: null, error: "Server configuration error: Geocoding keys missing." };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      console.error("[Server Config Error] No valid OpenWeather API keys found for suggestions.");
      return { suggestions: null, error: "Server configuration error: No valid geocoding keys." };
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
                return { suggestions: null, error: "Geocoding service returned an error." };
            }

            const data: any[] = await response.json();
            
            const uniqueSuggestions: CitySuggestion[] = [];
            const seenKeys = new Set<string>();

            for (const item of data) {
                // A more robust key that ignores minor coordinate differences for the same named place.
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
            return { suggestions: uniqueSuggestions, error: null };
        } catch (e) {
            lastTechnicalError = e instanceof Error ? e.message : "Unknown error fetching city suggestions";
            console.error("Error fetching city suggestions:", e);
            return { suggestions: null, error: "Network error while fetching suggestions." };
        }
    }
    
    // If all keys fail
    const serverError = lastTechnicalError || "Failed to fetch city suggestions with all available API keys.";
    console.error("[Service Error] All geocoding API keys failed.", { details: serverError });
    const userFacingError = "Could not retrieve city suggestions due to a server-side issue.";
    return { suggestions: null, error: userFacingError };

  } catch (error) {
    console.error("An unexpected error occurred in fetchCitySuggestionsAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred while fetching suggestions.";
    return { suggestions: null, error: message };
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
          // Only retry on key-related errors
          if (![401, 403, 429].includes(response.status)) {
              break; 
          }
        }
      } catch(e) {
          if (e instanceof Error) {
            lastTechnicalError = e.message;
          }
          // Don't break on fetch errors, could be network hiccup. Let it try next key.
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
