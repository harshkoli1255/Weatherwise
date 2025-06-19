
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
import { saveAlertPreferencesAction, verifyCodeAction, sendTestEmailAction, type SaveAlertsFormState } from './actions';
import type { AlertPreferences } from '@/lib/types';
import { Mail, MapPin, Thermometer, CloudRain, Wind, AlertTriangle, CheckCircle2, Power, Loader2, KeyRound, ShieldCheck, Pencil, Send } from 'lucide-react';

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
  verifiedEmailOnSuccess: null,
};

const initialTestEmailActionState: { message: string | null, error: boolean } = {
  message: null,
  error: false,
};


function SavePreferencesButton({ form }: { form?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full sm:w-auto h-12 sm:h-14 text-lg sm:text-xl shadow-md hover:shadow-lg transition-shadow" disabled={pending} form={form}>
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

function SendTestEmailButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" className="w-full sm:w-auto h-12 sm:h-14 text-lg sm:text-xl shadow-md hover:shadow-lg transition-shadow" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2.5 sm:mr-3 h-6 w-6 sm:h-7 sm:w-7 animate-spin" />
          Sending Test...
        </>
      ) : (
        <>
          <Send className="mr-2.5 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6" />
          Send Test Alert
        </>
      )}
    </Button>
  );
}


export default function AlertsPage() {
  const [formState, setFormState] = useState<AlertPreferences>(initialFormState);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [verifiedEmails, setVerifiedEmails] = useState<Set<string>>(new Set());
  const [isEmailLocked, setIsEmailLocked] = useState(true);
  
  const [savePrefsActionState, savePrefsFormAction, isSavePrefsPending] = useActionState(saveAlertPreferencesAction, initialSaveActionState);
  const [verifyCodeActionState, verifyCodeFormAction, isVerifyCodePending] = useActionState(verifyCodeAction, initialSaveActionState); // verifyCodeAction uses SaveAlertsFormState for its return
  const [testEmailActionState, testEmailFormAction, isTestEmailPending] = useActionState(sendTestEmailAction, initialTestEmailActionState);

  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const isCurrentEmailVerified = useMemo(() => {
    return formState.email ? verifiedEmails.has(formState.email.toLowerCase()) : false;
  }, [formState.email, verifiedEmails]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
    try {
      const savedPrefsString = localStorage.getItem(LOCAL_STORAGE_PREFS_KEY);
      let loadedFormState = { ...initialFormState };
      if (savedPrefsString) {
        const savedData = JSON.parse(savedPrefsString);
        if (savedData && typeof savedData === 'object') {
           loadedFormState = {
            email: typeof savedData.email === 'string' ? savedData.email.toLowerCase() : initialFormState.email,
            city: typeof savedData.city === 'string' ? savedData.city : initialFormState.city,
            alertsEnabled: typeof savedData.alertsEnabled === 'boolean' ? savedData.alertsEnabled : initialFormState.alertsEnabled,
            notifyExtremeTemp: typeof savedData.notifyExtremeTemp === 'boolean' ? savedData.notifyExtremeTemp : initialFormState.notifyExtremeTemp,
            notifyHeavyRain: typeof savedData.notifyHeavyRain === 'boolean' ? savedData.notifyHeavyRain : initialFormState.notifyHeavyRain,
            notifyStrongWind: typeof savedData.notifyStrongWind === 'boolean' ? savedData.notifyStrongWind : initialFormState.notifyStrongWind,
          };
        }
      }
      setFormState(loadedFormState);
      setIsEmailLocked(!!loadedFormState.email); 

      const savedVerifiedEmailsString = localStorage.getItem(LOCAL_STORAGE_VERIFIED_EMAILS_KEY);
      if (savedVerifiedEmailsString) {
        setVerifiedEmails(new Set(JSON.parse(savedVerifiedEmailsString).map((email: string) => email.toLowerCase())));
      }

    } catch (error) {
      console.error("Failed to load preferences or verified emails from localStorage:", error);
      setFormState(initialFormState);
      setVerifiedEmails(new Set());
      setIsEmailLocked(false); 
    }
  }, []);

  useEffect(() => {
    if ((formState.alertsEnabled && formState.email && formState.city) || !formState.alertsEnabled) {
      try {
        const stateToSave = { ...formState, email: formState.email.toLowerCase() };
        localStorage.setItem(LOCAL_STORAGE_PREFS_KEY, JSON.stringify(stateToSave));
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
  
  const processMainActionState = useCallback((state: SaveAlertsFormState, type: 'save' | 'verify') => {
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
            email: prev.email.toLowerCase(), // Keep email, but ensure lowercase
            alertsEnabled: false,
            city: '' 
        }));
        setIsEmailLocked(!!formState.email); // Re-evaluate lock based on current formState email
      }

      if (!state.error) {
         if (type === 'save' && !state.needsVerification && !state.alertsCleared && formState.email) {
          setIsEmailLocked(true);
        }
        // Check for verifiedEmailOnSuccess for both save (if already verified) and verify actions
        if (state.verifiedEmailOnSuccess) { 
             const verifiedEmailLower = state.verifiedEmailOnSuccess.toLowerCase();
             setVerifiedEmails(prev => {
                if (prev.has(verifiedEmailLower)) return prev;
                const newSet = new Set(prev);
                newSet.add(verifiedEmailLower);
                return newSet;
            });
            if (type === 'verify' && state.emailVerified) { // Lock on successful verification
                 setIsEmailLocked(true);
            }
        }
      }
        
      if ((type === 'verify' && state.emailVerified) || (type === 'save' && !state.needsVerification && !state.alertsCleared)) {
        setVerificationCodeInput(''); // Clear code input after successful verify or save (if no verification needed)
      }
    }
  }, [toast, formState.email ]);


  useEffect(() => {
    processMainActionState(savePrefsActionState, 'save');
  }, [savePrefsActionState, processMainActionState]);

  useEffect(() => {
    processMainActionState(verifyCodeActionState, 'verify');
  }, [verifyCodeActionState, processMainActionState]);

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
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'email' ? value.toLowerCase() : value }));
    if (name === 'email') {
        // If user starts typing in the email field, it should unlock if it was locked.
        // It should NOT lock again automatically on typing.
        setIsEmailLocked(false);
    }
  }, []);

  const handleSwitchChange = useCallback((name: keyof AlertPreferences, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  }, []);

  // Determine if verification UI should be shown
  // Show if:
  // 1. savePrefsActionState indicates verification is needed AND
  // 2. The email for which verification was sent matches the current form email AND
  // 3. The current email is NOT already in the verifiedEmails list.
  const showVerificationSection = savePrefsActionState.needsVerification && 
                                 savePrefsActionState.verificationSentTo === formState.email.toLowerCase() &&
                                 !isCurrentEmailVerified;
                                 
  const isAnyActionPending = isSavePrefsPending || isVerifyCodePending || isTestEmailPending;

  // Email input should be disabled if:
  // - It's locked AND alerts are enabled (to allow editing if alerts are off)
  // - OR verification is pending for THIS email
  // - OR any action is generally pending (to prevent changes during submission)
  // - OR alerts are generally disabled (no email needed if all alerts off)
  const emailInputActuallyDisabled = (isEmailLocked && formState.alertsEnabled) || 
                                    (showVerificationSection && savePrefsActionState.verificationSentTo === formState.email.toLowerCase()) ||
                                    !formState.alertsEnabled ||
                                    isAnyActionPending;
  
  const showEditEmailButton = isEmailLocked && 
                              !!formState.email && 
                              formState.alertsEnabled && 
                              !isAnyActionPending && // Not while any action is pending
                              !(showVerificationSection && savePrefsActionState.verificationSentTo === formState.email.toLowerCase());


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
          
          {!showVerificationSection && (
            <form id="mainAlertForm" action={savePrefsFormAction}>
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
                    disabled={isAnyActionPending}
                  />
                </div>
              
                <div className="space-y-2.5 sm:space-y-3">
                  <Label htmlFor="emailInput" className="text-base sm:text-lg font-medium text-foreground/90 flex items-center">
                    <Mail className="mr-2.5 sm:mr-3 h-5 w-5 sm:h-6 sm:w-6 text-primary/80" /> Email Address
                    {isCurrentEmailVerified && formState.email && <ShieldCheck className="ml-2 h-5 w-5 text-green-500" title="Email Verified" />}
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input 
                      id="emailInput" 
                      name="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      className="flex-grow h-11 sm:h-12 text-base sm:text-lg"
                      value={formState.email}
                      onChange={handleInputChange}
                      disabled={emailInputActuallyDisabled}
                    />
                    {showEditEmailButton && (
                       <Button 
                         type="button" 
                         variant="outline" 
                         size="icon" 
                         onClick={() => setIsEmailLocked(false)}
                         aria-label="Edit email address"
                         className="h-11 sm:h-12 w-11 sm:w-12 flex-shrink-0"
                         disabled={isAnyActionPending} // Disable if any action is pending
                       >
                         <Pencil className="h-5 w-5 sm:h-6 sm:w-6" />
                       </Button>
                    )}
                  </div>
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
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  />
                  {savePrefsActionState.fieldErrors?.city && <p className="text-sm text-destructive mt-1.5">{savePrefsActionState.fieldErrors.city.join(', ')}</p>}
                </div>

                <div className={`space-y-3.5 sm:space-y-4 pt-4 sm:pt-5 border-t border-border/40 ${!formState.alertsEnabled || isAnyActionPending ? 'opacity-50 pointer-events-none' : ''}`}>
                  <h4 className="text-lg sm:text-xl font-semibold text-foreground/90">Notification Conditions:</h4>
                  <AlertOption
                    id="notifyExtremeTemp"
                    name="notifyExtremeTemp"
                    label="Extreme Temperatures"
                    icon={Thermometer}
                    description="Alerts for high (>32°C) or low (<5°C) temperatures."
                    checked={formState.notifyExtremeTemp}
                    onCheckedChange={(checked) => handleSwitchChange('notifyExtremeTemp', checked)}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  />
                  <AlertOption
                    id="notifyHeavyRain"
                    name="notifyHeavyRain"
                    label="Heavy Rain"
                    icon={CloudRain}
                    description="Notifications for heavy intensity rain."
                    checked={formState.notifyHeavyRain}
                    onCheckedChange={(checked) => handleSwitchChange('notifyHeavyRain', checked)}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  />
                  <AlertOption
                    id="notifyStrongWind"
                    name="notifyStrongWind"
                    label="Strong Winds"
                    icon={Wind} 
                    description="Alerts for wind speeds >35 km/h."
                    checked={formState.notifyStrongWind}
                    onCheckedChange={(checked) => handleSwitchChange('notifyStrongWind', checked)}
                    disabled={!formState.alertsEnabled || isAnyActionPending}
                  />
                </div>
              </CardContent>
              {/* SavePreferencesButton is now in CardFooter, linked by form="mainAlertForm" */}
            </form>
          )}

          {showVerificationSection && (
            <form action={verifyCodeFormAction}>
              {/* Pass all necessary preference data for when verification succeeds */}
              <input type="hidden" name="email" value={savePrefsActionState.verificationSentTo?.toLowerCase() || ''} />
              <input type="hidden" name="expectedCode" value={savePrefsActionState.generatedCode || ''} />
              <input type="hidden" name="city" value={formState.city} />
              <input type="hidden" name="alertsEnabled" value={formState.alertsEnabled ? 'on' : 'off'} />
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
                    disabled={isVerifyCodePending || isAnyActionPending}
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

          {/* Action buttons footer - shown when not in verification flow */}
          {!showVerificationSection && (
            <CardFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-3 sm:gap-4 p-5 sm:p-6 md:p-7 border-t border-border/40 mt-3 sm:mt-4">
              {formState.email && formState.alertsEnabled && ( // Only show test email button if there's an email and alerts are enabled
                <form action={testEmailFormAction} className="w-full sm:w-auto">
                    <input type="hidden" name="email" value={formState.email.toLowerCase()} />
                    <input type="hidden" name="city" value={formState.city} />
                    <SendTestEmailButton />
                </form>
              )}
              <SavePreferencesButton form="mainAlertForm" />
            </CardFooter>
          )}
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
