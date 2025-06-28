'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, User, Bell, Palette, Info, Sun, Moon, Laptop } from 'lucide-react';
import Link from 'next/link';
import { SignedIn } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface SettingsItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}

function SettingsLinkItem({ icon: Icon, title, description, href }: SettingsItemProps) {
  return (
    <Link href={href} className="block group">
      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-muted/80 transition-colors duration-300 shadow-lg border border-border/30 hover:border-primary/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function AppearanceSettings() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="p-3 rounded-lg bg-background/50 shadow-lg border border-border/30">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground text-sm">Appearance</h3>
                    <p className="text-xs text-muted-foreground">Choose how Weatherwise looks and feels.</p>
                </div>
            </div>
            <RadioGroup 
                defaultValue={theme} 
                onValueChange={setTheme}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3 border-t border-border/50"
            >
                <div className="relative">
                    <RadioGroupItem value="light" id="light" className="sr-only peer" />
                    <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Sun className="mb-2 h-5 w-5" />
                        <span className="text-xs">Light</span>
                    </Label>
                </div>
                <div className="relative">
                    <RadioGroupItem value="dark" id="dark" className="sr-only peer" />
                    <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Moon className="mb-2 h-5 w-5" />
                        <span className="text-xs">Dark</span>
                    </Label>
                </div>
                <div className="relative">
                    <RadioGroupItem value="system" id="system" className="sr-only peer" />
                    <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Laptop className="mb-2 h-5 w-5" />
                        <span className="text-xs">System</span>
                    </Label>
                </div>
            </RadioGroup>
        </div>
    );
}


export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10">
      <Card className="w-full max-w-2xl mx-auto bg-glass border-primary/20 shadow-2xl rounded-xl">
        <CardHeader className="text-center items-center pt-8 pb-4">
          <CardTitle className="text-2xl sm:text-3xl font-headline font-bold text-primary">
            Settings
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2">
            Manage your account, preferences, and application settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8 space-y-3">
            <SignedIn>
                <SettingsLinkItem
                    icon={User}
                    title="Profile"
                    description="Update your personal details and security."
                    href="/profile"
                />
                <SettingsLinkItem
                    icon={Bell}
                    title="Alerts & Notifications"
                    description="Set up and customize your email weather alerts."
                    href="/alerts"
                />
            </SignedIn>
            <AppearanceSettings />
            <SettingsLinkItem
                icon={Info}
                title="About Weatherwise"
                description="Learn more about the app and its features."
                href="/about"
            />
        </CardContent>
      </Card>
    </div>
  );
}
