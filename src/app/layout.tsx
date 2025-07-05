
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Inter, Poppins } from 'next/font/google';
import { PageTransitionWrapper } from '@/components/PageTransitionWrapper';
import { SavedLocationsProvider } from '@/hooks/useSavedLocations';
import { UnitsProvider } from '@/hooks/useUnits';
import { DefaultLocationProvider } from '@/hooks/useDefaultLocation';
import { LastSearchProvider } from '@/hooks/useLastSearch.tsx';
import { LastWeatherResultProvider } from '@/hooks/useLastWeatherResult';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
});


export const metadata: Metadata = {
  title: 'Weatherwise',
  description: 'Get real-time weather updates and AI summaries.',
  icons: {
    icon: {
      url: '/favicon.svg',
      type: 'image/svg+xml',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentYear = new Date().getFullYear();

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
        <head />
        <body className="font-body antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <UnitsProvider>
              <DefaultLocationProvider>
                <SavedLocationsProvider>
                  <LastSearchProvider>
                    <LastWeatherResultProvider>
                      <div className="flex flex-col min-h-screen">
                        <Navbar />
                        <main className="flex-grow">
                          <PageTransitionWrapper>{children}</PageTransitionWrapper>
                        </main>
                        <footer className="py-6 text-center text-sm text-muted-foreground/80 border-t bg-background/80 backdrop-blur-md">
                          © {currentYear} Weatherwise. Powered by OpenWeather and Genkit AI.
                        </footer>
                      </div>
                      <Toaster />
                      <div id="notification-portal-root" />
                    </LastWeatherResultProvider>
                  </LastSearchProvider>
                </SavedLocationsProvider>
              </DefaultLocationProvider>
            </UnitsProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
