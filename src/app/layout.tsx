import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Inter, Poppins } from 'next/font/google';
import { PageTransitionWrapper } from '@/components/PageTransitionWrapper';
import { FavoritesProvider } from '@/hooks/useFavorites';

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
            <FavoritesProvider>
              <div className="flex flex-col min-h-screen bg-background dark:bg-dot-pattern-dark bg-dot-pattern">
                <Navbar />
                <main className="flex-grow">
                  <PageTransitionWrapper>{children}</PageTransitionWrapper>
                </main>
                <footer className="py-6 text-center text-sm text-muted-foreground/80 border-t bg-background/80 backdrop-blur-md">
                  © {currentYear} Weatherwise. Powered by OpenWeather and Genkit AI.
                </footer>
              </div>
              <Toaster />
            </FavoritesProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
