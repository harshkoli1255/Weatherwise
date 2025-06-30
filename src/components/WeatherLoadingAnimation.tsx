import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className }: { className?: string }) {
  // A professional, minimalist loading animation with a subtle, pulsing glow.
  // It provides a more polished feel than a standard spinner.
  return (
    <div className={cn("relative flex h-28 w-28 items-center justify-center", className)}>
      {/* The animated 'ping' effect creates the pulse. Its color is inherited. */}
      <div className="absolute h-20 w-20 animate-ping rounded-full bg-current/25 [animation-duration:1.75s]" />
      
      {/* A static, central orb with a soft shadow to create depth. */}
      <div className="relative h-12 w-12 rounded-full bg-background shadow-[0_0_15px_hsl(var(--primary)/0.3)]" />
    </div>
  );
}
