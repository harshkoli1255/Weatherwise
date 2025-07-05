
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export function AlertsFormSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 flex flex-col items-center">
      <Card className="w-full max-w-2xl bg-glass border-primary/20 shadow-2xl rounded-xl">
        <CardHeader className="text-center items-center pt-6 sm:pt-8 pb-4">
           <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
              <Bell className="h-10 w-10 text-primary drop-shadow-lg" />
           </div>
          <CardTitle className="text-xl sm:text-2xl font-headline font-bold text-primary">Manage Weather Alerts</CardTitle>
          <CardDescription className="text-base text-muted-foreground mt-2 px-4">
            Loading your preferences...
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8 space-y-8 animate-pulse">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-11 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-32 w-full rounded-lg" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-40 mb-2" />
                <Skeleton className="h-40 w-full rounded-lg" />
            </div>
          </div>
           <div className="pt-4 flex flex-row items-center gap-4">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-36 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
