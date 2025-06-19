
'use client';

import { useActionState, useEffect, useState, useCallback } from 'react';
import { useFormStatus } from 'react-dom'; // Import useFormStatus
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveAlertPreferencesAction } from './actions';
import type { AlertPreferences } from '@/lib/types';
import { Mail, MapPin, Thermometer, CloudRain, Wind, AlertTriangle, CheckCircle2, Power, Loader2 } from 'lucide-react';

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

// New component for the submit button using useFormStatus
function FormSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-12 sm:h-14 text-lg sm:text-xl shadow-md hover:shadow-lg transition-shadow" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2.5 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2.5 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7" />
          Save Preferences
        </>
      )}
    </Button>
  );
}

export default function AlertsPage() {
  const [formState, setFormState] = useState<AlertPreferences>(initialFormState);
  const [actionState, formAction] = useActionState(saveAlertPreferencesAction, initialActionState);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    try {
      const savedPrefsString = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedPrefsString) {
        const savedData = JSON.parse(savedPrefsString);
        const mergedPrefs = { ...initialFormState, ...savedData };
        setFormState(mergedPrefs);
      } else {
        setFormState(initialFormState);
      }
    } catch (error) {
      console.error("Failed to load preferences from localStorage:", error);
      setFormState(initialFormState);
    }
  }, []);

  useEffect(() => {
    if ( (formState.alertsEnabled && formState.email && formState.city) || !formState.alertsEnabled) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formState));
      } catch (error) {
        console.error("Failed to save preferences to localStorage:", error);
      }
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
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setFormState(prev => ({ ...initialFormState, alertsEnabled: prev.alertsEnabled && false })); // Reset form, keep alertsEnabled state potentially for UI until full reset
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
      <main className="flex-grow container mx-auto px-4 py-10 sm:py-12 md:py-16 lg:py-20 flex flex-col items-center overflow-y-auto">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
          <CardHeader className="text-center items-center pt-8 sm:pt-10 md:pt-12 pb-5 sm:pb-6">
            <AlertTriangle className="h-14 w-14 sm:h-16 md:h-20 text-primary mb-4 sm:mb-5 drop-shadow-lg" />
            <CardTitle className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary">Configure Weather Alerts</CardTitle>
            <CardDescription className="text-lg sm:text-xl text-muted-foreground mt-2.5 sm:mt-3 px-5 sm:px-7">
              Get notified about extreme weather conditions via email.
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-7 sm:space-y-8 px-6 sm:px-7 md:px-10 pt-6 sm:pt-7 pb-4 sm:pb-5">
              <div className="flex items-center justify-between p-4 sm:p-5 rounded-lg bg-muted/60 border border-border/40 shadow-sm">
                <div className="flex items-center space-x-3.5 sm:space-x-4">
                  <Power className={`h-7 w-7 sm:h-8 sm:w-8 ${formState.alertsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <Label htmlFor="alertsEnabled" className="text-lg sm:text-xl font-semibold text-foreground">
                      Enable Weather Alerts
                    </Label>
                    <p className="text-base sm:text-lg text-muted-foreground">Master toggle for all email notifications.</p>
                  </div>
                </div>
                <Switch
                  id="alertsEnabled"
                  name="alertsEnabled"
                  checked={formState.alertsEnabled}
                  onCheckedChange={(checked) => handleSwitchChange('alertsEnabled', checked)}
                  aria-label="Enable Weather Alerts"
                  className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-110 sm:scale-125"
                />
              </div>
            
              <div className="space-y-3 sm:space-y-3.5">
                <Label htmlFor="email" className="text-lg sm:text-xl font-medium text-foreground/90 flex items-center">
                  <Mail className="mr-3 sm:mr-3.5 h-6 w-6 sm:h-7 sm:w-7 text-primary/80" /> Email Address
                </Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  className="h-12 sm:h-14 text-lg sm:text-xl"
                  value={formState.email}
                  onChange={handleInputChange}
                  disabled={!formState.alertsEnabled} 
                />
                {actionState.fieldErrors?.email && <p className="text-base text-destructive mt-2">{actionState.fieldErrors.email.join(', ')}</p>}
              </div>
              <div className="space-y-3 sm:space-y-3.5">
                <Label htmlFor="city" className="text-lg sm:text-xl font-medium text-foreground/90 flex items-center">
                  <MapPin className="mr-3 sm:mr-3.5 h-6 w-6 sm:h-7 sm:w-7 text-primary/80" /> City Name
                </Label>
                <Input 
                  id="city" 
                  name="city" 
                  type="text" 
                  placeholder="E.g., London" 
                  className="h-12 sm:h-14 text-lg sm:text-xl"
                  value={formState.city}
                  onChange={handleInputChange}
                  disabled={!formState.alertsEnabled}
                />
                 {actionState.fieldErrors?.city && <p className="text-base text-destructive mt-2">{actionState.fieldErrors.city.join(', ')}</p>}
              </div>

              <div className={`space-y-4 sm:space-y-5 pt-5 sm:pt-6 border-t border-border/40 ${!formState.alertsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <h4 className="text-xl sm:text-2xl font-semibold text-foreground/90">Notification Conditions:</h4>
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
                  icon={Wind} 
                  description="Alerts for high wind speeds or gusts."
                  checked={formState.notifyStrongWind}
                  onCheckedChange={(checked) => handleSwitchChange('notifyStrongWind', checked)}
                  disabled={!formState.alertsEnabled}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-6 sm:p-7 md:p-8 border-t border-border/40 mt-4 sm:mt-5">
              <FormSubmitButton />
            </CardFooter>
          </form>
        </Card>
      </main>
      <footer className="py-6 sm:py-7 text-lg sm:text-xl text-center text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-sm">
        © {currentYear ?? ''} Weatherwise. Alerts powered by OpenWeather & Genkit AI. Email by Nodemailer.
      </footer>
    </div>
  );
}

interface AlertOptionProps {
  id: keyof AlertPreferences; 
  name: string; 
  label: string;
  icon: React.ElementType;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function AlertOption({ id, name, label, icon: Icon, description, checked, onCheckedChange, disabled }: AlertOptionProps) {
  return (
    <div className={`flex items-center justify-between p-4 sm:p-5 rounded-lg bg-muted/50 border border-border/30 shadow-sm transition-colors ${disabled ? 'opacity-70' : 'hover:bg-muted/70'}`}>
      <div className="flex items-center space-x-3.5 sm:space-x-4">
        <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${disabled ? 'text-muted-foreground/70' : 'text-primary/90'}`} />
        <div>
          <Label htmlFor={id as string} className={`text-lg sm:text-xl font-medium ${disabled ? 'text-muted-foreground/80' : 'text-foreground'}`}>
            {label}
          </Label>
          <p className={`text-base sm:text-lg ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{description}</p>
        </div>
      </div>
      <Switch 
        id={id as string} 
        name={name} 
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-110 sm:scale-125"
      />
    </div>
  );
}

    