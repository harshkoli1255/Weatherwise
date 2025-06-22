
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
    
    if (!hasGeminiConfig) {
      console.warn("Gemini API key(s) (GEMINI_API_KEYS) are not set or are empty. AI summaries will not be available.");
    }

    let currentWeatherData: any | null = null;
    let hourlyForecastData: HourlyForecastData[] | null = null;
    let lastOpenWeatherError: string | null = null;
    let successWithKey = false;
    let currentKeyIndex = 0;

    for (const apiKey of openWeatherApiKeys) {
      currentKeyIndex++;
      console.log(`Attempting OpenWeatherMap API with key ${currentKeyIndex} of ${openWeatherApiKeys.length}.`);
      
      const [currentWeatherResult, hourlyForecastResult] = await Promise.all([
        fetchCurrentWeather(locationIdentifier, apiKey),
        fetchHourlyForecast(locationIdentifier, apiKey),
      ]);

      // Prioritize "not found" errors, as they are definitive.
      if (currentWeatherResult.status === 404) {
        return { data: null, error: currentWeatherResult.error, cityNotFound: true };
      }

      // Check for API key-related errors (401, 403, 429) to decide whether to retry.
      const isKeyError = [401, 403, 429].includes(currentWeatherResult.status ?? 0) || [401, 403, 429].includes(hourlyForecastResult.status ?? 0);

      // If we have successful current weather data, we can proceed. A failed forecast is non-critical.
      if (currentWeatherResult.data) {
        currentWeatherData = currentWeatherResult.data;
        hourlyForecastData = hourlyForecastResult.data ?? []; // Use forecast if available, otherwise empty array.
        successWithKey = true;
        lastOpenWeatherError = null;
        break; // Success, exit the loop.
      } else {
        lastOpenWeatherError = `API failure on key ${currentKeyIndex}. Current: "${currentWeatherResult.error}". Forecast: "${hourlyForecastResult.error}".`;
        if (!isKeyError) {
          break; // It's a non-key-related error, so stop retrying.
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

    const processedQuery = query.trim();

    const openWeatherApiKeysString = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEYS;
    if (!openWeatherApiKeysString) {
      return { suggestions: null, error: "Server configuration error: OpenWeather API keys missing for suggestions." };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      return { suggestions: null, error: "Server configuration error: No valid OpenWeather API keys for suggestions." };
    }
    
    // Helper function to perform the fetch and parse logic
    const getSuggestionsFromApi = async (searchQuery: string): Promise<{ suggestions: CitySuggestion[] | null, error: string | null, shouldRetry: boolean }> => {
      let lastError: string | null = null;
      let currentKeyIndex = 0;

      for (const apiKey of openWeatherApiKeys) {
          currentKeyIndex++;
          const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchQuery)}&limit=8&appid=${apiKey}`;
          try {
              const response = await fetch(url);
              if (!response.ok) {
                  const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
                  lastError = errorData.message || `Failed to fetch city suggestions (status: ${response.status}, Key ${currentKeyIndex})`;
                  if ([401, 403, 429].includes(response.status)) { 
                      console.warn(`OpenWeather Geocoding API key ${currentKeyIndex} failed or rate limited. Trying next key.`);
                      continue; 
                  }
                  console.error("OpenWeather Geocoding API error:", { status: response.status, message: lastError, url });
                  return { suggestions: null, error: lastError, shouldRetry: false };
              }

              const data: any[] = await response.json();
              
              const uniqueSuggestions: CitySuggestion[] = [];
              const seenKeys = new Set<string>();

              for (const item of data) {
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
              return { suggestions: uniqueSuggestions, error: null, shouldRetry: false };
          } catch (e) {
              lastError = e instanceof Error ? e.message : "Unknown error fetching city suggestions";
              console.error("Error fetching city suggestions:", e);
              // Don't retry on network errors for this step
              return { suggestions: null, error: lastError, shouldRetry: false };
          }
      }
      // If all keys fail
      return { suggestions: null, error: lastError || "Failed to fetch city suggestions with all available API keys.", shouldRetry: true };
    }

    // --- Main Logic ---

    // Step 1: Try fetching with the original query
    const initialResult = await getSuggestionsFromApi(processedQuery);

    if (initialResult.suggestions && initialResult.suggestions.length > 0) {
        return { suggestions: initialResult.suggestions, error: null };
    }
    
    if (initialResult.error && !initialResult.shouldRetry) {
        return { suggestions: null, error: initialResult.error };
    }
    
    // Step 2: If no suggestions, try AI correction as a fallback
    if (hasGeminiConfig) {
        console.log(`No suggestions for "${processedQuery}". Attempting AI spelling correction.`);
        const correctionResult = await correctCitySpelling({ query: processedQuery });
        const correctedQuery = correctionResult.correctedQuery;
        
        if (correctedQuery && correctedQuery.toLowerCase() !== processedQuery.toLowerCase()) {
            console.log(`AI corrected "${processedQuery}" to "${correctedQuery}". Fetching again.`);
            
            // Step 3: Fetch again with the corrected query
            const correctedResult = await getSuggestionsFromApi(correctedQuery);
            
            if (correctedResult.suggestions && correctedResult.suggestions.length > 0) {
                return { suggestions: correctedResult.suggestions, error: null };
            } else {
                return { suggestions: [], error: correctedResult.error };
            }
        } else {
            console.log(`AI did not provide a different correction for "${processedQuery}".`);
        }
    }

    // Fallback: return the empty result from the initial fetch.
    return { suggestions: [], error: initialResult.error };
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
      return { city: null, error: "Server configuration error: OpenWeather API keys missing." };
    }
    const openWeatherApiKeys = openWeatherApiKeysString.split(',').map(key => key.trim()).filter(key => key);
    if (openWeatherApiKeys.length === 0) {
      return { city: null, error: "Server configuration error: No valid OpenWeather API keys." };
    }

    let resultCity: string | null = null;
    let lastError: string | null = "Failed to get city from coordinates.";

    for (const apiKey of openWeatherApiKeys) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data: OpenWeatherCurrentAPIResponse = await response.json();
          if (data.name) {
            resultCity = data.name;
            lastError = null;
            break; // Success
          }
        } else {
          const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}` }));
          lastError = errorData.message || `Failed to fetch city name (status: ${response.status})`;
          // Only retry on key-related errors
          if (![401, 403, 429].includes(response.status)) {
              break; 
          }
        }
      } catch(e) {
          if (e instanceof Error) {
              lastError = e.message;
          }
          // Don't break on fetch errors, could be network hiccup. Let it try next key.
      }
    }

    return { city: resultCity, error: lastError };
  } catch (error) {
    console.error("An unexpected error occurred in getCityFromCoordsAction:", error);
    const message = error instanceof Error ? error.message : "An unknown server error occurred while getting city from coordinates.";
    return { city: null, error: message };
  }
}
