
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

export interface AlertPreferences {
  email: string;
  city: string;
  alertsEnabled: boolean;
  notifyExtremeTemp: boolean;
  highTempThreshold?: number;
  lowTempThreshold?: number;
  notifyHeavyRain: boolean;
  // rainThreshold?: number; // Rain threshold customization deferred due to API complexity
  notifyStrongWind: boolean;
  windSpeedThreshold?: number;
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
