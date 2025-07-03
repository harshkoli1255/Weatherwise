import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className, message }: { className?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-6 text-center", className)}>
      <div className="relative h-24 w-32 text-muted-foreground/50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 115 75"
          fill="currentColor"
          className="w-full h-full drop-shadow-lg"
        >
          <path d="M92.14,24.31C91.1,15.93,84.4,9,75.4,9c-5.26,0-9.94,2.41-13.1,6.11C60,12,57.17,10,53.84,10c-6.57,0-11.9,5.33-11.9,11.9,0,.71,.08,1.4,.22,2C27.1,28.4,18,39.69,18,51.87c0,9.45,7.68,17.13,17.13,17.13H82c9.94,0,18-8.06,18-18C100,41,96.86,30.7,92.14,24.31Z" />
        </svg>
      </div>
      {message && <p className="text-lg sm:text-xl text-muted-foreground font-medium animate-in fade-in-0" style={{ animationDelay: '300ms' }}>{message}</p>}
    </div>
  );
}
