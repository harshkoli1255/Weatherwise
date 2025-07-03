
import { cn } from "@/lib/utils";
import React from "react";

export function WeatherLoadingAnimation({ className, message }: { className?: string; message?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center space-y-8 text-center", className)}>
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 bg-primary/10 rounded-full animate-radar-scan"></div>
        <div className="absolute inset-2 bg-primary/20 rounded-full animate-radar-scan [animation-delay:0.2s]"></div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="absolute inset-0 m-auto h-12 w-12 text-primary drop-shadow-lg animate-map-pin-bob"
        >
          <path
            fillRule="evenodd"
            d="M12 2.25c-4.22 0-7.64 3.42-7.64 7.64 0 4.98 4.88 9.53 6.82 11.47a.93.93 0 001.64 0c1.94-1.94 6.82-6.49 6.82-11.47C19.64 5.67 16.22 2.25 12 2.25zM12 12a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      {message && <p className="text-lg sm:text-xl text-muted-foreground font-medium animate-in fade-in-0" style={{ animationDelay: '300ms' }}>{message}</p>}
    </div>
  );
}
