
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, User, Bell, Palette, Info, Sun, Moon, Laptop, Thermometer, MapPin, XCircle } from 'lucide-react';
import Link from 'next/link';
import { SignedIn } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUnits, type TemperatureUnit, type WindSpeedUnit } from '@/hooks/useUnits';
import { useDefaultLocation } from '@/hooks/useDefaultLocation';
import { useState } from 'react';
import type { CitySuggestion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { AlertsCitySearch } from '../alerts/AlertsCitySearch';

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

function UnitSettings() {
  const { units, setUnits } = useUnits();

  return (
    <div className="p-3 rounded-lg bg-background/50 shadow-lg border border-border/30">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Thermometer className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Measurement Units</h3>
          <p className="text-xs text-muted-foreground">Select your preferred units for display.</p>
        </div>
      </div>
      <div className="space-y-4 pt-3 border-t border-border/50">
        <div>
          <Label className="text-xs text-muted-foreground font-semibold">Temperature</Label>
          <RadioGroup
            value={units.temperature}
            onValueChange={(value) => setUnits({ temperature: value as TemperatureUnit })}
            className="grid grid-cols-2 gap-2 mt-1"
          >
            <div>
              <RadioGroupItem value="celsius" id="celsius" className="sr-only peer" />
              <Label htmlFor="celsius" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                Celsius (°C)
              </Label>
            </div>
            <div>
              <RadioGroupItem value="fahrenheit" id="fahrenheit" className="sr-only peer" />
              <Label htmlFor="fahrenheit" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                Fahrenheit (°F)
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground font-semibold">Wind Speed</Label>
          <RadioGroup
            value={units.windSpeed}
            onValueChange={(value) => setUnits({ windSpeed: value as WindSpeedUnit })}
            className="grid grid-cols-2 gap-2 mt-1"
          >
            <div>
              <RadioGroupItem value="kmh" id="kmh" className="sr-only peer" />
              <Label htmlFor="kmh" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                km/h
              </Label>
            </div>
            <div>
              <RadioGroupItem value="mph" id="mph" className="sr-only peer" />
              <Label htmlFor="mph" className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 text-sm hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                mph
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
}

function DefaultLocationSettings() {
  const { defaultLocation, setDefaultLocation, clearDefaultLocation } = useDefaultLocation();
  const [searchQuery, setSearchQuery] = useState('');
  // We need a separate state for the selected object because the search query can be manually edited.
  const [selectedCityObject, setSelectedCityObject] = useState<CitySuggestion | null>(null);

  const handleSetDefault = () => {
    if (selectedCityObject) {
      setDefaultLocation(selectedCityObject);
      setSearchQuery('');
      setSelectedCityObject(null);
    }
  };

  const handleSuggestionSelect = (suggestion: CitySuggestion) => {
    // When a suggestion is picked, we set both the text query and the object
    setSearchQuery(suggestion.name);
    setSelectedCityObject(suggestion);
  };
  
  const handleQueryChange = (query: string) => {
    setSearchQuery(query);
    // If the user types, the selected object is no longer valid for submission
    if (selectedCityObject && query !== selectedCityObject.name) {
      setSelectedCityObject(null);
    }
  }

  return (
    <div className="p-3 rounded-lg bg-background/50 shadow-lg border border-border/30">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Default Startup Location</h3>
          <p className="text-xs text-muted-foreground">Set a city to show automatically when you open the app.</p>
        </div>
      </div>
      <div className="space-y-4 pt-3 border-t border-border/50">
        {defaultLocation ? (
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/70">
            <div className="flex flex-col">
              <span className="font-semibold">{defaultLocation.name}</span>
              <span className="text-xs text-muted-foreground">{defaultLocation.country}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 group" onClick={clearDefaultLocation}>
              <XCircle className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
            </Button>
          </div>
        ) : (
          <div>
            <Label htmlFor="default-city-search">Search for a city</Label>
            <AlertsCitySearch
              id="default-city-search"
              name="default-city-search"
              value={searchQuery}
              onValueChange={handleQueryChange}
              onSelectSuggestion={handleSuggestionSelect}
            />
            <Button
              className="mt-3 w-full"
              onClick={handleSetDefault}
              disabled={!selectedCityObject}
            >
              Set "{selectedCityObject?.name || '...'}" as Default
            </Button>
             <p className="text-xs text-muted-foreground mt-1.5 text-center">Select a city from the dropdown to enable the button.</p>
          </div>
        )}
      </div>
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
        <CardContent className="px-6 sm:px-8 pb-8 space-y-8">
            <SignedIn>
              <section>
                <h3 className="text-lg font-medium text-foreground mb-4">Account</h3>
                <div className="space-y-3">
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
                </div>
              </section>
            </SignedIn>
            <section>
                <h3 className="text-lg font-medium text-foreground mb-4">Application</h3>
                <div className="space-y-3">
                    <DefaultLocationSettings />
                    <UnitSettings />
                    <AppearanceSettings />
                    <SettingsLinkItem
                        icon={Info}
                        title="About Weatherwise"
                        description="Learn more about the app and its features."
                        href="/about"
                    />
                </div>
            </section>
        </CardContent>
      </Card>
    </div>
  );
}
