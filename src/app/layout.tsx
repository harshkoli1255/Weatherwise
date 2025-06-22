
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Weatherwise',
  description: 'Get real-time weather updates and AI summaries.',
};

function MissingKeyError() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl rounded-xl border-2 border-destructive bg-destructive/10 p-8 text-center shadow-2xl">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-6" />
        <h1 className="text-3xl font-bold text-destructive mb-4">Configuration Error</h1>
        <p className="text-lg text-destructive/90 mb-6">
          The Clerk Publishable Key is missing. The application cannot start without it.
        </p>
        <div className="text-left bg-background/50 p-6 rounded-lg text-foreground">
          <p className="font-semibold text-lg mb-3">How to fix this:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Find the <code className="bg-muted px-2 py-1 rounded text-sm font-mono">.env</code> file in your project.</li>
            <li>Find the line that says <code className="bg-muted px-2 py-1 rounded text-sm font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""</code>.</li>
            <li>Go to your <a href="https://dashboard.clerk.com/last-active?path=api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Clerk Dashboard</a> and copy your "Publishable key".</li>
            <li>Paste your key between the quotes.</li>
            <li>Save the file and restart the application.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
     return (
       <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased">
          <MissingKeyError />
        </body>
      </html>
    )
  }
  
  const currentYear = new Date().getFullYear();

  return (
    <ClerkProvider publishableKey={publishableKey}>
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
