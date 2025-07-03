import { cn } from "@/lib/utils";
import React from "react";

// A custom SVG animation for the loading state, matching the user's provided image.
// It features two dark, overlapping, gently drifting clouds with a subtle blue glow behind them.
export function WeatherLoadingAnimation({ className, message }: { className?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-6 text-center", className)}>
      <div className="relative h-28 w-28">
        {/* Subtle blue glow that pulses */}
        <div
          className="absolute inset-0 rounded-full animate-glow-pulse bg-primary/20 blur-2xl"
        />

        {/* Cloud SVG. Using inline SVG for precise shape and fill control. */}
        <svg
          viewBox="0 0 128 80"
          xmlns="http://www.w3.org/2000/svg"
          className="relative h-full w-full drop-shadow-lg"
        >
          {/* Back cloud, slightly larger and drifts differently */}
          <path
            d="M87.5,23.4c-1.3-9.5-9.3-16.7-19-16.7c-5.9,0-11.2,2.7-14.8,6.8c-2.4-2.1-5.6-3.4-9.1-3.4c-7.3,0-13.3,5.9-13.3,13.3c0,0.8,0.1,1.5,0.2,2.2C16.3,31.9,6.7,46,6.7,58.3c0,10.6,8.6,19.2,19.2,19.2h54.4c11.2,0,20.3-9.1,20.3-20.3C100.6,44.9,95.6,33.2,87.5,23.4Z"
            fill="hsl(var(--foreground) / 0.2)"
            className="animate-cloud-drift-back"
          />
          {/* Front cloud */}
          <path
            d="M103.2,33.1C102.8,22.2,93.9,14,83,14c-5.9,0-11.1,2.8-14.6,7.1c-2.9-2.8-6.8-4.6-11.2-4.6c-8.8,0-16,7.2-16,16c0,1,0.1,2,0.3,2.9C26.1,41,16,54.8,16,68.4c0,11.5,9.4,20.9,20.9,20.9h60.4c9.9,0,18-8.1,18-18C115.3,58,110.8,44.9,103.2,33.1Z"
            fill="hsl(var(--foreground) / 0.3)"
            transform="translate(-10, -10)"
            className="animate-cloud-drift-front"
          />
        </svg>
      </div>
      {message && <p className="text-lg sm:text-xl text-muted-foreground font-medium animate-in fade-in-0" style={{ animationDelay: '300ms' }}>{message}</p>}
    </div>
  );
}
