import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className }: { className?: string }) {
  // A professional, SVG-based searching animation.
  // It features a magnifying glass with a pulsing dot inside the lens,
  // representing an active search or data fetch.
  return (
    <div className={cn("relative h-28 w-28 text-primary", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className="w-full h-full"
      >
        <g>
          {/* Handle */}
          <rect
            x="120"
            y="120"
            width="50"
            height="18"
            rx="9"
            transform="rotate(45 145 129)"
            fill="currentColor"
            className="opacity-75"
          />
          {/* Lens Outline */}
          <circle
            cx="85"
            cy="85"
            r="60"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
          />
          {/* Pulsing Dot */}
          <circle
            cx="85"
            cy="85"
            r="15"
            fill="currentColor"
            className="animate-pulse-search origin-center"
          />
        </g>
      </svg>
    </div>
  );
}
