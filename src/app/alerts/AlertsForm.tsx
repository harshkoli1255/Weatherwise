
'use client';

import React, { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import type { AlertPreferences } from '@/lib/types';
import { saveAlertPreferencesAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Thermometer, Wind, Umbrella, Loader2 } from 'lucide-react';

interface AlertsFormProps {
  preferences: AlertPreferences;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Saving...' : 'Save Preferences'}
    </Button>
  );
}

export function AlertsForm({ preferences }: AlertsFormProps) {
  const { toast } = useToast();
  const [formState, formAction] = useFormState(saveAlertPreferencesAction, { message: null, error: false });

  // Component state for immediate UI feedback on switch toggles
  const [alertsEnabled, setAlertsEnabled] = useState(preferences.alertsEnabled);
  const [notifyTemp, setNotifyTemp] = useState(preferences.notifyExtremeTemp);
  const [notifyRain, setNotifyRain] = useState(preferences.notifyHeavyRain);
  const [notifyWind, setNotifyWind] = useState(preferences.notifyStrongWind);

  useEffect(() => {
    if (formState.message) {
      toast({
        title: formState.error ? 'Error' : 'Success',
        description: formState.message,
        variant: formState.error ? 'destructive' : 'default',
      });
    }
  }, [formState, toast]);

  return (
    <form action={formAction} className="space-y-8">
      <div>
        <Label htmlFor="email">Alerts Email</Label>
        <Input id="email" name="email" value={preferences.email} readOnly className="mt-2 bg-muted cursor-not-allowed" />
        <p className="text-sm text-muted-foreground mt-1">This is the primary email on your account. To change it, please update your profile.</p>
      </div>
      <Separator />

      <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-background/50">
        <div className="space-y-0.5">
          <Label htmlFor="alertsEnabled" className="text-base font-bold">Enable All Alerts</Label>
          <p className="text-sm text-muted-foreground">Master switch for all weather notifications.</p>
        </div>
        <Switch id="alertsEnabled" name="alertsEnabled" checked={alertsEnabled} onCheckedChange={setAlertsEnabled} aria-label="Enable all alerts" />
      </div>

      <div className={`space-y-6 transition-opacity duration-300 ${alertsEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <Label htmlFor="city">City for Alerts</Label>
          <Input id="city" name="city" defaultValue={preferences.city} placeholder="e.g., London" required={alertsEnabled} className="mt-2" />
           <p className="text-sm text-muted-foreground mt-1">This city will be used for all alert checks.</p>
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
  );
}
