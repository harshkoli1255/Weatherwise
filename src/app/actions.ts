'use server';

import type { WeatherData, OpenWeatherAPIResponse, WeatherSummaryData } from '@/lib/types';
import { summarizeWeather, type WeatherSummaryInput } from '@/ai/flows/weather-summary';
import { z } from 'zod';

const CitySchema = z.string().min(1, { message: "City name cannot be empty." });

export async function fetchWeatherAndSummaryAction(
  prevState: any,
  formData: FormData
): Promise<{ data: WeatherSummaryData | null; error: string | null; cityNotFound: boolean }> {
  const cityValidation = CitySchema.safeParse(formData.get('city'));

  if (!cityValidation.success) {
    return { data: null, error: cityValidation.error.errors[0].message, cityNotFound: false };
  }
  const city = cityValidation.data;

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error("OpenWeather API key is not set.");
    return { data: null, error: "Server configuration error. Please try again later.", cityNotFound: false };
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return { data: null, error: `City "${city}" not found. Please check the spelling and try again.`, cityNotFound: true };
      }
      const errorData = await response.json();
      console.error("OpenWeather API error:", errorData);
      return { data: null, error: errorData.message || `Failed to fetch weather data (status: ${response.status})`, cityNotFound: false };
    }

    const data: OpenWeatherAPIResponse = await response.json();

    if (!data.weather || data.weather.length === 0) {
        return { data: null, error: "Weather condition data not available.", cityNotFound: false };
    }

    const weatherData: WeatherData = {
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

    const aiInput: WeatherSummaryInput = {
      city: weatherData.city,
      temperature: weatherData.temperature,
      feelsLike: weatherData.feelsLike,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      condition: weatherData.description, // Use description for more detailed AI input
    };

    const aiSummaryOutput = await summarizeWeather(aiInput);
    
    return {
      data: { ...weatherData, aiSummary: aiSummaryOutput.summary },
      error: null,
      cityNotFound: false
    };

  } catch (error) {
    console.error("Error fetching weather data or generating summary:", error);
    if (error instanceof Error) {
      return { data: null, error: error.message, cityNotFound: false };
    }
    return { data: null, error: "An unexpected error occurred.", cityNotFound: false };
  }
}
