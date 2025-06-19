
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { CloudSun, Bell } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md shadow-sm">
      <div className="container flex h-16 sm:h-18 md:h-20 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-4 sm:mr-6 flex items-center space-x-2 group">
          <CloudSun className="h-7 w-7 sm:h-8 md:h-9 text-primary transition-transform group-hover:scale-110" />
          <span className="font-headline text-lg sm:text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">Weatherwise</span>
        </Link>
        <div className="flex flex-1 items-center justify-between space-x-1 sm:space-x-2 md:space-x-4">
          <div className="flex items-center space-x-0.5 sm:space-x-1 md:space-x-2">
            <Link href="/" className="px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm md:text-base font-medium text-muted-foreground hover:text-primary rounded-md transition-colors">
              Home
            </Link>
            <Link href="/alerts" className="px-2 sm:px-3 md:px-4 py-2 text-xs sm:text-sm md:text-base font-medium text-muted-foreground hover:text-primary rounded-md transition-colors flex items-center">
              <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-1.5 md:mr-2" /> Send Alert
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
