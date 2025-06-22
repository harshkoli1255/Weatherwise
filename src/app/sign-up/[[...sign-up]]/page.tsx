
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-background p-4 text-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full">
            <UserPlus className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="mt-4">Registration Disabled</CardTitle>
          <CardDescription>
            The sign-up functionality is temporarily disabled. Please check back later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">We apologize for the inconvenience.</p>
        </CardContent>
      </Card>
    </div>
  );
}
