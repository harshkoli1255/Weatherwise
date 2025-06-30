
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// --- SVG Components for Animated Icons ---
// Each component is a self-contained animated SVG.

const SunnyIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={cn("text-yellow-400", className)} {...props}>
    <g className="animate-sun-rotate origin-center">
      <path
        fill="currentColor"
        d="M32 18.5c-1.4 0-2.5-1.1-2.5-2.5v-10c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v10c0 1.4-1.1 2.5-2.5 2.5zM32 60.5c-1.4 0-2.5-1.1-2.5-2.5v-10c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v10c0 1.4-1.1 2.5-2.5 2.5zM48.1 20.4c-.6 0-1.2-.2-1.8-.7l-7.1-7.1c-1-1-1-2.6 0-3.5s2.6-1 3.5 0l7.1 7.1c1 1 1 2.6 0 3.5-.5.5-1.2.7-1.7.7zM15.9 52.1c-.6 0-1.2-.2-1.8-.7l-7.1-7.1c-1-1-1-2.6 0-3.5s2.6-1 3.5 0l7.1 7.1c1 1 1 2.6 0 3.5-.5.5-1.2.7-1.7.7zM60.5 34.5h-10c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5h10c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5zM13.5 34.5h-10c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5h10c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5zM49.9 52.1c-.6 0-1.2-.2-1.8-.7c-1-1-1-2.6 0-3.5l7.1-7.1c1-1 2.6-1 3.5 0s1 2.6 0 3.5l-7.1 7.1c-.5.5-1.1.7-1.7.7zM14.1 20.4c-.6 0-1.2-.2-1.8-.7c-1-1-1-2.6 0-3.5l7.1-7.1c1-1 2.6-1 3.5 0s1 2.6 0 3.5l-7.1 7.1c-.5.5-1.1.7-1.7.7z"
      />
    </g>
    <circle cx="32" cy="32" r="12" fill="currentColor" />
  </svg>
);

const MoonIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={cn("text-gray-300", className)} {...props}>
    <path
      fill="currentColor"
      d="M49.2,52.7c-2.4,0-4.8-0.4-7.1-1.2c-7.3-2.6-12.9-8.3-15.5-15.5c-2.2-6.1-1.2-12.8,2.7-18c3.7-4.9,9.3-7.8,15.4-8.5c1.4-0.2,2.8,0.8,3,2.2c0.2,1.4-0.8,2.8-2.2,3c-4.8,0.6-9.1,2.8-12.1,6.6c-3.1,4.1-3.9,9.4-2.1,14.5c2.1,6,6.8,10.7,12.8,12.8c6.1,2.1,12.6,1.1,17.7-2.5c1.3-0.9,3-0.5,3.9,0.8c0.9,1.3,0.5,3-0.8,3.9C58.8,51.1,54.1,52.7,49.2,52.7z"
    />
  </svg>
);

const CloudIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={cn("text-gray-400", className)} {...props}>
    <g className="animate-cloud-drift">
        <path d="M47.2,40H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8h30.4c4.4,0,8,3.6,8,8S51.6,40,47.2,40z" fill="currentColor" opacity="0.6"/>
        <path d="M47.2,40H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,40,47.2,40z" fill="currentColor" />
    </g>
  </svg>
);

const CloudSunIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={className} {...props}>
    <g className="text-yellow-400 animate-sun-rotate origin-[22_22]">
      <path
        fill="currentColor"
        d="M22 14.5c-1.4 0-2.5-1.1-2.5-2.5v-7c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5v7c0 1.4-1.1 2.5-2.5 2.5z"
      />
      <path
        fill="currentColor"
        d="M34.1 14.4c-.6 0-1.2-.2-1.8-.7l-4.9-4.9c-1-1-1-2.6 0-3.5s2.6-1 3.5 0l4.9 4.9c1 1 1 2.6 0 3.5-.5.5-1.2.7-1.7.7z"
      />
      <path
        fill="currentColor"
        d="M34.5 24.5h-7c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5h7c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5z"
      />
      <path
        fill="currentColor"
        d="M35.9 31.9c-.6 0-1.2-.2-1.8-.7c-1-1-1-2.6 0-3.5l4.9-4.9c1-1 2.6-1 3.5 0s1 2.6 0 3.5l-4.9 4.9c-.5.5-1.1.7-1.7.7z"
      />
    </g>
    <circle cx="22" cy="22" r="8" fill="#FBBF24" />
    <g className="text-gray-400 animate-cloud-drift origin-center">
        <path d="M47.2,40H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8h30.4c4.4,0,8,3.6,8,8S51.6,40,47.2,40z" fill="currentColor" opacity="0.6"/>
        <path d="M47.2,40H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,40,47.2,40z" fill="currentColor" />
    </g>
  </svg>
);

const CloudMoonIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 64 64" className={className} {...props}>
    <g className="text-gray-300">
        <path fill="currentColor" d="M29.5,32.7c-2.4,0-4.8-0.4-7.1-1.2c-7.3-2.6-12.9-8.3-15.5-15.5c-2.2-6.1-1.2-12.8,2.7-18c1.3-1.7,3.8-2.1,5.5-0.8c1.7,1.3,2.1,3.8,0.8,5.5c-3.1,4.1-3.9,9.4-2.1,14.5c2.1,6,6.8,10.7,12.8,12.8c6.1,2.1,12.6,1.1,17.7-2.5c1.7-1.2,4-0.6,5.2,1.1c1.2,1.7,0.6,4-1.1,5.2C47.8,31.1,43.1,32.7,29.5,32.7z" />
    </g>
    <g className="text-gray-400 animate-cloud-drift origin-center">
        <path d="M47.2,40H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8h30.4c4.4,0,8,3.6,8,8S51.6,40,47.2,40z" fill="currentColor" opacity="0.6"/>
        <path d="M47.2,40H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,40,47.2,40z" fill="currentColor" />
    </g>
  </svg>
);

const RainIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={className} {...props}>
    <g className="text-gray-400">
        <path d="M47.2,34H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,34,47.2,34z" fill="currentColor" />
    </g>
    <g className="text-blue-400">
        <path d="M22,45 V55" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3" className="animate-rain-drop-1 opacity-0" />
        <path d="M32,45 V55" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3" className="animate-rain-drop-2 opacity-0" />
        <path d="M42,45 V55" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3" className="animate-rain-drop-3 opacity-0" />
    </g>
  </svg>
);

const ThunderstormIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={className} {...props}>
    <g className="text-gray-500">
        <path d="M47.2,34H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,34,47.2,34z" fill="currentColor" />
    </g>
    <g className="text-yellow-400">
        <polygon points="30,36 25,48 35,48 30,60 40,44 32,44" fill="currentColor" className="animate-lightning-flash opacity-0"/>
    </g>
  </svg>
);

const SnowIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={className} {...props}>
    <g className="text-gray-400">
        <path d="M47.2,34H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,34,47.2,34z" fill="currentColor" />
    </g>
    <g className="text-white">
        <g className="animate-snow-flake-1 opacity-0">
            <line x1="22" y1="45" x2="22" y2="55" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
            <line x1="18.5" y1="48.5" x2="25.5" y2="51.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
            <line x1="25.5" y1="48.5" x2="18.5" y2="51.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
        </g>
        <g className="animate-snow-flake-2 opacity-0">
            <line x1="32" y1="45" x2="32" y2="55" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
            <line x1="28.5" y1="48.5" x2="35.5" y2="51.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
            <line x1="35.5" y1="48.5" x2="28.5" y2="51.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
        </g>
        <g className="animate-snow-flake-3 opacity-0">
            <line x1="42" y1="45" x2="42" y2="55" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
            <line x1="38.5" y1="48.5" x2="45.5" y2="51.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
            <line x1="45.5" y1="48.5" x2="38.5" y2="51.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3"/>
        </g>
    </g>
  </svg>
);

const FogIcon = ({ className, ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 64 64" className={className} {...props}>
    <g className="text-gray-400">
      <path d="M47.2,34H16.8c-4.4,0-8-3.6-8-8s3.6-8,8-8c0-5.5,4.5-10,10-10c4.1,0,7.6,2.5,9.2,6c0.3,0,0.5,0,0.8,0c4.4,0,8,3.6,8,8S51.6,34,47.2,34z" fill="currentColor" />
    </g>
    <g className="text-gray-300">
      <line x1="10" y1="46" x2="54" y2="46" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="4" className="animate-haze-drift-1"/>
      <line x1="10" y1="54" x2="54" y2="54" fill="none" stroke="currentColor" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="4" className="animate-haze-drift-2"/>
    </g>
  </svg>
);


const iconMap: Record<string, React.ElementType<any>> = {
  // Day
  '01d': SunnyIcon,
  '02d': CloudSunIcon,
  '03d': CloudIcon,
  '04d': CloudIcon,
  '09d': RainIcon,
  '10d': RainIcon,
  '11d': ThunderstormIcon,
  '13d': SnowIcon,
  '50d': FogIcon,
  // Night
  '01n': MoonIcon,
  '02n': CloudMoonIcon,
  '03n': CloudIcon,
  '04n': CloudIcon,
  '09n': RainIcon,
  '10n': RainIcon,
  '11n': ThunderstormIcon,
  '13n': SnowIcon,
  '50n': FogIcon,
  // Default
  'default': CloudIcon,
};

interface WeatherIconProps {
  iconCode: string;
  className?: string;
}

export function WeatherIcon({ iconCode, className, ...props }: WeatherIconProps) {
  const IconComponent = iconMap[iconCode] || iconMap['default'];
  return <IconComponent className={cn("h-12 w-12", className)} {...props} />;
}
