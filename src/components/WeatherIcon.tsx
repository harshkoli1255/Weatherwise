import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudDrizzle,
  CloudRain, CloudLightning, Snowflake, CloudFog, Haze, CloudHail, Wind, ThermometerSun, ThermometerSnowflake
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface WeatherIconProps extends LucideProps {
  iconCode: string;
}

const iconMap: Record<string, React.ElementType<LucideProps>> = {
  '01d': Sun,
  '01n': Moon,
  '02d': CloudSun,
  '02n': CloudMoon,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud, // Often used for broken clouds, can be denser than 03d
  '04n': Cloud,
  '09d': CloudDrizzle,
  '09n': CloudDrizzle,
  '10d': CloudRain,
  '10n': CloudRain,
  '11d': CloudLightning,
  '11n': CloudLightning,
  '13d': Snowflake,
  '13n': Snowflake,
  '50d': CloudFog, // Mist, Haze, Fog
  '50n': CloudFog,
  // Less common codes or alternatives
  'wind': Wind,
  'hot': ThermometerSun,
  'cold': ThermometerSnowflake,
  'hail': CloudHail,
  'default': Cloud, // Fallback icon
};

export function WeatherIcon({ iconCode, className, size = 48, ...props }: WeatherIconProps) {
  const IconComponent = iconMap[iconCode] || iconMap['default'];
  return <IconComponent className={className} size={size} {...props} />;
}
