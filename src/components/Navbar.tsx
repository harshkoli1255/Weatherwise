
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { CloudSun, Bell } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md shadow-sm">
      <div className="container flex h-16 sm:h-20 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-6 flex items-center space-x-2.5 group">
          <CloudSun className="h-8 w-8 sm:h-9 sm:w-9 text-primary transition-transform group-hover:scale-110" />
          <span className="font-headline text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">Weatherwise</span>
        </Link>
        <div className="flex flex-1 items-center justify-between space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Link href="/" className="px-3 sm:px-4 py-2 text-sm sm:text-base font-medium text-muted-foreground hover:text-primary rounded-md transition-colors">
              Home
            </Link>
            <Link href="/alerts" className="px-3 sm:px-4 py-2 text-sm sm:text-base font-medium text-muted-foreground hover:text-primary rounded-md transition-colors flex items-center">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" /> Send Alert
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
