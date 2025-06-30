import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className }: { className?: string }) {
  // A custom, high-polish loading animation representing a stylized, animated sun.
  // It's more thematic and visually engaging than a standard spinner.
  return (
    <div className={cn("relative flex h-28 w-28 items-center justify-center", className)}>
      {/* Container for the rotating elements */}
      <div className="absolute h-full w-full animate-spin [animation-duration:10s]">
        {/* The sun's rays. Each ray has a delayed animation for a more dynamic effect. */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 h-full w-1.5 -translate-x-1/2"
            style={{ transform: `rotate(${i * 45}deg)` }}
          >
            <div
              className="mx-auto h-1/3 w-full rounded-full bg-current/70 animate-sun-ray-pulse"
              style={{ animationDelay: `${i * 125}ms` }}
            />
          </div>
        ))}
      </div>
       {/* Central glowing orb */}
      <div className="absolute h-12 w-12 rounded-full bg-current shadow-[0_0_25px_currentColor] animate-ping [animation-duration:2s]" />
      <div className="absolute h-12 w-12 rounded-full bg-current/90 shadow-[0_0_15px_currentColor]" />
    </div>
  );
}
