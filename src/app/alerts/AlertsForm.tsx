'use client';

import React, { useEffect, useState } from 'react';
import { useFormStatus, useFormState } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import type { AlertPreferences, SaveAlertsFormState } from '@/lib/types';
import { saveAlertPreferencesAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock } from 'lucide-react';
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

const daysOfWeek = [
  { id: 1, label: 'Mon', name: 'monday' },
  { id: 2, label: 'Tue', name: 'tuesday' },
  { id: 3, label: 'Wed', name: 'wednesday' },
  { id: 4, label: 'Thu', name: 'thursday' },
  { id: 5, label: 'Fri', name: 'friday' },
  { id: 6, label: 'Sat', name: 'saturday' },
  { id: 0, label: 'Sun', name: 'sunday' },
];

const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const date = new Date();
    date.setHours(i);
    const label = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    return { value: i.toString(), label };
});

export function AlertsForm({ preferences }: AlertsFormProps) {
  const { toast } = useToast();
  const initialState: SaveAlertsFormState = { message: null, error: false };
  const [saveState, saveAction] = useFormState<SaveAlertsFormState, FormData>(saveAlertPreferencesAction, initialState);
  
  const [alertsEnabled, setAlertsEnabled] = useState(preferences.alertsEnabled);
  const [city, setCity] = useState(preferences.city);
  
  const [scheduleEnabled, setScheduleEnabled] = useState(preferences.schedule?.enabled ?? false);
  const [selectedDays, setSelectedDays] = useState<number[]>(preferences.schedule?.days ?? []);
  
  useEffect(() => {
    if (saveState.message) {
      toast({
        title: saveState.error ? 'Error' : 'Success',
        description: saveState.message,
        variant: saveState.error ? 'destructive' : 'default',
      });
    }
  }, [saveState, toast]);
  
  const handleDayChange = (dayId: number, checked: boolean) => {
    setSelectedDays(prev => 
      checked ? [...prev, dayId] : prev.filter(d => d !== dayId)
    );
  };

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
          <p className="text-sm text-muted-foreground mt-1.5">The AI will monitor this city and alert you of significant weather.</p>
        </div>

        <Separator />
        <h3 className="text-lg font-medium border-b pb-2 pt-2">Alert Schedule</h3>

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

          <div className={`space-y-6 pt-4 transition-opacity duration-300 ${scheduleEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div>
                  <Label>Active Days of the Week</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-2">
                      {daysOfWeek.map(day => (
                          <div key={day.id} className="flex items-center gap-2 p-2 bg-background rounded-md border">
                              <Checkbox 
                                id={`day-${day.id}`} 
                                name={`scheduleDay${day.id}`}
                                checked={selectedDays.includes(day.id)}
                                onCheckedChange={(checked) => handleDayChange(day.id, !!checked)}
                              />
                              <Label htmlFor={`day-${day.id}`} className="cursor-pointer">{day.label}</Label>
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
      </div>
    </form>
  );
}
