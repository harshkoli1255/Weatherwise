import { cn } from "@/lib/utils";
import React from "react";
import { MapPin } from "lucide-react";

// A professional, custom SVG animation for a weather app's "searching" state.
// It features a map pin with three concentric, pulsing rings to simulate a radar scan.
export function WeatherLoadingAnimation({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-28 w-28 flex items-center justify-center text-primary", className)}>
      {/* Radar rings. They scale up and fade out. */}
      <div className="absolute h-full w-full rounded-full border-2 border-current opacity-0 animate-radar-scan" />
      <div className="absolute h-full w-full rounded-full border-2 border-current opacity-0 animate-radar-scan" style={{ animationDelay: '0.5s' }} />
      <div className="absolute h-full w-full rounded-full border-2 border-current opacity-0 animate-radar-scan" style={{ animationDelay: '1s' }} />
      
      {/* The map pin icon in the center with a subtle bobbing motion */}
      <MapPin className="relative h-1/2 w-1/2 animate-map-pin-bob fill-current" />
    </div>
  );
}
