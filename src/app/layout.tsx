
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import React from 'react';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Weatherwise',
  description: 'Get real-time weather updates and AI summaries.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  // ClerkProvider is designed to automatically read the publishable key
  // from the NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable.
  // Manually passing the key is not necessary and was the source of the error.
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
              <footer className="py-6 sm:py-8 text-base sm:text-lg text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-md text-center">
                © {currentYear} Weatherwise. Powered by OpenWeather and Genkit AI.
              </footer>
            </div>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
