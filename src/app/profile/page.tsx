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
              card: 'border-primary/20 shadow-2xl rounded-2xl',
              headerTitle: 'font-headline',
              profileSectionTitleText: 'font-headline',
              formButtonPrimary:
                'bg-primary text-primary-foreground hover:bg-primary/90',
            },
          }}
        />
      </div>
    </div>
  );
}
