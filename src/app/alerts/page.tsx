
'use client';

import { useActionState, useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveAlertPreferencesAction } from './actions';
import { Mail, MapPin, Thermometer, CloudRain, WindIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';

const initialState: {
  message: string | null;
  error: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
} = {
  message: null,
  error: false,
};

export default function AlertsPage() {
  const [state, formAction] = useActionState(saveAlertPreferencesAction, initialState);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.error ? "Error" : "Success",
        description: state.message,
        variant: state.error ? "destructive" : "default",
      });
    }
  }, [state, toast]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col items-center">
        <Card className="w-full max-w-lg shadow-xl rounded-xl bg-card/80 backdrop-blur-lg border border-primary/20">
          <CardHeader className="text-center items-center pt-6 pb-4">
            <AlertTriangle className="h-10 w-10 text-primary mb-2 drop-shadow-lg" />
            <CardTitle className="text-xl sm:text-2xl font-headline font-bold text-primary">Configure Weather Alerts</CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1 px-4">
              Get notified about extreme weather conditions.
              <br />
              <span className="text-xs text-muted-foreground/70">(Email sending is a backend feature.)</span>
            </CardDescription>
          </CardHeader>
          <form action={formAction}>
            <CardContent className="space-y-5 px-5 sm:px-6 pt-4 pb-2">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/90 flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-primary/80" /> Email Address
                </Label>
                <Input id="email" name="email" type="email" placeholder="you@example.com" required className="h-11 text-sm" />
                {state.fieldErrors?.email && <p className="text-xs text-destructive mt-1">{state.fieldErrors.email.join(', ')}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="city" className="text-sm font-medium text-foreground/90 flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-primary/80" /> City Name
                </Label>
                <Input id="city" name="city" type="text" placeholder="E.g., London" required className="h-11 text-sm" />
                 {state.fieldErrors?.city && <p className="text-xs text-destructive mt-1">{state.fieldErrors.city.join(', ')}</p>}
              </div>

              <div className="space-y-3 pt-3 border-t border-border/30">
                <h4 className="text-base font-semibold text-foreground/90">Notification Preferences:</h4>
                <AlertOption
                  id="notifyExtremeTemp"
                  name="notifyExtremeTemp"
                  label="Extreme Temperatures"
                  icon={Thermometer}
                  description="Alerts for unusual temperatures."
                />
                <AlertOption
                  id="notifyHeavyRain"
                  name="notifyHeavyRain"
                  label="Heavy Rain"
                  icon={CloudRain}
                  description="Notifications for significant rainfall."
                />
                <AlertOption
                  id="notifyStrongWind"
                  name="notifyStrongWind"
                  label="Strong Winds"
                  icon={WindIcon}
                  description="Alerts for high wind speeds."
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-4 sm:p-5 border-t border-border/30 mt-2">
              <Button type="submit" size="lg" className="h-11 shadow-md hover:shadow-lg transition-shadow">
                <CheckCircle2 className="mr-2 h-5 w-5" /> Save Preferences
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground/80 border-t border-border/50 bg-background/70 backdrop-blur-sm">
        © {currentYear ?? ''} Weatherwise. Powered by OpenWeather and Genkit AI.
      </footer>
    </div>
  );
}

interface AlertOptionProps {
  id: string;
  name: string;
  label: string;
  icon: React.ElementType;
  description: string;
}

function AlertOption({ id, name, label, icon: Icon, description }: AlertOptionProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/30 shadow-sm hover:bg-muted/70 transition-colors">
      <div className="flex items-center space-x-2.5">
        <Icon className="h-5 w-5 text-primary/90" />
        <div>
          <Label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} name={name} aria-label={label} />
    </div>
  );
}
