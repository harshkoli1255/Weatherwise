
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Inter, Poppins } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-poppins',
});


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
            <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
              <footer className="py-6 text-center text-sm text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-md">
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
