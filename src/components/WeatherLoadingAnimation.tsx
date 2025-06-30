import { cn } from "@/lib/utils";
import React from "react";

// A highly professional, custom SVG animation for a weather app.
// It features a gently pulsing sun with two clouds drifting at different speeds.
export function WeatherLoadingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-28 w-28", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 120 120"
        className="w-full h-full overflow-hidden rounded-full"
      >
        <defs>
          {/* A filter to create a soft blur effect for the clouds */}
          <filter id="soft-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
        </defs>
        
        {/* Sun Group: Centerpiece with a gentle pulse */}
        <g className="animate-sun-pulse origin-center">
          {/* Sun Core (brighter) */}
          <circle cx="60" cy="60" r="25" fill="hsl(var(--primary))" opacity="0.9" />
          {/* Sun Glow (larger, more transparent) */}
          <circle cx="60" cy="60" r="30" fill="hsl(var(--primary))" opacity="0.4" />
        </g>
        
        {/* Cloud Group: Drifting across the sun */}
        <g style={{ filter: 'url(#soft-blur)' }}>
          {/* Cloud 1: Slower, further back */}
          <path
            d="M -20 75 C -30 75, -30 65, -20 65 L 40 65 C 50 65, 50 75, 40 75 Z"
            fill="hsl(var(--muted))"
            opacity="0.8"
            className="animate-cloud-drift-1"
          />
          {/* Cloud 2: Faster, closer */}
          <path
            d="M -5 90 C -15 90, -15 80, -5 80 L 55 80 C 65 80, 65 90, 55 90 Z"
            fill="hsl(var(--muted))"
            opacity="0.95"
            className="animate-cloud-drift-2"
          />
        </g>
      </svg>
    </div>
  );
}
