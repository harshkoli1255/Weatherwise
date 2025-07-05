
import type { WeatherData, OpenWeatherCurrentAPIResponse, OpenWeatherForecastAPIResponse, HourlyForecastData, LocationIdentifier, OpenWeatherAirPollutionAPIResponse, AirQualityData } from '@/lib/types';

/**
 * A resilient fetcher that rotates through multiple API keys on failure.
 * This is crucial for handling API key quota limits gracefully.
 * @param baseUrl The API URL without the `&appid=` parameter.
 * @param apiKeys An array of OpenWeather API keys.
 * @param source A string identifier for logging purposes (e.g., 'currentWeather').
 * @returns A promise that resolves with the fetched data or an error.
 */
async function fetchWithKeyRotation<T>(
  baseUrl: string,
  apiKeys: string[],
  source: string
): Promise<{ data: T | null, error: string | null, status?: number, rawResponse?: Response }> {
    let lastError: any = null;
    let lastStatus: number | undefined = 500;

    for (const apiKey of apiKeys) {
        const url = `${baseUrl}&appid=${apiKey}`;
        try {
            const response = await fetch(url, { cache: 'no-store' });
            
            if (response.ok) {
                const data = await response.json();
                return { data, error: null, status: response.status, rawResponse: response };
            }

            lastStatus = response.status;
            try {
              const errorData = await response.json();
              lastError = errorData.message || `API error with status ${response.status}`;
            } catch (e) {
              lastError = `API error with status ${response.status}`;
            }

            // 401: Invalid key, 429: Rate limit/quota. These are key-specific errors.
            if (response.status === 401 || response.status === 429) {
                console.warn(`[WeatherService/${source}] API key failed (status: ${response.status}). Trying next key.`);
                continue; // Try the next key
            } else {
                 // For other errors (like 404 Not Found or 5xx server errors),
                 // retrying with another key is pointless.
                break;
            }
        } catch (e) {
            lastError = e instanceof Error ? e.message : 'Unknown fetch error';
            console.error(`[WeatherService/${source}] Network or fetch error for URL part: ${baseUrl}`, e);
        }
    }
    
    console.error(`[WeatherService/${source}] All API keys failed for URL part: ${baseUrl}. Last error:`, lastError);
    return { data: null, error: lastError, status: lastStatus };
}


export async function geocodeCity(city: string, apiKeys: string[]): Promise<{data: any[] | null, error: string | null, status?: number}> {
    const baseUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=5`;
    const result = await fetchWithKeyRotation<any[]>(baseUrl, apiKeys, 'geocodeCity');
    return { data: result.data, error: result.error, status: result.status };
}

export async function reverseGeocode(lat: number, lon: number, apiKeys: string[]): Promise<{data: any[] | null, error: string | null, status?: number}> {
    const baseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1`;
    const result = await fetchWithKeyRotation<any[]>(baseUrl, apiKeys, 'reverseGeocode');
    return { data: result.data, error: result.error, status: result.status };
}


export async function fetchCurrentWeather(location: LocationIdentifier, apiKeys: string[]): Promise<{data: WeatherData | null, error: string | null, status?: number, rawResponse?: OpenWeatherCurrentAPIResponse}> {
  try {
    let baseUrl = '';
    if (location.type === 'city') {
      baseUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.city)}&units=metric`;
    } else {
      baseUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=metric`;
    }

    const { data, error, status } = await fetchWithKeyRotation<OpenWeatherCurrentAPIResponse>(baseUrl, apiKeys, 'currentWeather');

    if (error || !data) {
        return { data: null, error: error, status: status };
    }

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
        timezone: data.timezone,
      },
      error: null,
      status: 200,
      rawResponse: data
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error in fetchCurrentWeather";
    console.error("Unexpected error in fetchCurrentWeather:", error);
    return { data: null, error: message, status: 500 };
  }
}

export async function fetchHourlyForecast(location: LocationIdentifier, apiKeys: string[]): Promise<{data: HourlyForecastData[] | null, error: string | null, status?: number}> {
  try {
    let baseUrl = '';
    if (location.type === 'city') {
      baseUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location.city)}&units=metric&cnt=8`;
    } else {
      baseUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${location.lat}&lon=${location.lon}&units=metric&cnt=8`;
    }
    
    const { data, error, status } = await fetchWithKeyRotation<OpenWeatherForecastAPIResponse>(baseUrl, apiKeys, 'hourlyForecast');
    
    if (error || !data) {
        return { data: null, error: error, status: status };
    }
    
    if (!data.list || data.list.length === 0) {
      return { data: [], error: null, status: 200 }; 
    }
    
    const forecastList = data.list.map(item => {
      return {
        timestamp: item.dt,
        temp: Math.round(item.main.temp),
        feelsLike: Math.round(item.main.feels_like),
        iconCode: item.weather[0].icon,
        condition: item.weather[0].main,
        humidity: item.main.humidity,
        windSpeed: Math.round(item.wind.speed * 3.6), // m/s to km/h
        precipitationChance: Math.round((item.pop || 0) * 100),
      };
    });
    return { data: forecastList, error: null, status: 200 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error in fetchHourlyForecast";
    console.error("Unexpected error in fetchHourlyForecast:", error);
    return { data: null, error: message, status: 500 };
  }
}

export async function fetchAirQuality(lat: number, lon: number, apiKeys: string[]): Promise<{ data: AirQualityData | null, error: string | null, status?: number }> {
    const baseUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}`;
    
    try {
        const { data, error, status } = await fetchWithKeyRotation<OpenWeatherAirPollutionAPIResponse>(baseUrl, apiKeys, 'airQuality');
        
        if (error || !data) {
            return { data: null, error: error, status: status };
        }

        if (!data.list || data.list.length === 0) {
            return { data: null, error: "Air quality data not available for this location.", status: 404 };
        }

        const aqiData = data.list[0];
        const aqiIndex = aqiData.main.aqi;

        const getAqiLevel = (index: number): AirQualityData['level'] => {
            switch (index) {
                case 1: return 'Good';
                case 2: return 'Fair';
                case 3: return 'Moderate';
                case 4: return 'Poor';
                case 5: return 'Very Poor';
                default: return 'Unknown';
            }
        };

        return {
            data: {
                aqi: aqiIndex,
                level: getAqiLevel(aqiIndex),
                components: {
                    co: aqiData.components.co,
                    no2: aqiData.components.no2,
                    o3: aqiData.components.o3,
                    so2: aqiData.components.so2,
                    pm2_5: aqiData.components.pm2_5,
                    pm10: aqiData.components.pm10,
                },
            },
            error: null,
            status: 200,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error in fetchAirQuality";
        console.error("Unexpected error in fetchAirQuality:", error);
        return { data: null, error: message, status: 500 };
    }
}
