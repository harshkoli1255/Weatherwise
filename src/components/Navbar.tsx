
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { CloudSun } from 'lucide-react';
import { Button } from './ui/button';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur-lg shadow-sm">
      <div className="container flex h-16 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-6 flex items-center space-x-2.5 group">
          <CloudSun className="h-8 w-8 text-primary transition-transform group-hover:scale-110 drop-shadow-sm" />
          <span className="font-headline text-2xl font-bold text-foreground group-hover:text-primary transition-colors sm:inline-block hidden">Weatherwise</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-2 sm:space-x-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" asChild>
                <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
                <Link href="/alerts">Alerts</Link>
            </Button>
          </div>
          <SignedOut>
            <div className="hidden sm:flex">
                <SignInButton mode="modal">
                    <Button variant="outline">Sign In</Button>
                </SignInButton>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
