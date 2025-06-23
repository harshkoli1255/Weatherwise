
import { UserProfile } from '@clerk/nextjs';
import { Card, CardContent } from '@/components/ui/card';

export default function ProfilePage() {
  return (
    <div className="flex justify-center items-start container mx-auto px-4 py-8 sm:py-10 md:py-12">
      <div className="w-full max-w-4xl">
        <UserProfile path="/profile" appearance={{
            elements: {
                rootBox: "w-full",
                card: "w-full bg-glass border-primary/20 shadow-2xl rounded-2xl",
                headerTitle: "text-primary font-headline",
                headerSubtitle: "text-muted-foreground",
                formFieldLabel: "text-foreground",
                formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90",
                formFieldInput: "bg-input border-border text-foreground",
                profileSectionTitleText: "text-primary font-headline",
                profileSectionPrimaryButton: "text-foreground",
                navbar: "hidden", // Example to hide parts
            }
        }}/>
      </div>
    </div>
  );
}
