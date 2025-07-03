
'use client';

import { UserProfile } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { dark } from '@clerk/themes';

export default function ProfilePage() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex justify-center items-start container mx-auto px-4 py-8 sm:py-10 md:py-12">
      <div className="w-full max-w-4xl">
        <UserProfile
          path="/profile"
          appearance={{
            baseTheme: resolvedTheme === 'dark' ? dark : undefined,
            elements: {
              rootBox: 'w-full',
              card: 'border-border shadow-xl rounded-lg bg-card text-card-foreground',
              headerTitle: 'font-headline text-card-foreground',
              headerSubtitle: 'text-muted-foreground',
              profileSectionTitleText: 'font-headline text-card-foreground',
              formButtonPrimary:
                'bg-primary text-primary-foreground hover:bg-primary/90',
              formFieldInput:
                'bg-background border-input text-foreground rounded-md',
              formFieldLabel:
                'text-muted-foreground',
              selectButton: 'bg-background border-input text-foreground rounded-md',
              selectOptionsContainer: 'bg-popover border-border rounded-md',
              formButtonReset: 'text-muted-foreground hover:text-foreground',
              dividerLine: 'bg-border',
              badge: 'text-primary border-primary/50',
            },
            variables: {
              borderRadius: '0.5rem',
            }
          }}
        />
      </div>
    </div>
  );
}
