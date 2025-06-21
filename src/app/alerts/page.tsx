
'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function AlertsPage() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20 py-0">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
          <CardHeader className="text-center items-center pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-5">
            <AlertTriangle className="h-14 w-14 sm:h-16 md:h-20 text-primary mb-3 sm:mb-4 drop-shadow-lg" />
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary">Feature Temporarily Disabled</CardTitle>
            <CardDescription className="text-base sm:text-lg md:text-xl text-muted-foreground mt-2 sm:mt-2.5 px-4 sm:px-6">
              The alerts page is currently undergoing maintenance to resolve a startup issue. Please check back later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">We are working to resolve this and apologize for the inconvenience.</p>
          </CardContent>
        </Card>
      </main>
      <footer className="py-5 sm:py-6 text-base sm:text-lg text-center text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-sm">
        © {currentYear ?? new Date().getFullYear()} Weatherwise.
      </footer>
    </div>
  );
}
