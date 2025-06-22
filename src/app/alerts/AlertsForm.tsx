
'use client';

import React, { useEffect, useState } from 'react';
import { useFormStatus, useFormState } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import type { AlertPreferences } from '@/lib/types';
import { saveAlertPreferencesAction, sendTestEmailAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Thermometer, Wind, Umbrella, Loader2, Send } from 'lucide-react';
import { AlertsCitySearch } from './AlertsCitySearch';
import { cn } from '@/lib/utils';

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

function TestEmailButton({ city }: { city: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full sm:w-auto" disabled={pending || !city}>
      <Loader2 className={cn("mr-2 h-4 w-4 animate-spin", { "hidden": !pending })} />
      <Send className={cn("mr-2 h-4 w-4", { "hidden": pending })}/>
      {pending ? 'Sending...' : 'Send Sample Alert'}
    </Button>
  )
}


export function AlertsForm({ preferences }: AlertsFormProps) {
  const { toast } = useToast();
  const [saveState, saveAction] = useFormState(saveAlertPreferencesAction, { message: null, error: false });
  const [testEmailState, testEmailAction] = useFormState(sendTestEmailAction, { message: null, error: false });

  const [alertsEnabled, setAlertsEnabled] = useState(preferences.alertsEnabled);
  const [notifyTemp, setNotifyTemp] = useState(preferences.notifyExtremeTemp);
  const [notifyRain, setNotifyRain] = useState(preferences.notifyHeavyRain);
  const [notifyWind, setNotifyWind] = useState(preferences.notifyStrongWind);
  const [city, setCity] = useState(preferences.city);

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
    if (testEmailState.message) {
      toast({
        title: testEmailState.error ? 'Error' : 'Success',
        description: testEmailState.message,
        variant: testEmailState.error ? 'destructive' : 'default',
      });
    }
  }, [testEmailState, toast]);

  return (
    <div className="space-y-8">
      <form action={saveAction} className="space-y-8">
        <h3 className="text-lg font-medium border-b pb-2">Alert Condition Preferences</h3>
        <div>
          <Label htmlFor="email">Alerts Email</Label>
          <Input id="email" name="email" value={preferences.email} readOnly className="mt-2 bg-muted/60 cursor-not-allowed" />
          <p className="text-sm text-muted-foreground mt-1.5">This is the primary email on your account. To change it, please update your profile.</p>
        </div>
        <Separator />

        <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-background/50">
          <div className="space-y-0.5">
            <Label htmlFor="alertsEnabled" className="text-base font-bold">Enable Alerts</Label>
            <p className="text-sm text-muted-foreground">Master switch for all weather notifications.</p>
          </div>
          <Switch id="alertsEnabled" name="alertsEnabled" checked={alertsEnabled} onCheckedChange={setAlertsEnabled} aria-label="Enable all alerts" />
        </div>

        <div className={`space-y-6 transition-opacity duration-300 ${alertsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div>
            <Label htmlFor="city">City for Alerts</Label>
            <AlertsCitySearch 
              id="city" 
              name="city" 
              value={city}
              onValueChange={setCity}
              required={alertsEnabled} 
            />
            <p className="text-sm text-muted-foreground mt-1.5">This city will be used for all alert checks.</p>
          </div>

          <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-background/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Thermometer className="h-6 w-6 text-primary" />
                <Label htmlFor="notifyExtremeTemp" className="font-medium">Extreme Temperature Alerts</Label>
              </div>
              <Switch id="notifyExtremeTemp" name="notifyExtremeTemp" checked={notifyTemp} onCheckedChange={setNotifyTemp} />
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 transition-opacity duration-300 ${notifyTemp ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <Label htmlFor="highTempThreshold">Notify above (°C)</Label>
                <Input id="highTempThreshold" name="highTempThreshold" type="number" defaultValue={preferences.highTempThreshold} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="lowTempThreshold">Notify below (°C)</Label>
                <Input id="lowTempThreshold" name="lowTempThreshold" type="number" defaultValue={preferences.lowTempThreshold} className="mt-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-background/50 h-full">
              <div className="flex items-center gap-3">
                <Umbrella className="h-6 w-6 text-primary" />
                <Label htmlFor="notifyHeavyRain" className="font-medium">Heavy Rain Alerts</Label>
              </div>
              <Switch id="notifyHeavyRain" name="notifyHeavyRain" checked={notifyRain} onCheckedChange={setNotifyRain} />
            </div>

            <div className="space-y-4 rounded-lg border p-4 shadow-sm bg-background/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wind className="h-6 w-6 text-primary" />
                  <Label htmlFor="notifyStrongWind" className="font-medium">Strong Wind Alerts</Label>
                </div>
                <Switch id="notifyStrongWind" name="notifyStrongWind" checked={notifyWind} onCheckedChange={setNotifyWind} />
              </div>
              <div className={`pt-2 transition-opacity duration-300 ${notifyWind ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <Label htmlFor="windSpeedThreshold">Notify above (km/h)</Label>
                <Input id="windSpeedThreshold" name="windSpeedThreshold" type="number" defaultValue={preferences.windSpeedThreshold} className="mt-2" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4">
          <SubmitButton />
        </div>
      </form>

      <Separator />

      <form action={testEmailAction}>
          <input type="hidden" name="city" value={city} />
          <h3 className="text-lg font-medium">Demo: Send a Sample Alert</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            This will send a sample weather alert for <strong>{city || 'the city you have saved'}</strong> to your primary email address. This demonstrates how the email notifications will look.
            <br/>
            <span className="text-xs text-muted-foreground/80">Note: The email service must be configured by the administrator for this feature to work.</span>
          </p>
          <TestEmailButton city={city} />
      </form>
    </div>
  );
}
