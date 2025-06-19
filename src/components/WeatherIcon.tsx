
import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, CloudDrizzle,
  CloudRain, CloudLightning, Snowflake, CloudFog, Haze, CloudHail, Wind, ThermometerSun, ThermometerSnowflake
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeatherIconProps extends Omit<LucideProps, 'size'> { // Omit size as it will be controlled by className
  iconCode: string;
}

const iconMap: Record<string, React.ElementType<LucideProps>> = {
  '01d': Sun,
  '01n': Moon,
  '02d': CloudSun,
  '02n': CloudMoon,
  '03d': Cloud,
  '03n': Cloud,
  '04d': Cloud, 
  '04n': Cloud,
  '09d': CloudDrizzle,
  '09n': CloudDrizzle,
  '10d': CloudRain,
  '10n': CloudRain,
  '11d': CloudLightning,
  '11n': CloudLightning,
  '13d': Snowflake,
  '13n': Snowflake,
  '50d': CloudFog, 
  '50n': CloudFog,
  'wind': Wind,
  'hot': ThermometerSun,
  'cold': ThermometerSnowflake,
  'hail': CloudHail,
  'default': Cloud, 
};

export function WeatherIcon({ iconCode, className, ...props }: WeatherIconProps) {
  const IconComponent = iconMap[iconCode] || iconMap['default'];
  // Default size if not provided by className, can be small.
  // Actual size should be primarily controlled by h- and w- utility classes in `className`.
  return <IconComponent className={cn("h-8 w-8", className)} {...props} />;
}
