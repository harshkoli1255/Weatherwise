
'use client'; // Required for state management (pathname, sheet)

import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
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
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { FavoriteCitiesDropdown } from './FavoriteCitiesDropdown';

export function Navbar() {
  const pathname = usePathname(); // Get current path

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/alerts', label: 'Alerts' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Logo */}
        <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center space-x-2.5 group">
                <CloudSun className="h-8 w-8 text-primary transition-transform group-hover:scale-110 drop-shadow-sm" />
                <span className="font-headline text-2xl font-bold text-foreground group-hover:text-primary transition-colors hidden sm:inline-block">
                    Weatherwise
                </span>
            </Link>
        </div>

        {/* Center: Main Nav */}
        <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
                <Button 
                    key={item.href}
                    variant={pathname === item.href ? 'secondary' : 'ghost'} 
                    asChild
                >
                    <Link href={item.href}>{item.label}</Link>
                </Button>
            ))}
        </div>

        {/* Right Side: User Actions */}
        <div className="flex items-center">
            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-2">
              <SignedIn>
                <FavoriteCitiesDropdown />
                <UserButton />
              </SignedIn>
              <SignedOut>
                  <SignInButton mode="modal">
                      <Button variant="outline">Sign In</Button>
                  </SignInButton>
              </SignedOut>
              <div className="ml-2">
                <ThemeToggle />
              </div>
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
                <SheetContent side="right" className="w-full max-w-xs">
                    <div className="flex items-center pb-6 border-b">
                         <Link href="/" className="flex items-center space-x-2.5 group">
                            <CloudSun className="h-7 w-7 text-primary" />
                            <span className="font-headline text-xl font-bold text-foreground">
                                Weatherwise
                            </span>
                        </Link>
                    </div>
                    <nav className="flex flex-col space-y-4 pt-6">
                        {navItems.map((item) => (
                           <SheetClose key={item.href} asChild>
                                <Link 
                                    href={item.href} 
                                    className={cn(
                                        "text-lg font-medium text-muted-foreground transition-colors hover:text-primary",
                                        pathname === item.href && "text-primary"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            </SheetClose>
                        ))}
                         <SignedIn>
                            <SheetClose asChild>
                                <Link
                                    href="/profile"
                                    className={cn(
                                        "text-lg font-medium text-muted-foreground transition-colors hover:text-primary",
                                        pathname === '/profile' && "text-primary"
                                    )}
                                >
                                    Profile
                                </Link>
                            </SheetClose>
                        </SignedIn>
                    </nav>
                    <div className="absolute bottom-6 left-6 right-6 space-y-4">
                        <div className="pt-6 border-t">
                            <SignedOut>
                                <SheetClose asChild>
                                    <SignInButton mode="modal">
                                        <Button variant="outline" className="w-full">Sign In</Button>
                                    </SignInButton>
                                </SheetClose>
                            </SignedOut>
                            <SignedIn>
                                <div className="flex items-center justify-between">
                                    <p className="text-lg font-medium text-foreground">My Account</p>
                                    <div className="flex items-center gap-2">
                                        <FavoriteCitiesDropdown />
                                        <UserButton />
                                    </div>
                                </div>
                            </SignedIn>
                            <div className="flex items-center justify-between mt-6">
                                <p className="text-lg font-medium text-foreground">Theme</p>
                                <ThemeToggle />
                            </div>
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
