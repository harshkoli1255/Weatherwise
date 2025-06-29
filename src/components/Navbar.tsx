'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { CloudSun, Menu, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FavoriteCitiesDropdown } from './FavoriteCitiesDropdown';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/alerts', label: 'Alerts' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="relative flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Logo */}
        <div className="flex items-center justify-start gap-4">
            <Link href="/" className="flex items-center space-x-2.5 group">
                <CloudSun className="h-8 w-8 text-primary transition-transform group-hover:scale-110 drop-shadow-sm" />
                <span className="font-headline text-2xl font-bold text-foreground group-hover:text-primary transition-colors hidden sm:inline-block">
                    Weatherwise
                </span>
            </Link>
        </div>

        {/* Center: Main Nav */}
        <nav className="hidden md:flex items-center justify-center gap-2 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
                <Button 
                    key={item.href}
                    variant="ghost"
                    asChild
                    className={cn(
                        'text-base font-medium text-muted-foreground transition-colors hover:text-primary',
                        pathname === item.href && 'text-primary'
                    )}
                >
                    <Link href={item.href}>{item.label}</Link>
                </Button>
            ))}
        </nav>

        {/* Right Side: User Actions */}
        <div className="flex items-center justify-end">
            {/* Desktop User Actions */}
            <div className="hidden md:flex items-center gap-x-4">
              <TooltipProvider>
                <SignedIn>
                  <FavoriteCitiesDropdown />
                   <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className={cn(pathname === '/settings' && 'bg-accent text-accent-foreground')}
                        >
                          <Link href="/settings" aria-label="Settings">
                            <Settings className="h-5 w-5" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Settings</p>
                      </TooltipContent>
                    </Tooltip>
                  <UserButton />
                </SignedIn>
                <SignedOut>
                    <SignInButton mode="modal">
                        <Button>Sign In</Button>
                    </SignInButton>
                </SignedOut>
                <ThemeToggle />
              </TooltipProvider>
            </div>

            {/* Mobile navigation menu */}
            <div className="md:hidden">
                <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full max-w-xs p-0">
                    <div className="flex flex-col h-full">
                        <div className="p-6 pb-4 border-b">
                            <Link href="/" className="flex items-center space-x-2.5 group">
                                <CloudSun className="h-7 w-7 text-primary" />
                                <span className="font-headline text-xl font-bold text-foreground">
                                    Weatherwise
                                </span>
                            </Link>
                        </div>
                        <nav className="flex flex-col space-y-2 p-4">
                            {navItems.map((item) => (
                            <SheetClose key={item.href} asChild>
                                <Link 
                                    href={item.href} 
                                    className={cn(
                                        "text-base font-medium text-muted-foreground rounded-md p-3 transition-colors hover:bg-accent hover:text-primary",
                                        pathname === item.href && "bg-accent text-primary"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            </SheetClose>
                            ))}
                            <SignedIn>
                                <SheetClose asChild>
                                    <Link
                                        href="/settings"
                                        className={cn(
                                            "text-base font-medium text-muted-foreground rounded-md p-3 transition-colors hover:bg-accent hover:text-primary",
                                            pathname === '/settings' && "bg-accent text-primary"
                                        )}
                                    >
                                        Settings
                                    </Link>
                                </SheetClose>
                                <SheetClose asChild>
                                    <Link
                                        href="/profile"
                                        className={cn(
                                            "text-base font-medium text-muted-foreground rounded-md p-3 transition-colors hover:bg-accent hover:text-primary",
                                            pathname === '/profile' && "bg-accent text-primary"
                                        )}
                                    >
                                        Profile
                                    </Link>
                                </SheetClose>
                            </SignedIn>
                        </nav>
                        
                        <div className="mt-auto p-6 border-t space-y-6">
                             <SignedIn>
                                <div className="flex items-center justify-between">
                                    <div className="text-base font-medium">My Account</div>
                                    <div className="flex items-center gap-4">
                                        <FavoriteCitiesDropdown />
                                        <UserButton />
                                    </div>
                                </div>
                            </SignedIn>
                            <div className="flex items-center justify-between">
                                <div className="text-base font-medium">Theme</div>
                                <ThemeToggle />
                            </div>
                           <SignedOut>
                                <SheetClose asChild>
                                    <SignInButton mode="modal">
                                        <Button className="w-full">Sign In</Button>
                                    </SignInButton>
                                </SheetClose>
                            </SignedOut>
                        </div>
                    </div>
                </SheetContent>
                </Sheet>
            </div>
        </div>
      </div>
    </header>
  );
}
