import { cn } from "@/lib/utils";
import React from "react";

const rays = [
  { angle: 0, isLong: true },
  { angle: 45, isLong: true },
  { angle: 90, isLong: false },
  { angle: 135, isLong: false },
  { angle: 180, isLong: true },
  { angle: 225, isLong: true },
  { angle: 270, isLong: false },
  { angle: 315, isLong: false },
];

export function WeatherLoadingAnimation({ className }: { className?: string }) {
  // A professional, animated loading icon inspired by the design aesthetic.
  // It features a central orb and rotating rays of varying lengths.
  return (
    <div className={cn("relative h-28 w-28", className)}>
      <div className="absolute inset-0 animate-spin-slow">
        {rays.map(({ angle, isLong }) => (
          <div
            key={angle}
            className="absolute inset-0 flex justify-center"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className={cn(
                "w-1 rounded-full bg-primary/80",
                isLong ? "h-6" : "h-4"
              )}
              style={{ marginTop: "1rem" }} // Pushes rays out from the center
            />
          </div>
        ))}
      </div>
      {/* Central Orb is placed on top of the rays' origin */}
      <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.6)]" />
    </div>
  );
}
