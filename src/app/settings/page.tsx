
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
      <div className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-muted/80 transition-colors duration-300 shadow-lg border border-border/30 hover:border-primary/50">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
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
        <div className="p-4 rounded-lg bg-background/50 shadow-lg border border-border/30">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Palette className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Appearance</h3>
                    <p className="text-sm text-muted-foreground">Choose how Weatherwise looks and feels.</p>
                </div>
            </div>
            <RadioGroup 
                defaultValue={theme} 
                onValueChange={setTheme}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border/50"
            >
                <div className="relative">
                    <RadioGroupItem value="light" id="light" className="sr-only peer" />
                    <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Sun className="mb-3 h-6 w-6" />
                        Light
                    </Label>
                </div>
                <div className="relative">
                    <RadioGroupItem value="dark" id="dark" className="sr-only peer" />
                    <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Moon className="mb-3 h-6 w-6" />
                        Dark
                    </Label>
                </div>
                <div className="relative">
                    <RadioGroupItem value="system" id="system" className="sr-only peer" />
                    <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Laptop className="mb-3 h-6 w-6" />
                        System
                    </Label>
                </div>
            </RadioGroup>
        </div>
    );
}


export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
      <Card className="w-full max-w-2xl mx-auto bg-glass border-primary/20 shadow-2xl rounded-2xl">
        <CardHeader className="text-center items-center pt-8 pb-4">
          <CardTitle className="text-3xl sm:text-4xl font-headline font-bold text-primary">
            Settings
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            Manage your account, preferences, and application settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8 space-y-4">
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
