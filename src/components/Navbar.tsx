
'use client'; // Required for Sheet state management

import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { CloudSun, Menu } from 'lucide-react';
import { Button } from './ui/button';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Logo and Main Nav Links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <CloudSun className="h-8 w-8 text-primary transition-transform group-hover:scale-110 drop-shadow-sm" />
            <span className="font-headline text-2xl font-bold text-foreground group-hover:text-primary transition-colors hidden sm:inline-block">
              Weatherwise
            </span>
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/alerts">Alerts</Link>
            </Button>
          </div>
        </div>

        {/* Right Side: User Actions and Mobile Menu */}
        <div className="flex items-center space-x-4">
          {/* Desktop User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline">Sign In</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <ThemeToggle />
          </div>

          {/* Mobile navigation menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col space-y-6 pt-8">
                  <SheetClose asChild>
                    <Link href="/" className="text-lg font-medium text-foreground">
                      Home
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/alerts" className="text-lg font-medium text-foreground">
                      Alerts
                    </Link>
                  </SheetClose>
                </nav>
                <div className="mt-8 pt-6 border-t">
                  <SignedOut>
                     <SheetClose asChild>
                          <SignInButton mode="modal">
                              <Button variant="outline" className="w-full">Sign In</Button>
                          </SignInButton>
                      </SheetClose>
                  </SignedOut>
                  <SignedIn>
                      <div className="flex items-center justify-between">
                         <p className="text-lg font-medium text-foreground">Profile</p>
                         <UserButton />
                      </div>
                  </SignedIn>
                   <div className="flex items-center justify-between mt-6">
                      <p className="text-lg font-medium text-foreground">Theme</p>
                      <ThemeToggle />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
