import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-28 w-28 items-center justify-center",
        className
      )}
    >
      {/* Sun */}
      <div className="absolute h-12 w-12 rounded-full bg-current shadow-[0_0_25px_currentColor] [animation:spin_8s_linear_infinite]"></div>

      {/* Sun Rays */}
       <div className="absolute h-full w-full [animation:spin_16s_linear_infinite]">
        <div className="absolute left-1/2 top-1 h-6 w-1 -translate-x-1/2 rounded-full bg-current/80"></div>
        <div className="absolute right-1 top-1/2 h-1 w-6 -translate-y-1/2 rounded-full bg-current/80"></div>
        <div className="absolute bottom-1 left-1/2 h-6 w-1 -translate-x-1/2 rounded-full bg-current/80"></div>
        <div className="absolute left-1 top-1/2 h-1 w-6 -translate-y-1/2 rounded-full bg-current/80"></div>
        <div className="absolute left-[22%] top-[22%] h-1 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current/80"></div>
        <div className="absolute right-[22%] top-[22%] h-1 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current/80"></div>
        <div className="absolute bottom-[22%] right-[22%] h-1 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current/80"></div>
        <div className="absolute bottom-[22%] left-[22%] h-1 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current/80"></div>
      </div>
      
      {/* Cloud */}
      <div className="absolute bottom-6 h-10 w-20 rounded-full bg-background/80 shadow-lg backdrop-blur-sm animate-weather-float">
        <div className="absolute -top-5 left-3 h-10 w-10 rounded-full bg-background/80"></div>
        <div className="absolute -top-7 right-3 h-12 w-12 rounded-full bg-background/80"></div>
      </div>
    </div>
  );
}
