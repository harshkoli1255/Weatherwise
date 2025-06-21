
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { CloudSun, Bell } from 'lucide-react';
import { SignedIn, SignedOut, UserButton, SignUpButton, SignInButton } from '@clerk/nextjs';
import { Button } from './ui/button';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-lg shadow-sm">
      <div className="container flex h-16 sm:h-18 md:h-20 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-4 sm:mr-6 flex items-center space-x-2.5 sm:space-x-3 group">
          <CloudSun className="h-7 w-7 sm:h-8 md:h-9 text-primary transition-transform group-hover:scale-110 drop-shadow-sm" />
          <span className="font-headline text-xl sm:text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">Weatherwise</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-3 md:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
            <Link href="/" className="px-2.5 sm:px-3 md:px-4 py-2 text-sm sm:text-base font-medium text-muted-foreground hover:text-primary rounded-md transition-colors">
              Home
            </Link>
            <SignedIn>
              <Link href="/alerts" className="px-2.5 sm:px-3 md:px-4 py-2 text-sm sm:text-base font-medium text-muted-foreground hover:text-primary rounded-md transition-colors flex items-center">
                <Bell className="h-4 w-4 sm:h-4 md:h-5 mr-1.5 sm:mr-2 md:mr-2" /> Alerts
              </Link>
            </SignedIn>
          </div>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
               <Button variant="ghost" className="text-sm sm:text-base font-medium text-muted-foreground hover:text-primary">
                  Sign In
               </Button>
            </SignInButton>
             <SignUpButton mode="modal">
               <Button className="text-sm sm:text-base font-medium">
                  Sign Up
               </Button>
             </SignUpButton>
          </SignedOut>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
