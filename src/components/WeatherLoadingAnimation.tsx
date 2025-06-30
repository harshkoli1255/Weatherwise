import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className }: { className?: string }) {
  // A professional, animated sun icon that provides a more engaging
  // loading experience than a standard spinner. It features a central
  // orb and radiating, pulsing lines.
  return (
    <div className={cn("relative h-28 w-28", className)}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full bg-primary/80 shadow-[0_0_15px_hsl(var(--primary)/0.5)]" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 h-1 w-14 -translate-x-1/2"
          style={{
            transform: `rotate(${i * 45}deg) translateX(2.5rem)`,
          }}
        >
          <div
            className="h-full w-full origin-center animate-sun-ray-pulse rounded-full bg-primary/80"
            style={{
              animationDelay: `${i * 125}ms`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
