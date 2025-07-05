
import { z } from 'zod';

// New Zod schema for hourly forecast data validation
export const HourlyForecastDataSchema = z.object({
  timestamp: z.number().describe("UNIX timestamp for the forecast hour."),
  temp: z.number().describe("The forecasted temperature in Celsius."),
  feelsLike: z.number().describe("The forecasted 'feels like' temperature in Celsius."),
  iconCode: z.string().describe("The weather icon code from OpenWeatherMap."),
  condition: z.string().describe("The general weather condition, e.g., 'Rain', 'Clouds'."),
  humidity: z.number().describe("The forecasted humidity percentage."),
  windSpeed: z.number().describe("The forecasted wind speed in km/h."),
  precipitationChance: z.number().describe("The probability of precipitation as a percentage (0-100)."),
});

// The interface now infers its type from the Zod schema for consistency.
export interface HourlyForecastData extends z.infer<typeof HourlyForecastDataSchema> {}


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

export interface AirQualityData {
  aqi: 1 | 2 | 3 | 4 | 5;
  level: 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very Poor' | 'Unknown';
  components: {
    co: number;
    no2: number;
    o3: number;
    so2: number;
    pm2_5: number;
    pm10: number;
  };
}

export interface WeatherSummaryData extends WeatherData {
  lat: number;
  lon: number;
  aiSummary: string;
  aiSubject: string;
  hourlyForecast?: HourlyForecastData[];
  weatherSentiment?: 'good' | 'bad' | 'neutral';
  activitySuggestion?: string;
  aiInsights?: string[];
  aiImageUrl?: string;
  airQuality?: AirQualityData;
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


export interface OpenWeatherAirPollutionAPIResponse {
  coord: {
    lon: number;
    lat: number;
  };
  list: Array<{
    main: {
      aqi: 1 | 2 | 3 | 4 | 5;
    };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
    dt: number;
  }>;
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
  schedule: AlertSchedule;
  notificationFrequency: 'everyHour' | 'balanced' | 'oncePerDay';
  lastAlertSentTimestamp: number;
  timezone: string; // IANA timezone string e.g., "America/New_York"
}

export interface IpApiLocationResponse {
  status: 'success' | 'fail';
  message?: string; // Present on fail
  country?: string;
  city?: string;
  lat?: number;
  lon?: number;
}

export interface CitySuggestion {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string; // Optional: For states/provinces within countries like US, CA
  temperature?: number; // Optional: For live weather in suggestions
  iconCode?: string; // Optional: For live weather in suggestions
  isLandmark?: boolean;
}

// State type for form actions
export type SaveAlertsFormState = {
  message: string | null;
  error: boolean;
};

export type LocationIdentifier =
  | { type: 'city'; city: string }
  | { type: 'coords'; lat: number; lon: number };


// AI Schema: Search Query Interpretation
export const InterpretSearchQueryInputSchema = z.object({
  query: z.string().describe('The raw search query from the user, which could be a city, a landmark, a business, or a conversational question.'),
});
export type InterpretSearchQueryInput = z.infer<typeof InterpretSearchQueryInputSchema>;

export const InterpretSearchQueryOutputSchema = z.object({
  searchQueryForApi: z.string().describe("The processed, cleaned-up query string that is optimized for use with a geocoding API that works best with city names. This should typically be just the city name, e.g., 'Paris', 'Jaipur', 'London'."),
  isSpecificLocation: z.boolean().describe("True if the query refers to a specific point of interest (like 'Eiffel Tower' or 'VGU Jaipur') rather than just a city ('Paris')."),
  locationName: z.string().optional().describe("The full, proper name of the specific location if one was identified (e.g., 'Eiffel Tower')."),
  cityName: z.string().optional().describe("The name of the city you extracted (e.g., 'Paris'). This is the most reliable value for geocoding."),
});
export type InterpretSearchQueryOutput = z.infer<typeof InterpretSearchQueryOutputSchema>;


// AI Schema: Weather Summary
export const WeatherSummaryInputSchema = z.object({
  city: z.string().describe('The city to get the weather summary for.'),
  temperature: z.number().describe('The current temperature in Celsius.'),
  feelsLike: z.number().describe('The current feels like temperature in Celsius.'),
  humidity: z.number().describe('The current humidity percentage.'),
  windSpeed: z.number().describe('The current wind speed in kilometers per hour.'),
  condition: z.string().describe('The current weather condition (e.g., sunny, cloudy, rainy).'),
  hourlyForecast: z.array(HourlyForecastDataSchema).optional().describe("An optional array of hourly forecast data for the next few hours to provide more context."),
});
export type WeatherSummaryInput = z.infer<typeof WeatherSummaryInputSchema>;

export const WeatherSummaryOutputSchema = z.object({
  summary: z.string().describe('An enhanced, conversational, and helpful summary of the weather. It should be a friendly, easy-to-read paragraph that highlights the most impactful piece of weather information using <strong> tags. For example: "While it\'s 10°C, a strong breeze makes it <strong>feel more like 6°C</strong>, so a good jacket is recommended."'),
  subjectLine: z.string().describe('A detailed and engaging email subject line, starting with one or more relevant weather emojis (e.g., ☀️, 🌧️, 💨).'),
  weatherSentiment: z.enum(['good', 'bad', 'neutral']).describe("The overall sentiment of the weather: 'good', 'bad', or 'neutral'."),
  activitySuggestion: z.string().describe('A creative, specific, and friendly suggestion for an activity that suits the weather. Go beyond generic advice and offer a concrete idea (e.g., "perfect for a bike ride," "a great day to visit the library"). Should be a single, encouraging sentence.'),
  aiInsights: z.array(z.string()).optional().describe("A short list (2-3 bullet points) of the most important, non-obvious insights from both the current data and the hourly forecast, with the key part of each insight wrapped in <strong> tags. Examples: 'Feels like temperature is <strong>5°C colder</strong> due to wind.', '<strong>High chance of rain</strong> starting this evening.', 'Temperature will <strong>drop significantly</strong> after sunset.'"),
});
export type WeatherSummaryOutput = z.infer<typeof WeatherSummaryOutputSchema>;

// AI Schema: Alert Decision
export const AlertDecisionInputSchema = z.object({
  city: z.string(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  condition: z.string(),
  description: z.string(),
  hourlyForecast: z.array(HourlyForecastDataSchema).optional().describe("An array of hourly forecast data for the next few hours."),
});
export type AlertDecisionInput = z.infer<typeof AlertDecisionInputSchema>;

export const AlertDecisionOutputSchema = z.object({
  shouldSendAlert: z
    .boolean()
    .describe(
      'Whether an alert notification should be sent for these weather conditions.'
    ),
  reason: z
    .string()
    .describe(
      'A concise, user-facing reason why the alert was triggered. For example, "High temperature: 32°C" or "High winds and rain." If no alert, this should be empty.'
    ),
});
export type AlertDecisionOutput = z.infer<typeof AlertDecisionOutputSchema>;

export interface EmailTemplatePayload {
  weatherData: WeatherSummaryData;
  alertTriggers?: string[];
}

export type SavedLocationWeatherResult = WeatherData | { error: string };
export type SavedLocationsWeatherMap = Record<string, SavedLocationWeatherResult>;

export interface UnitPreferences {
  temperature: 'celsius' | 'fahrenheit';
  windSpeed: 'kmh' | 'mph';
  timeFormat: '12h' | '24h';
}

// AI Schema: Summarize Error
export const SummarizeErrorInputSchema = z.object({
  errorMessage: z.string().describe('The technical error message caught by the application.'),
});
export type SummarizeErrorInput = z.infer<typeof SummarizeErrorInputSchema>;

export const SummarizeErrorOutputSchema = z.object({
  userFriendlyMessage: z.string().describe('A polite, easy-to-understand message for the user that explains the issue without technical jargon.'),
});
export type SummarizeErrorOutput = z.infer<typeof SummarizeErrorOutputSchema>;

// AI Schema: Generate Weather Image
export const WeatherImageInputSchema = z.object({
  condition: z.string().describe('The current weather condition, e.g., "sunny", "light rain".'),
  activitySuggestion: z.string().describe('The AI-generated activity suggestion, e.g., "a great day for a picnic".'),
  city: z.string().describe('The name of the city.'),
});
export type WeatherImageInput = z.infer<typeof WeatherImageInputSchema>;

export const WeatherImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI, or an empty string if generation fails.'),
});
export type WeatherImageOutput = z.infer<typeof WeatherImageOutputSchema>;

// AI Schema: Generate AQI Image
export const AqiImageInputSchema = z.object({
  city: z.string().describe('The name of the city.'),
  aqiLevel: z.string().describe('The air quality level, e.g., "Poor", "Moderate".'),
  condition: z.string().describe('The current weather condition, e.g., "sunny", "light rain".'),
});
export type AqiImageInput = z.infer<typeof AqiImageInputSchema>;

export const AqiImageOutputSchema = z.object({
  imageUrl: z.string().describe('The generated image as a data URI, or an empty string if generation fails.'),
});
export type AqiImageOutput = z.infer<typeof AqiImageOutputSchema>;
