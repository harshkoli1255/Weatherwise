
import type { WeatherData, OpenWeatherCurrentAPIResponse, OpenWeatherForecastAPIResponse, HourlyForecastData, LocationIdentifier, OpenWeatherAirPollutionAPIResponse, AirQualityData } from '@/lib/types';
import { z } from 'zod';

export async function fetchCurrentWeather(location: LocationIdentifier, apiKey: string): Promise<{data: WeatherData | null, error: string | null, status?: number, rawResponse?: OpenWeatherCurrentAPIResponse}> {
  const CoordinatesSchema = z.object({
    lat: z.number(),
    lon: z.number(),
  });
  const CityNameSchema = z.string().min(1, { message: "City name cannot be empty." });

  try {
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

    const response = await fetch(url, { cache: 'no-store' });
    const responseStatus = response.status;
    const data: OpenWeatherCurrentAPIResponse = await response.json();

    if (!response.ok) {
      let errorMessage = data.message || `Failed to fetch current weather data (status: ${responseStatus})`;
      if (responseStatus === 404) {
        errorMessage = location.type === 'city' ? `City "${location.city}" not found.` : "Weather data not found for the provided coordinates.";
      }
      console.error("OpenWeather Current API error:", { status: responseStatus, message: errorMessage, url });
      return { data: null, error: errorMessage, status: responseStatus };
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

export async function fetchHourlyForecast(location: LocationIdentifier, apiKey: string): Promise<{data: HourlyForecastData[] | null, error: string | null, status?: number}> {
  const CoordinatesSchema = z.object({
    lat: z.number(),
    lon: z.number(),
  });
  const CityNameSchema = z.string().min(1, { message: "City name cannot be empty." });

  try {
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
    
    const response = await fetch(url, { cache: 'no-store' });
    const responseStatus = response.status;
    const data: OpenWeatherForecastAPIResponse = await response.json();

    if (!response.ok) {
      const errorMessage = typeof data.message === 'string' ? data.message : `Failed to fetch forecast data (status: ${responseStatus})`;
      console.error("OpenWeather Forecast API error:", { status: responseStatus, message: errorMessage, url });
      return { data: null, error: errorMessage, status: responseStatus };
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

export async function fetchAirQuality(lat: number, lon: number, apiKey: string): Promise<{ data: AirQualityData | null, error: string | null, status?: number }> {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    try {
        const response = await fetch(url, { cache: 'no-store' });
        const responseStatus = response.status;
        const data: OpenWeatherAirPollutionAPIResponse = await response.json();

        if (!response.ok) {
            const errorMessage = `Failed to fetch air quality data (status: ${responseStatus})`;
            console.error("OpenWeather Air Pollution API error:", { status: responseStatus, message: errorMessage, url });
            return { data: null, error: errorMessage, status: responseStatus };
        }

        if (!data.list || data.list.length === 0) {
            return { data: null, error: "Air quality data not available for this location.", status: 404 };
        }

        const aqiData = data.list[0];
        const aqiIndex = aqiData.main.aqi;

        // Maps the OpenWeather 1-5 index to the descriptive levels.
        const getAqiLevel = (index: number): AirQualityData['level'] => {
            switch (index) {
                case 1: return 'Good';
                case 2: return 'Satisfactory';
                case 3: return 'Moderately Polluted';
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
