
import { z } from 'zod';

export interface HourlyForecastData {
  time: string; // Formatted time e.g., "3 PM" or "15:00"
  timestamp: number; // UNIX timestamp
  temp: number;
  iconCode: string;
  condition: string;
}

export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string; // e.g., "Clouds"
  description: string; // e.g., "scattered clouds"
  iconCode: string; // e.g., "03d"
  timezone: number; // Timezone shift in seconds from UTC
}

export interface WeatherSummaryData extends WeatherData {
  aiSummary: string;
  aiSubject: string;
  hourlyForecast?: HourlyForecastData[];
  weatherSentiment?: 'good' | 'bad' | 'neutral';
  activitySuggestion?: string;
}

// For current weather from /data/2.5/weather
export interface OpenWeatherCurrentAPIResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number; // in m/s by default from API
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
  message?: string; // For errors
}

// For forecast from /data/2.5/forecast
export interface OpenWeatherForecastAPIResponse {
  cod: string;
  message: number | string; // Can be number (status) or string (error message)
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      sea_level: number;
      grnd_level: number;
      humidity: number;
      temp_kf: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust: number;
    };
    visibility: number;
    pop: number;
    rain?: {
      '3h': number;
    };
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface AlertSchedule {
  enabled: boolean;
  days: number[]; // 0 for Sunday, 6 for Saturday
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export interface AlertPreferences {
  email: string;
  city: string;
  alertsEnabled: boolean;
  schedule?: AlertSchedule;
  notificationFrequency?: 'everyHour' | 'balanced' | 'oncePerDay';
  lastAlertSentTimestamp?: number;
}

export interface IpApiLocationResponse {
  status: 'success' | 'fail';
  message?: string; // Present on fail
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
}

export interface WeatherConditionAlert {
  type: 'Extreme Temperature' | 'Heavy Rain' | 'Strong Wind';
  details: string;
  city: string;
  customThresholds?: {
    highTemp?: number;
    lowTemp?: number;
    windSpeed?: number;
  }
}

export interface CitySuggestion {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string; // Optional: For states/provinces within countries like US, CA
}

// State type for form actions
export type SaveAlertsFormState = {
  message: string | null;
  error: boolean;
};

export type LocationIdentifier =
  | { type: 'city'; city: string }
  | { type: 'coords'; lat: number; lon: number };


// AI Schema: City Correction
export const CityCorrectionInputSchema = z.object({
  query: z.string().describe('A potentially misspelled city name.'),
});
export type CityCorrectionInput = z.infer<typeof CityCorrectionInputSchema>;

export const CityCorrectionOutputSchema = z.object({
  correctedQuery: z
    .string()
    .describe(
      'The corrected spelling of the city name. If the input was correct or unfixable, return the original query.'
    ),
});
export type CityCorrectionOutput = z.infer<typeof CityCorrectionOutputSchema>;

// AI Schema: Weather Summary
export const WeatherSummaryInputSchema = z.object({
  city: z.string().describe('The city to get the weather summary for.'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  feelsLike: z.number().describe('The current feels like temperature in Celsius.'),
  humidity: z.number().describe('The current humidity percentage.'),
  windSpeed: z.number().describe('The current wind speed in kilometers per hour.'),
  condition: z.string().describe('The current weather condition (e.g., sunny, cloudy, rainy).'),
});
export type WeatherSummaryInput = z.infer<typeof WeatherSummaryInputSchema>;

export const WeatherSummaryOutputSchema = z.object({
  summary: z.string().describe('An enhanced, conversational, and helpful summary of the weather. It should be a friendly, easy-to-read paragraph that highlights the most impactful piece of weather information using <strong> tags. For example: "While it\'s 10°C, a strong breeze makes it <strong>feel more like 6°C</strong>, so a good jacket is recommended."'),
  subjectLine: z.string().describe('A detailed and engaging email subject line, starting with one or more relevant weather emojis (e.g., ☀️, 🌧️, 💨).'),
  weatherSentiment: z.enum(['good', 'bad', 'neutral']).describe("The overall sentiment of the weather: 'good', 'bad', or 'neutral'."),
  activitySuggestion: z.string().describe('A creative, specific, and friendly suggestion for an activity that suits the weather. Go beyond generic advice and offer a concrete idea (e.g., "perfect for a bike ride," "a great day to visit the library"). Should be a single, encouraging sentence.')
});
export type WeatherSummaryOutput = z.infer<typeof WeatherSummaryOutputSchema>;

export interface EmailTemplatePayload {
  weatherData: WeatherSummaryData;
  alertTriggers?: string[];
}
