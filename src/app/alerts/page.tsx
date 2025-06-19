
'use client';

import { useActionState, useEffect, useState, useCallback, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { saveAlertPreferencesAction, verifyCodeAction, type SaveAlertsFormState } from './actions';
import type { AlertPreferences } from '@/lib/types';
import { Mail, MapPin, Thermometer, CloudRain, Wind, AlertTriangle, CheckCircle2, Power, Loader2, KeyRound, ShieldCheck } from 'lucide-react';

const LOCAL_STORAGE_PREFS_KEY = 'weatherAlertPrefs';
const LOCAL_STORAGE_VERIFIED_EMAILS_KEY = 'weatherVerifiedEmails';

const initialFormState: AlertPreferences = {
  email: '',
  city: '',
  notifyExtremeTemp: false,
  notifyHeavyRain: false,
  notifyStrongWind: false,
  alertsEnabled: true,
};

const initialSaveActionState: SaveAlertsFormState = {
  message: null,
  error: false,
  alertsCleared: false,
  verificationSentTo: null,
  generatedCode: null,
  needsVerification: false,
  emailVerified: false,
};


function SavePreferencesButton() {
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

function VerifyCodeButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-12 sm:h-14 text-lg sm:text-xl shadow-md hover:shadow-lg transition-shadow bg-accent hover:bg-accent/90 text-accent-foreground" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2.5 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
          Verifying...
        </>
      ) : (
        <>
          <ShieldCheck className="mr-2.5 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7" />
          Verify Code
        </>
      )}
    </Button>
  );
}


export default function AlertsPage() {
  const [formState, setFormState] = useState<AlertPreferences>(initialFormState);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [verifiedEmails, setVerifiedEmails] = useState<Set<string>>(new Set());
  
  const [savePrefsActionState, savePrefsFormAction, isSavePrefsPending] = useActionState(saveAlertPreferencesAction, initialSaveActionState);
  const [verifyCodeActionState, verifyCodeFormAction, isVerifyCodePending] = useActionState(verifyCodeAction, initialSaveActionState);

  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const isCurrentEmailVerified = useMemo(() => {
    return formState.email ? verifiedEmails.has(formState.email) : false;
  }, [formState.email, verifiedEmails]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    try {
      const savedPrefsString = localStorage.getItem(LOCAL_STORAGE_PREFS_KEY);
      if (savedPrefsString) {
        const savedData = JSON.parse(savedPrefsString);
        const newFormState = { ...initialFormState };
        if (savedData && typeof savedData === 'object') {
            newFormState.email = typeof savedData.email === 'string' ? savedData.email : initialFormState.email;
            newFormState.city = typeof savedData.city === 'string' ? savedData.city : initialFormState.city;
            newFormState.alertsEnabled = typeof savedData.alertsEnabled === 'boolean' ? savedData.alertsEnabled : initialFormState.alertsEnabled;
            newFormState.notifyExtremeTemp = typeof savedData.notifyExtremeTemp === 'boolean' ? savedData.notifyExtremeTemp : initialFormState.notifyExtremeTemp;
            newFormState.notifyHeavyRain = typeof savedData.notifyHeavyRain === 'boolean' ? savedData.notifyHeavyRain : initialFormState.notifyHeavyRain;
            newFormState.notifyStrongWind = typeof savedData.notifyStrongWind === 'boolean' ? savedData.notifyStrongWind : initialFormState.notifyStrongWind;
        }
        setFormState(newFormState);
      } else {
        setFormState(initialFormState);
      }

      const savedVerifiedEmailsString = localStorage.getItem(LOCAL_STORAGE_VERIFIED_EMAILS_KEY);
      if (savedVerifiedEmailsString) {
        setVerifiedEmails(new Set(JSON.parse(savedVerifiedEmailsString)));
      }

    } catch (error) {
      console.error("Failed to load preferences or verified emails from localStorage:", error);
      setFormState(initialFormState);
      setVerifiedEmails(new Set());
    }
  }, []);

  useEffect(() => {
    if ((formState.alertsEnabled && formState.email && formState.city) || !formState.alertsEnabled) {
      try {
        localStorage.setItem(LOCAL_STORAGE_PREFS_KEY, JSON.stringify(formState));
      } catch (error) {
        console.error("Failed to save preferences to localStorage:", error);
      }
    }
  }, [formState]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VERIFIED_EMAILS_KEY, JSON.stringify(Array.from(verifiedEmails)));
    } catch (error) {
      console.error("Failed to save verified emails to localStorage:", error);
    }
  }, [verifiedEmails]);
  
  const processActionState = useCallback((state: SaveAlertsFormState, type: 'save' | 'verify') => {
    if (state.message) {
      toast({
        title: state.error ? "Error" : "Success",
        description: state.message,
        variant: state.error ? "destructive" : "default",
      });

      if (state.alertsCleared) {
        localStorage.removeItem(LOCAL_STORAGE_PREFS_KEY);
        setFormState({ ...initialFormState, alertsEnabled: false });
        // Optionally remove email from verified list if alerts are cleared this way
        // if (formState.email) {
        //   setVerifiedEmails(prev => {
        //     const newSet = new Set(prev);
        //     newSet.delete(formState.email);
        //     return newSet;
        //   });
        // }
      }

      if (state.emailVerified && state.verificationSentTo) { // verificationSentTo was the email that got verified
        setVerifiedEmails(prev => new Set(prev).add(state.verificationSentTo!));
        setVerificationCodeInput(''); // Clear code input
      } else if (type === 'verify' && state.emailVerified && formState.email) { // verification happened for current form email
         setVerifiedEmails(prev => new Set(prev).add(formState.email!));
         setVerificationCodeInput('');
      }
    }
  }, [toast, formState.email]);

  useEffect(() => {
    processActionState(savePrefsActionState, 'save');
  }, [savePrefsActionState, processActionState]);

  useEffect(() => {
    processActionState(verifyCodeActionState, 'verify');
  }, [verifyCodeActionState, processActionState]);


  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSwitchChange = useCallback((name: keyof AlertPreferences, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  }, []);

  const showVerificationSection = savePrefsActionState.needsVerification && 
                                 savePrefsActionState.verificationSentTo === formState.email &&
                                 !isCurrentEmailVerified;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30 dark:from-background dark:to-muted/20 py-0">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 flex flex-col items-center overflow-y-auto">
        <Card className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-xl rounded-xl bg-card/90 backdrop-blur-lg border border-primary/20">
          <CardHeader className="text-center items-center pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-5">
            <AlertTriangle className="h-12 w-12 sm:h-14 md:h-16 text-primary mb-3 sm:mb-4 drop-shadow-lg" />
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary">Configure Weather Alerts</CardTitle>
            <CardDescription className="text-base sm:text-lg md:text-xl text-muted-foreground mt-2 sm:mt-2.5 px-4 sm:px-6">
              Get notified about extreme weather conditions. Verify your email to activate.
            </CardDescription>
          </CardHeader>
          
          {/* Main Preferences Form */}
          {!showVerificationSection && (
            <form action={savePrefsFormAction}>
              <input type="hidden" name="isAlreadyVerified" value={isCurrentEmailVerified.toString()} />
              <CardContent className="space-y-6 sm:space-y-7 px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 pb-3 sm:pb-4">
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/60 border border-border/40 shadow-sm">
                  <div className="flex items-center space-x-3 sm:space-x-3.5">
                    <Power className={`h-6 w-6 sm:h-7 sm:w-7 ${formState.alertsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
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
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-100 sm:scale-110"
                  />
                </div>
              
                <div className="space-y-2.5 sm:space-y-3">
                  <Label htmlFor="email" className="text-base sm:text-lg font-medium text-foreground/90 flex items-center">
                    <Mail className="mr-2.5 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" /> Email Address
                    {isCurrentEmailVerified && <ShieldCheck className="ml-2 h-5 w-5 text-green-500" title="Email Verified" />}
                  </Label>
                  <Input 
                    id="email" 
                    name="email" 
                    type="email" 
                    placeholder="you@example.com" 
                    className="h-11 sm:h-12 text-base sm:text-lg"
                    value={formState.email}
                    onChange={handleInputChange}
                    disabled={!formState.alertsEnabled || isSavePrefsPending} 
                  />
                  {savePrefsActionState.fieldErrors?.email && <p className="text-sm text-destructive mt-1.5">{savePrefsActionState.fieldErrors.email.join(', ')}</p>}
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
                    disabled={!formState.alertsEnabled || isSavePrefsPending}
                  />
                  {savePrefsActionState.fieldErrors?.city && <p className="text-sm text-destructive mt-1.5">{savePrefsActionState.fieldErrors.city.join(', ')}</p>}
                </div>

                <div className={`space-y-3.5 sm:space-y-4 pt-4 sm:pt-5 border-t border-border/40 ${!formState.alertsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <h4 className="text-lg sm:text-xl font-semibold text-foreground/90">Notification Conditions:</h4>
                  <AlertOption
                    id="notifyExtremeTemp"
                    name="notifyExtremeTemp"
                    label="Extreme Temperatures"
                    icon={Thermometer}
                    description="Alerts for unusual high or low temperatures."
                    checked={formState.notifyExtremeTemp}
                    onCheckedChange={(checked) => handleSwitchChange('notifyExtremeTemp', checked)}
                    disabled={!formState.alertsEnabled || isSavePrefsPending}
                  />
                  <AlertOption
                    id="notifyHeavyRain"
                    name="notifyHeavyRain"
                    label="Heavy Rain"
                    icon={CloudRain}
                    description="Notifications for significant rainfall events."
                    checked={formState.notifyHeavyRain}
                    onCheckedChange={(checked) => handleSwitchChange('notifyHeavyRain', checked)}
                    disabled={!formState.alertsEnabled || isSavePrefsPending}
                  />
                  <AlertOption
                    id="notifyStrongWind"
                    name="notifyStrongWind"
                    label="Strong Winds"
                    icon={Wind} 
                    description="Alerts for high wind speeds or gusts."
                    checked={formState.notifyStrongWind}
                    onCheckedChange={(checked) => handleSwitchChange('notifyStrongWind', checked)}
                    disabled={!formState.alertsEnabled || isSavePrefsPending}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end p-5 sm:p-6 md:p-7 border-t border-border/40 mt-3 sm:mt-4">
                <SavePreferencesButton />
              </CardFooter>
            </form>
          )}

          {/* Verification Code Form */}
          {showVerificationSection && (
            <form action={verifyCodeFormAction}>
              <input type="hidden" name="email" value={savePrefsActionState.verificationSentTo || ''} />
              <input type="hidden" name="expectedCode" value={savePrefsActionState.generatedCode || ''} />
              {/* Pass through original preferences for final confirmation email */}
              <input type="hidden" name="city" value={formState.city} />
              <input type="hidden" name="notifyExtremeTemp" value={formState.notifyExtremeTemp ? 'on' : 'off'} />
              <input type="hidden" name="notifyHeavyRain" value={formState.notifyHeavyRain ? 'on' : 'off'} />
              <input type="hidden" name="notifyStrongWind" value={formState.notifyStrongWind ? 'on' : 'off'} />

              <CardContent className="space-y-6 sm:space-y-7 px-5 sm:px-6 md:px-8 pt-5 sm:pt-6 pb-3 sm:pb-4">
                <div className="text-center mb-4">
                  <p className="text-lg text-foreground">A verification code was sent to <strong>{savePrefsActionState.verificationSentTo}</strong>.</p>
                  <p className="text-muted-foreground">Please enter it below to activate alerts.</p>
                </div>
                <div className="space-y-2.5 sm:space-y-3">
                  <Label htmlFor="verificationCode" className="text-base sm:text-lg font-medium text-foreground/90 flex items-center">
                    <KeyRound className="mr-2.5 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" /> Verification Code
                  </Label>
                  <Input 
                    id="verificationCode" 
                    name="verificationCode" 
                    type="text" 
                    placeholder="6-digit code" 
                    className="h-11 sm:h-12 text-base sm:text-lg text-center tracking-[0.3em]"
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value)}
                    maxLength={6}
                    disabled={isVerifyCodePending}
                  />
                  {verifyCodeActionState.fieldErrors?.verificationCode && <p className="text-sm text-destructive mt-1.5">{verifyCodeActionState.fieldErrors.verificationCode.join(', ')}</p>}
                  {verifyCodeActionState.error && verifyCodeActionState.message && !verifyCodeActionState.fieldErrors?.verificationCode && <p className="text-sm text-destructive mt-1.5">{verifyCodeActionState.message}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end p-5 sm:p-6 md:p-7 border-t border-border/40 mt-3 sm:mt-4">
                <VerifyCodeButton />
              </CardFooter>
            </form>
          )}
        </Card>
      </main>
      <footer className="py-5 sm:py-6 text-base sm:text-lg text-center text-muted-foreground/80 border-t border-border/60 bg-background/80 backdrop-blur-sm">
        © {currentYear ?? ''} Weatherwise. Alerts powered by OpenWeather & Genkit AI. Email by Nodemailer.
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
    <div className={`flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50 border border-border/30 shadow-sm transition-colors ${disabled ? 'opacity-70' : 'hover:bg-muted/70'}`}>
      <div className="flex items-center space-x-3 sm:space-x-3.5">
        <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${disabled ? 'text-muted-foreground/70' : 'text-primary/90'}`} />
        <div>
          <Label htmlFor={id} className={`text-base sm:text-lg font-medium ${disabled ? 'text-muted-foreground/80' : 'text-foreground'} cursor-pointer`}>
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
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input scale-100 sm:scale-110"
      />
    </div>
  );
}
    
    
