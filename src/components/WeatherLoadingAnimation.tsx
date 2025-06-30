
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
      <div className="absolute h-full w-full animate-spin [animation-duration:3s]">
        <div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-current/80 opacity-50" />
        <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-current/80 opacity-50" />
        <div className="absolute bottom-0 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-current/80 opacity-50" />
        <div className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-current/80 opacity-50" />
      </div>
      <div className="absolute h-16 w-16 animate-ping rounded-full bg-current/50 [animation-duration:1.5s]" />
      <div className="absolute h-12 w-12 rounded-full bg-current shadow-[0_0_25px_currentColor]" />
    </div>
  );
}
