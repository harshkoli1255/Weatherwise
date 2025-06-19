
'use client';

import { useActionState, useEffect, useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveAlertPreferencesAction } from './actions';
import type { AlertPreferences } from '@/lib/types';
import { Mail, MapPin, Thermometer, CloudRain, WindIcon, AlertTriangle, CheckCircle2, Power } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'weatherAlertPrefs';

const initialFormState: AlertPreferences = {
  email: '',
  city: '',
  notifyExtremeTemp: false,
  notifyHeavyRain: false,
  notifyStrongWind: false,
  alertsEnabled: true,
};

const initialActionState: {
  message: string | null;
  error: boolean;
  fieldErrors?: Partial<Record<keyof AlertPreferences, string[] | undefined>>;
  alertsCleared?: boolean;
} = {
  message: null,
  error: false,
  alertsCleared: false,
};

export default function AlertsPage() {
  const [formState, setFormState] = useState<AlertPreferences>(initialFormState);
  const [actionState, formAction] = useActionState(saveAlertPreferencesAction, initialActionState);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    // Load preferences from localStorage on mount
    try {
      const savedPrefsString = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedPrefsString) {
        const savedPrefs = JSON.parse(savedPrefsString) as AlertPreferences;
        setFormState(savedPrefs);
      }
    } catch (error) {
      console.error("Failed to load preferences from localStorage:", error);
    }
  }, []);

  useEffect(() => {
    // Save preferences to localStorage whenever they change
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formState));
    } catch (error) {
      console.error("Failed to save preferences to localStorage:", error);
    }
  }, [formState]);

  useEffect(() => {
    if (actionState.message) {
      toast({
        title: actionState.error ? "Error" : "Success",
        description: actionState.message,
        variant: actionState.error ? "destructive" : "default",
      });
      if (actionState.alertsCleared) {
        // Clear local storage and reset form if server confirmed clearing
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setFormState(initialFormState); // Reset form to default (alerts enabled, fields empty)
      }
    }
  }, [actionState, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSwitchChange = useCallback((name: keyof AlertPreferences, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  }, []);


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 sm:px-6 sm:py-12 md:py-16 flex flex-col items-center">
        <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
          <CardHeader className="text-center items-center pt-5 sm:pt-6 md:pt-8 pb-4 sm:pb-5">
            <AlertTriangle className="h-10 w-10 sm:h-12 md:h-14 text-primary mb-2 sm:mb-3 drop-shadow-lg" />
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-headline font-bold text-primary">Configure Weather Alerts</CardTitle>
            <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1.5 sm:mt-2 px-3 sm:px-4">
              Get notified about extreme weather conditions via email.
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-5 sm:space-y-6 px-5 sm:px-6 md:px-8 pt-4 sm:pt-5 pb-2 sm:pb-3">
              <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/60 border border-border/40 shadow-sm">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Power className={`h-5 w-5 sm:h-6 sm:w-6 ${formState.alertsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <Label htmlFor="alertsEnabled" className="text-sm sm:text-base font-semibold text-foreground">
                      Enable Weather Alerts
                    </Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">Master toggle for all email notifications.</p>
                  </div>
                </div>
                <Switch
                  id="alertsEnabled"
                  name="alertsEnabled"
                  checked={formState.alertsEnabled}
                  onCheckedChange={(checked) => handleSwitchChange('alertsEnabled', checked)}
                  aria-label="Enable Weather Alerts"
                />
              </div>
            
              <div className="space-y-2 sm:space-y-2.5">
                <Label htmlFor="email" className="text-sm sm:text-base font-medium text-foreground/90 flex items-center">
                  <Mail className="mr-2 sm:mr-2.5 h-4 w-4 sm:h-5 sm:w-5 text-primary/80" /> Email Address
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  className="h-10 sm:h-11 text-sm sm:text-base"
                  value={formState.email}
                  onChange={handleInputChange}
                  disabled={!formState.alertsEnabled} 
                />
                {actionState.fieldErrors?.email && <p className="text-xs text-destructive mt-1">{actionState.fieldErrors.email.join(', ')}</p>}
              </div>
              <div className="space-y-2 sm:space-y-2.5">
                <Label htmlFor="city" className="text-sm sm:text-base font-medium text-foreground/90 flex items-center">
                  <MapPin className="mr-2 sm:mr-2.5 h-4 w-4 sm:h-5 sm:w-5 text-primary/80" /> City Name
                </Label>
                <Input 
                  id="city" 
                  name="city" 
                  type="text" 
                  placeholder="E.g., London" 
                  className="h-10 sm:h-11 text-sm sm:text-base"
                  value={formState.city}
                  onChange={handleInputChange}
                  disabled={!formState.alertsEnabled}
                />
                 {actionState.fieldErrors?.city && <p className="text-xs text-destructive mt-1">{actionState.fieldErrors.city.join(', ')}</p>}
              </div>

              <div className={`space-y-3 sm:space-y-3.5 pt-3 sm:pt-4 border-t border-border/40 ${!formState.alertsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <h4 className="text-base sm:text-lg font-semibold text-foreground/90">Notification Conditions:</h4>
                <AlertOption
                  id="notifyExtremeTemp"
                  name="notifyExtremeTemp"
                  label="Extreme Temperatures"
                  icon={Thermometer}
                  description="Alerts for unusual high or low temperatures."
                  checked={formState.notifyExtremeTemp}
                  onCheckedChange={(checked) => handleSwitchChange('notifyExtremeTemp', checked)}
                  disabled={!formState.alertsEnabled}
                />
                <AlertOption
                  id="notifyHeavyRain"
                  name="notifyHeavyRain"
                  label="Heavy Rain"
                  icon={CloudRain}
                  description="Notifications for significant rainfall events."
                  checked={formState.notifyHeavyRain}
                  onCheckedChange={(checked) => handleSwitchChange('notifyHeavyRain', checked)}
                   disabled={!formState.alertsEnabled}
                />
                <AlertOption
                  id="notifyStrongWind"
                  name="notifyStrongWind"
                  label="Strong Winds"
                  icon={WindIcon}
                  description="Alerts for high wind speeds or gusts."
                  checked={formState.notifyStrongWind}
                  onCheckedChange={(checked) => handleSwitchChange('notifyStrongWind', checked)}
                  disabled={!formState.alertsEnabled}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-4 sm:p-5 md:p-6 border-t border-border/40 mt-2 sm:mt-3">
              <Button type="submit" size="lg" className="h-11 sm:h-12 text-base sm:text-lg shadow-md hover:shadow-lg transition-shadow">
                <CheckCircle2 className="mr-2 sm:mr-2.5 h-5 w-5 sm:h-6 sm:w-6" /> Save Preferences
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      <footer className="py-4 sm:py-5 text-sm sm:text-base text-center text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-sm">
        © {currentYear ?? ''} Weatherwise. Alerts powered by OpenWeather & Genkit AI. Email by Nodemailer.
      </footer>
    </div>
  );
}

interface AlertOptionProps {
  id: keyof AlertPreferences;
  name: keyof AlertPreferences;
  label: string;
  icon: React.ElementType;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function AlertOption({ id, name, label, icon: Icon, description, checked, onCheckedChange, disabled }: AlertOptionProps) {
  return (
    <div className={`flex items-center justify-between p-3 sm:p-3.5 rounded-lg bg-muted/50 border border-border/30 shadow-sm transition-colors ${disabled ? 'opacity-70' : 'hover:bg-muted/70'}`}>
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${disabled ? 'text-muted-foreground/70' : 'text-primary/90'}`} />
        <div>
          <Label htmlFor={id} className={`text-sm sm:text-base font-medium ${disabled ? 'text-muted-foreground/80' : 'text-foreground'}`}>
            {label}
          </Label>
          <p className={`text-xs sm:text-sm ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{description}</p>
        </div>
      </div>
      <Switch 
        id={id} 
        name={name} 
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label} 
      />
    </div>
  );
}
