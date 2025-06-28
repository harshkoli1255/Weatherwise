'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useFormStatus, useFormState } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import type { AlertPreferences, SaveAlertsFormState } from '@/lib/types';
import { saveAlertPreferencesAction, testAlertsAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Clock, Zap, MailQuestion, Info } from 'lucide-react';
import { AlertsCitySearch } from './AlertsCitySearch';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimezoneSearch } from './TimezoneSearch';

interface AlertsFormProps {
  preferences: AlertPreferences;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      <Loader2 className={cn("mr-2 h-4 w-4 animate-spin", { "hidden": !pending })} />
      {pending ? 'Saving...' : 'Save Preferences'}
    </Button>
  );
}

const daysOfWeek = [
  { id: 1, label: 'Mon', name: 'monday' },
  { id: 2, label: 'Tue', name: 'tuesday' },
  { id: 3, label: 'Wed', name: 'wednesday' },
  { id: 4, label: 'Thu', name: 'thursday' },
  { id: 5, label: 'Fri', name: 'friday' },
  { id: 6, label: 'Sat', name: 'saturday' },
  { id: 0, label: 'Sun', name: 'sunday' },
];

// Generate time options consistently on both server and client to avoid hydration errors.
const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 === 0 ? 12 : i % 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    const label = `${hour} ${ampm}`;
    return { value: i.toString(), label };
});

export function AlertsForm({ preferences }: AlertsFormProps) {
  const { toast } = useToast();
  const initialState: SaveAlertsFormState = { message: null, error: false };
  const [saveState, saveAction] = useFormState<SaveAlertsFormState, FormData>(saveAlertPreferencesAction, initialState);
  
  const [alertsEnabled, setAlertsEnabled] = useState(preferences.alertsEnabled);
  const [city, setCity] = useState(preferences.city);
  const [timezone, setTimezone] = useState(preferences.timezone ?? '');
  
  const [scheduleEnabled, setScheduleEnabled] = useState(preferences.schedule?.enabled ?? false);
  const [selectedDays, setSelectedDays] = useState<number[]>(preferences.schedule?.days ?? []);
  
  const [isTesting, startTestTransition] = useTransition();
  const { pending: isSaving } = useFormStatus();

  // State to prevent hydration mismatch from client-side only logic
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (saveState.message) {
      toast({
        title: saveState.error ? 'Error' : 'Success',
        description: saveState.message,
        variant: saveState.error ? 'destructive' : 'default',
      });
    }
  }, [saveState, toast]);

  useEffect(() => {
    // Wait until component has mounted on the client to run this effect
    if (!hasMounted) return;

    // On the client, if schedule is enabled but no timezone is set, auto-detect it.
    if (scheduleEnabled && !timezone) {
        try {
            const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (detected) {
                setTimezone(detected);
                 toast({
                    title: 'Timezone Auto-Detected',
                    description: `Schedule timezone has been set to ${detected}.`,
                });
            }
        } catch (e) {
            console.warn("Could not auto-detect timezone.");
        }
    }
  }, [scheduleEnabled, timezone, hasMounted, toast]);
  
  const handleTestAlert = async () => {
    startTestTransition(async () => {
      toast({
        title: 'Sending Test Alert...',
        description: 'Checking your settings and the current weather.',
      });
      const result = await testAlertsAction();
      toast({
        title: result.error ? 'Test Failed' : 'Test Complete',
        description: result.message,
        variant: result.error ? 'destructive' : 'default',
        duration: result.error ? 6000 : 9000,
      });
    });
  };

  const handleDayChange = (dayId: number, checked: boolean) => {
    setSelectedDays(prev => 
      checked ? [...prev, dayId] : prev.filter(d => d !== dayId)
    );
  };
  
  const canTest = alertsEnabled && city.trim().length > 0;

  return (
    <form action={saveAction} className="space-y-8">
      <h3 className="text-lg font-medium border-b pb-2">General Settings</h3>
      <div>
        <Label htmlFor="email">Alerts Email</Label>
        <Input id="email" name="email" value={preferences.email} readOnly className="mt-2 bg-muted/60 cursor-not-allowed" />
        <p className="text-sm text-muted-foreground mt-1.5">This is the primary email on your account. To change it, please update your profile.</p>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-background/50">
        <div className="space-y-0.5">
          <Label htmlFor="alertsEnabled" className="text-base font-bold">Enable Alerts</Label>
          <p className="text-sm text-muted-foreground">Master switch for all AI-powered weather notifications.</p>
        </div>
        <Switch id="alertsEnabled" name="alertsEnabled" checked={alertsEnabled} onCheckedChange={setAlertsEnabled} aria-label="Enable all alerts" />
      </div>

      <div className={`space-y-8 pt-4 transition-opacity duration-300 ${alertsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <Label htmlFor="city">City for Alerts</Label>
          <AlertsCitySearch 
            id="city" 
            name="city" 
            value={city}
            onValueChange={setCity}
            required={alertsEnabled} 
          />
          <p className="text-sm text-muted-foreground mt-1.5">The AI will monitor this city and alert you of significant weather.</p>
        </div>
        
        <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-background/50">
          <div className="flex items-center gap-3 mb-1">
            <Zap className="h-6 w-6 text-primary" />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                 <h4 className="font-medium">Alert Sensitivity</h4>
                 <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs" side="top">
                      <p className="font-bold">Maximum:</p>
                      <p className="mb-2 text-sm text-muted-foreground">Sends an alert every hour if significant weather continues.</p>
                      <p className="font-bold">Balanced:</p>
                      <p className="mb-2 text-sm text-muted-foreground">Sends one alert, then waits 4 hours before sending another for the same conditions.</p>
                      <p className="font-bold">Minimal:</p>
                      <p className="text-sm text-muted-foreground">Sends a maximum of one alert per day.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-sm text-muted-foreground">Control how often you receive alerts for significant weather.</p>
            </div>
          </div>
          <RadioGroup name="notificationFrequency" defaultValue={preferences.notificationFrequency ?? 'balanced'} className="space-y-2 pt-2">
            <div className="flex items-start space-x-3 p-3 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary/50 has-[:checked]:scale-[1.01] border border-transparent transition-all duration-200 ease-in-out">
              <RadioGroupItem value="everyHour" id="freq-max" />
              <div className="grid gap-1.5 leading-normal">
                <Label htmlFor="freq-max" className="font-semibold cursor-pointer">Maximum</Label>
                <p className="text-sm text-muted-foreground">Get an alert every hour that significant weather conditions are detected.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary/50 has-[:checked]:scale-[1.01] border border-transparent transition-all duration-200 ease-in-out">
              <RadioGroupItem value="balanced" id="freq-bal" />
              <div className="grid gap-1.5 leading-normal">
                <Label htmlFor="freq-bal" className="font-semibold cursor-pointer">Balanced (Recommended)</Label>
                <p className="text-sm text-muted-foreground">Get one alert when significant weather starts, then stay quiet for 4 hours to prevent noise.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-md has-[:checked]:bg-primary/10 has-[:checked]:border-primary/50 has-[:checked]:scale-[1.01] border border-transparent transition-all duration-200 ease-in-out">
              <RadioGroupItem value="oncePerDay" id="freq-min" />
              <div className="grid gap-1.5 leading-normal">
                <Label htmlFor="freq-min" className="font-semibold cursor-pointer">Minimal</Label>
                <p className="text-sm text-muted-foreground">Get a maximum of one alert per day for the first significant weather event.</p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-background/50">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" />
                <div className="space-y-0.5">
                  <Label htmlFor="scheduleEnabled" className="font-medium">Enable Custom Schedule</Label>
                  <p className="text-sm text-muted-foreground">Only receive alerts during specific times and days.</p>
                </div>
              </div>
              <Switch id="scheduleEnabled" name="scheduleEnabled" checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
          </div>

          <div className={`space-y-6 pt-4 border-t border-border/50 transition-opacity duration-300 ${scheduleEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <Label htmlFor="timezone">Timezone for Schedule</Label>
                <TimezoneSearch
                  id="timezone"
                  name="timezone"
                  value={timezone}
                  onValueChange={setTimezone}
                  required={scheduleEnabled}
                />
                <p className="text-sm text-muted-foreground mt-1.5">Your schedule will be based on this timezone.</p>
              </div>
              
              <div>
                  <Label>Active Days of the Week</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
                      {daysOfWeek.map(day => (
                          <div key={day.id} className="flex items-center space-x-1.5 sm:space-x-2 rounded-lg border border-muted bg-background/50 p-2 sm:p-3 has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors">
                              <Checkbox 
                                id={`day-${day.id}`} 
                                name={`scheduleDay${day.id}`}
                                checked={selectedDays.includes(day.id)}
                                onCheckedChange={(checked) => handleDayChange(day.id, !!checked)}
                              />
                              <Label 
                                htmlFor={`day-${day.id}`} 
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {day.label}
                              </Label>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="scheduleStartHour">Start Time</Label>
                      <Select name="scheduleStartHour" defaultValue={preferences.schedule?.startHour.toString()}>
                          <SelectTrigger id="scheduleStartHour" className="mt-2">
                              <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                              {hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div>
                      <Label htmlFor="scheduleEndHour">End Time</Label>
                      <Select name="scheduleEndHour" defaultValue={preferences.schedule?.endHour.toString()}>
                          <SelectTrigger id="scheduleEndHour" className="mt-2">
                              <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                              {hourOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
              <p className="text-sm text-muted-foreground">Alerts will only be sent between the start and end hour on the selected days. The range is inclusive.</p>
          </div>
        </div>

      </div>
      
      <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
        <SubmitButton />
         <Button
            type="button"
            variant="outline"
            onClick={handleTestAlert}
            disabled={!canTest || isTesting || isSaving}
            title={!canTest ? "Please enable alerts and set a city to send a test." : "Send a test alert to your email"}
          >
            <Loader2 className={cn("mr-2 h-4 w-4 animate-spin", { "hidden": !isTesting })} />
            {!isTesting && <MailQuestion className="mr-2 h-4 w-4" />}
            {isTesting ? 'Testing...' : 'Send Test Alert'}
          </Button>
      </div>
    </form>
  );
}
