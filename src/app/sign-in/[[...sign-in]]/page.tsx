
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-theme(spacing.16))] bg-background p-4">
      <div className="animate-in fade-in-50 zoom-in-95">
        <SignIn path="/sign-in" />
      </div>
    </div>
  );
}
