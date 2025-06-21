
'use client';

import { useActionState, useEffect, useState, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
import { useUser } from '@clerk/nextjs';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveAlertPreferencesAction, sendTestEmailAction, type SaveAlertsFormState } from './actions';
import type { AlertPreferences } from '@/lib/types';
import { Mail, MapPin, Thermometer, CloudRain, Wind, AlertTriangle, CheckCircle2, Power, Loader2, Send, Info, UserCheck } from 'lucide-react';

const LOCAL_STORAGE_PREFS_KEY_PREFIX = 'weatherAlertPrefs_';

const initialFormState: Omit<AlertPreferences, 'email'> = {
  city: '',
  alertsEnabled: true,
  notifyExtremeTemp: false,
  highTempThreshold: undefined,
  lowTempThreshold: undefined,
  notifyHeavyRain: false,
  notifyStrongWind: false,
  windSpeedThreshold: undefined,
};

const initialSaveActionState: SaveAlertsFormState = {
  message: null,
  error: false,
  alertsCleared: false,
};

const initialTestEmailActionState: { message: string | null, error: boolean } = {
  message: null,
  error: false,
};

const DEFAULT_DISPLAY_HIGH_TEMP = 32;
const DEFAULT_DISPLAY_LOW_TEMP = 5;
const DEFAULT_DISPLAY_WIND_SPEED = 35;


function SavePreferencesButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full sm:flex-1 h-11 px-4 text-base sm:h-12 sm:px-6 sm:text-lg shadow-md hover:shadow-lg transition-shadow font-semibold"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          Save Preferences
        </>
      )}
    </Button>
  );
}

function SendTestEmailButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full h-11 px-4 text-base sm:h-12 sm:px-6 sm:text-lg shadow-md hover:shadow-lg transition-shadow font-medium"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          Sending Test...
        </>
      ) : (
        <>
          <Send className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
          Send Test Alert
        </>
      )}
    </Button>
  );
}


export default function AlertsPage() {
  const { user, isLoaded } = useUser();
  const [formState, setFormState] = useState(initialFormState);
  const [email, setEmail] = useState('');

  const [savePrefsActionState, savePrefsFormAction, isSavePrefsPending] = useActionState(saveAlertPreferencesAction, initialSaveActionState);
  const [testEmailActionState, testEmailFormAction, isTestEmailPending] = useActionState(sendTestEmailAction, initialTestEmailActionState);

  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Effect to load preferences from localStorage when user is loaded
  useEffect(() => {
    if (isLoaded && user) {
      const primaryEmail = user.primaryEmailAddress?.emailAddress ?? '';
      setEmail(primaryEmail);
      
      const storageKey = `${LOCAL_STORAGE_PREFS_KEY_PREFIX}${user.id}`;
      try {
        const savedPrefsString = localStorage.getItem(storageKey);
        if (savedPrefsString) {
          const savedData = JSON.parse(savedPrefsString);
          if (savedData && typeof savedData === 'object') {
             setFormState({
              city: typeof savedData.city === 'string' ? savedData.city : initialFormState.city,
              alertsEnabled: typeof savedData.alertsEnabled === 'boolean' ? savedData.alertsEnabled : initialFormState.alertsEnabled,
              notifyExtremeTemp: typeof savedData.notifyExtremeTemp === 'boolean' ? savedData.notifyExtremeTemp : initialFormState.notifyExtremeTemp,
              highTempThreshold: typeof savedData.highTempThreshold === 'number' ? savedData.highTempThreshold : initialFormState.highTempThreshold,
              lowTempThreshold: typeof savedData.lowTempThreshold === 'number' ? savedData.lowTempThreshold : initialFormState.lowTempThreshold,
              notifyHeavyRain: typeof savedData.notifyHeavyRain === 'boolean' ? savedData.notifyHeavyRain : initialFormState.notifyHeavyRain,
              notifyStrongWind: typeof savedData.notifyStrongWind === 'boolean' ? savedData.notifyStrongWind : initialFormState.notifyStrongWind,
              windSpeedThreshold: typeof savedData.windSpeedThreshold === 'number' ? savedData.windSpeedThreshold : initialFormState.windSpeedThreshold,
            });
          }
        }
      } catch (error) {
        console.error("Failed to load preferences from localStorage:", error);
        setFormState(initialFormState);
      }
    }
  }, [user, isLoaded]);

  // Effect to save preferences to localStorage on change
  useEffect(() => {
    if (user) {
      const storageKey = `${LOCAL_STORAGE_PREFS_KEY_PREFIX}${user.id}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(formState));
      } catch (error) {
        console.error("Failed to save preferences to localStorage:", error);
      }
    }
  }, [formState, user]);

  const processMainActionState = useCallback((state: SaveAlertsFormState) => {
    if (state.message) {
      toast({
        title: state.error ? "Error" : "Success",
        description: state.message,
        variant: state.error ? "destructive" : "default",
        duration: state.error ? 6000 : 5000,
      });

      if (state.alertsCleared) {
        setFormState(prev => ({
            ...initialFormState,
            alertsEnabled: false,
            city: ''
        }));
      }
    }
  }, [toast]);


  useEffect(() => {
    processMainActionState(savePrefsActionState);
  }, [savePrefsActionState, processMainActionState]);

  useEffect(() => {
    if (testEmailActionState.message) {
      toast({
        title: testEmailActionState.error ? "Error" : "Test Email",
        description: testEmailActionState.message,
        variant: testEmailActionState.error ? "destructive" : "default",
      });
    }
  }, [testEmailActionState, toast]);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
    }));
  }, []);

  const handleSwitchChange = useCallback((name: keyof AlertPreferences, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  }, []);

  const isAnyActionPending = isSavePrefsPending || isTestEmailPending;

  if (!isLoaded) {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20 py-0">
          <Navbar />
          <div className="flex-grow flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20 py-0">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 flex flex-col items-center overflow-y-auto">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
          <CardHeader className="text-center items-center pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-5">
            <AlertTriangle className="h-14 w-14 sm:h-16 md:h-20 text-primary mb-3 sm:mb-4 drop-shadow-lg" />
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary">Configure Weather Alerts</CardTitle>
            <CardDescription className="text-base sm:text-lg md:text-xl text-muted-foreground mt-2 sm:mt-2.5 px-4 sm:px-6">
              You are signed in. Your preferences are saved to your account and device.
            </CardDescription>
          </CardHeader>
            <form id="mainAlertForm" action={savePrefsFormAction}>
              <CardContent className="space-y-6 sm:space-y-7 px-5 sm:px-7 md:px-10 pt-5 sm:pt-6 pb-3 sm:pb-4">
                <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-lg bg-muted/60 border border-border/40 shadow-sm">
                  <div className="flex items-center space-x-3 sm:space-x-3.5">
                    <Power className={`h-7 w-7 sm:h-8 sm:w-8 ${formState.alertsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <Label htmlFor="alertsEnabled" className="text-base sm:text-lg font-semibold text-foreground">
                        Enable Weather Alerts
                      </Label>
                      <p className="text-sm sm:text-base text-muted-foreground">Master toggle for all email notifications.</p>
                    </div>
                  </div>
                  <Switch
                    id="alertsEnabled"
                    name="alertsEnabled"
                    checked={formState.alertsEnabled}
                    onCheckedChange={(checked) => handleSwitchChange('alertsEnabled', checked)}
                    aria-label="Enable Weather Alerts"
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-105 sm:scale-110"
                    disabled={isAnyActionPending}
                  />
                </div>

                <div className="space-y-2.5 sm:space-y-3">
                  <Label htmlFor="email" className="text-base sm:text-lg font-medium text-foreground/90 flex items-center">
                    <UserCheck className="mr-2.5 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" /> Logged-in Email
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Loading your email..."
                      className="flex-grow h-11 sm:h-12 text-base sm:text-lg bg-muted/70"
                      value={email}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  <Label htmlFor="city" className="text-base sm:text-lg font-medium text-foreground/90 flex items-center">
                    <MapPin className="mr-2.5 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" /> City Name
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="E.g., London"
                    className="h-11 sm:h-12 text-base sm:text-lg"
                    value={formState.city}
                    onChange={handleInputChange}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  />
                  {savePrefsActionState.fieldErrors?.city && <p className="text-sm text-destructive mt-1.5">{savePrefsActionState.fieldErrors.city.join(', ')}</p>}
                </div>

                <div className={`space-y-4 sm:space-y-5 pt-4 sm:pt-5 border-t border-border/50 ${!formState.alertsEnabled || isAnyActionPending ? 'opacity-60 pointer-events-none' : ''}`}>
                  <h4 className="text-lg sm:text-xl font-headline font-semibold text-foreground/90">Notification Conditions & Thresholds:</h4>
                  <AlertOptionWithThresholds
                    id="notifyExtremeTemp"
                    name="notifyExtremeTemp"
                    label="Extreme Temperatures"
                    icon={Thermometer}
                    description="Alerts for high or low temperatures."
                    checked={formState.notifyExtremeTemp}
                    onCheckedChange={(checked) => handleSwitchChange('notifyExtremeTemp', checked)}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  >
                    {formState.notifyExtremeTemp && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 mt-3.5 sm:mt-4 pl-9 sm:pl-11">
                        <div>
                          <Label htmlFor="highTempThreshold" className="text-sm font-medium text-foreground/80">High Temp. Threshold (°C)</Label>
                          <Input
                            type="number"
                            id="highTempThreshold"
                            name="highTempThreshold"
                            value={formState.highTempThreshold === undefined ? '' : formState.highTempThreshold}
                            placeholder={`${DEFAULT_DISPLAY_HIGH_TEMP}`}
                            onChange={handleInputChange}
                            className="h-10 text-base mt-1.5"
                            disabled={!formState.alertsEnabled || isAnyActionPending}
                          />
                           {savePrefsActionState.fieldErrors?.highTempThreshold && <p className="text-xs text-destructive mt-1">{savePrefsActionState.fieldErrors.highTempThreshold.join(', ')}</p>}
                        </div>
                        <div>
                          <Label htmlFor="lowTempThreshold" className="text-sm font-medium text-foreground/80">Low Temp. Threshold (°C)</Label>
                          <Input
                            type="number"
                            id="lowTempThreshold"
                            name="lowTempThreshold"
                            value={formState.lowTempThreshold === undefined ? '' : formState.lowTempThreshold}
                            placeholder={`${DEFAULT_DISPLAY_LOW_TEMP}`}
                            onChange={handleInputChange}
                            className="h-10 text-base mt-1.5"
                            disabled={!formState.alertsEnabled || isAnyActionPending}
                           />
                           {savePrefsActionState.fieldErrors?.lowTempThreshold && <p className="text-xs text-destructive mt-1">{savePrefsActionState.fieldErrors.lowTempThreshold.join(', ')}</p>}
                        </div>
                      </div>
                    )}
                  </AlertOptionWithThresholds>

                  <AlertOption
                    id="notifyHeavyRain"
                    name="notifyHeavyRain"
                    label="Heavy Rain"
                    icon={CloudRain}
                    description="Based on intensity description from weather service."
                    checked={formState.notifyHeavyRain}
                    onCheckedChange={(checked) => handleSwitchChange('notifyHeavyRain', checked)}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  />
                   {formState.notifyHeavyRain && (
                      <div className="pl-9 sm:pl-11 mt-1.5 text-xs text-muted-foreground flex items-center">
                        <Info className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" /> Note: Rain alert is based on description (e.g., "heavy rain").
                      </div>
                    )}

                  <AlertOptionWithThresholds
                    id="notifyStrongWind"
                    name="notifyStrongWind"
                    label="Strong Winds"
                    icon={Wind}
                    description="Alerts for high wind speeds."
                    checked={formState.notifyStrongWind}
                    onCheckedChange={(checked) => handleSwitchChange('notifyStrongWind', checked)}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  >
                    {formState.notifyStrongWind && (
                      <div className="mt-3.5 sm:mt-4 pl-9 sm:pl-11">
                        <Label htmlFor="windSpeedThreshold" className="text-sm font-medium text-foreground/80">Wind Speed Threshold (km/h)</Label>
                        <Input
                          type="number"
                          id="windSpeedThreshold"
                          name="windSpeedThreshold"
                          value={formState.windSpeedThreshold === undefined ? '' : formState.windSpeedThreshold}
                          placeholder={`${DEFAULT_DISPLAY_WIND_SPEED}`}
                          onChange={handleInputChange}
                          className="h-10 text-base mt-1.5"
                          disabled={!formState.alertsEnabled || isAnyActionPending}
                        />
                        {savePrefsActionState.fieldErrors?.windSpeedThreshold && <p className="text-xs text-destructive mt-1">{savePrefsActionState.fieldErrors.windSpeedThreshold.join(', ')}</p>}
                      </div>
                    )}
                  </AlertOptionWithThresholds>
                </div>
                {/* Hidden inputs to ensure values are sent even when toggles are off */}
                {!formState.notifyExtremeTemp && (
                    <>
                        <input type="hidden" name="highTempThreshold" value={formState.highTempThreshold === undefined ? '' : String(formState.highTempThreshold)} />
                        <input type="hidden" name="lowTempThreshold" value={formState.lowTempThreshold === undefined ? '' : String(formState.lowTempThreshold)} />
                    </>
                )}
                {!formState.notifyStrongWind && (
                    <input type="hidden" name="windSpeedThreshold" value={formState.windSpeedThreshold === undefined ? '' : String(formState.windSpeedThreshold)} />
                )}
              </CardContent>
              <CardFooter className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-4 p-5 sm:p-6 md:p-7 border-t border-border/50 mt-3 sm:mt-4">
                  {email && formState.city && formState.alertsEnabled && (
                    <form action={testEmailFormAction} className="w-full sm:flex-1">
                        <input type="hidden" name="city" value={formState.city} />
                        <input type="hidden" name="highTempThreshold" value={formState.highTempThreshold === undefined ? '' : String(formState.highTempThreshold)} />
                        <input type="hidden" name="lowTempThreshold" value={formState.lowTempThreshold === undefined ? '' : String(formState.lowTempThreshold)} />
                        <input type="hidden" name="windSpeedThreshold" value={formState.windSpeedThreshold === undefined ? '' : String(formState.windSpeedThreshold)} />
                        <SendTestEmailButton />
                    </form>
                  )}
                  <SavePreferencesButton/>
              </CardFooter>
            </form>
        </Card>
      </main>
      <footer className="py-5 sm:py-6 text-base sm:text-lg text-center text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-sm">
        © {currentYear ?? new Date().getFullYear()} Weatherwise. Alerts powered by OpenWeather & Genkit AI. Email by Nodemailer.
      </footer>
    </div>
  );
}

interface AlertOptionProps {
  id: Extract<keyof AlertPreferences, `notify${string}`>;
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
    <div className={`p-3.5 sm:p-4 rounded-lg bg-muted/50 border border-border/30 shadow-sm transition-colors ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-muted/80'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 sm:space-x-3.5">
          <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${disabled ? 'text-muted-foreground/70' : 'text-primary/90'}`} />
          <div>
            <Label htmlFor={id} className={`text-base sm:text-lg font-medium ${disabled ? 'text-muted-foreground/80' : 'text-foreground'} ${disabled ? 'cursor-not-allowed': 'cursor-pointer'}`}>
              {label}
            </Label>
            <p className={`text-sm sm:text-base ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{description}</p>
          </div>
        </div>
        <Switch
          id={id}
          name={name}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={label}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-105 sm:scale-110"
        />
      </div>
    </div>
  );
}

interface AlertOptionWithThresholdsProps extends AlertOptionProps {
  children?: React.ReactNode;
}

function AlertOptionWithThresholds({ id, name, label, icon: Icon, description, checked, onCheckedChange, disabled, children }: AlertOptionWithThresholdsProps) {
  return (
    <div className={`p-3.5 sm:p-4 rounded-lg bg-muted/50 border border-border/30 shadow-sm transition-all duration-300 ease-in-out ${disabled ? 'opacity-70 cursor-not-allowed' : 'hover:bg-muted/80'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 sm:space-x-3.5">
          <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${disabled ? 'text-muted-foreground/70' : 'text-primary/90'}`} />
          <div>
            <Label htmlFor={id} className={`text-base sm:text-lg font-medium ${disabled ? 'text-muted-foreground/80' : 'text-foreground'} ${disabled ? 'cursor-not-allowed': 'cursor-pointer'}`}>
              {label}
            </Label>
            <p className={`text-sm sm:text-base ${disabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{description}</p>
          </div>
        </div>
        <Switch
          id={id}
          name={name}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={label}
          className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-105 sm:scale-110"
        />
      </div>
      {checked && !disabled && children && (
        <div className="mt-3.5 sm:mt-4 border-t border-border/40 pt-3.5 sm:pt-4">
          {children}
        </div>
      )}
    </div>
  );
}
