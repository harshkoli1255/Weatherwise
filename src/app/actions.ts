
'use server';

import type { WeatherData, OpenWeatherCurrentAPIResponse, OpenWeatherForecastAPIResponse, WeatherSummaryData, HourlyForecastData } from '@/lib/types';
import { summarizeWeather, type WeatherSummaryInput } from '@/ai/flows/weather-summary';
import { z } from 'zod';
import { format } from 'date-fns';

const CitySchema = z.string().min(1, { message: "City name cannot be empty." });

async function fetchCurrentWeather(city: string, apiKey: string): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`City "${city}" not found.`);
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

async function fetchHourlyForecast(city: string, apiKey: string): Promise<HourlyForecastData[]> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&cnt=8`; // cnt=8 for 24 hours (8 * 3-hour intervals)
  const response = await fetch(url);

  if (!response.ok) {
    const errorData: OpenWeatherForecastAPIResponse | { message: string } = await response.json();
    console.error("OpenWeather Forecast API error:", errorData);
    const errorMessage = typeof errorData.message === 'string' ? errorData.message : `Failed to fetch forecast data (status: ${response.status})`;
    throw new Error(errorMessage);
  }

  const data: OpenWeatherForecastAPIResponse = await response.json();

  if (!data.list || data.list.length === 0) {
    return []; // Or throw an error if forecast is critical
  }
  
  // Use city timezone for formatting time if available, otherwise fallback to system timezone
  // OpenWeatherMap provides timezone offset in seconds from UTC in the forecast response
  const timezoneOffsetSeconds = data.city?.timezone ?? 0;

  return data.list.map(item => {
    // Adjust timestamp by timezoneOffsetSeconds before formatting
    // Date constructor expects milliseconds
    const localTimestamp = (item.dt + timezoneOffsetSeconds) * 1000;
    const localDate = new Date(localTimestamp);
    
    // Format time in a way that reflects the local time of the city
    // We must use UTC hours because we've manually adjusted the timestamp to be "local UTC"
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
  prevState: any,
  formData: FormData
): Promise<{ data: WeatherSummaryData | null; error: string | null; cityNotFound: boolean }> {
  const cityValidation = CitySchema.safeParse(formData.get('city'));

  if (!cityValidation.success) {
    return { data: null, error: cityValidation.error.errors[0].message, cityNotFound: false };
  }
  const city = cityValidation.data;

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("OpenWeather API key is not set (NEXT_PUBLIC_OPENWEATHER_API_KEY).");
    return { data: null, error: "Server configuration error. Please try again later.", cityNotFound: false };
  }

  try {
    const currentWeatherData = await fetchCurrentWeather(city, apiKey);
    const hourlyForecastData = await fetchHourlyForecast(city, apiKey);

    const aiInput: WeatherSummaryInput = {
      city: currentWeatherData.city,
      temperature: currentWeatherData.temperature,
      feelsLike: currentWeatherData.feelsLike,
      humidity: currentWeatherData.humidity,
      windSpeed: currentWeatherData.windSpeed,
      condition: currentWeatherData.description,
    };

    const aiSummaryOutput = await summarizeWeather(aiInput);
    
    return {
      data: { 
        ...currentWeatherData, 
        aiSummary: aiSummaryOutput.summary,
        hourlyForecast: hourlyForecastData,
      },
      error: null,
      cityNotFound: false
    };

  } catch (error) {
    console.error("Error fetching weather data or generating summary:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    const cityNotFound = errorMessage.toLowerCase().includes("not found");
    return { data: null, error: errorMessage, cityNotFound };
  }
}
