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
          routing="hash"
          appearance={{
            baseTheme: resolvedTheme === 'dark' ? dark : undefined,
            elements: {
              rootBox: 'w-full',
              card: 'border-border shadow-2xl rounded-2xl bg-card text-card-foreground',
              headerTitle: 'font-headline text-card-foreground',
              profileSectionTitleText: 'font-headline text-card-foreground',
              formButtonPrimary:
                'bg-primary text-primary-foreground hover:bg-primary/90',
              formFieldInput:
                'bg-background border-border text-foreground',
              formFieldLabel:
                'text-muted-foreground',
              selectButton: 'bg-background border-border text-foreground',
              selectOptionsContainer: 'bg-background border-border',
            },
          }}
        />
      </div>
    </div>
  );
}
