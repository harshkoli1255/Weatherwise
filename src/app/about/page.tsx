
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  AreaChart,
  BrainCircuit,
  BellRing,
  Bookmark,
  UserCheck,
  Sparkles,
  Layers,
  Heart,
  SlidersHorizontal,
  CloudCog,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Weatherwise',
  description: 'Learn about the features and technology that make Weatherwise a smart, modern weather application.',
};

const FeatureItem = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="flex h-full flex-col items-start rounded-xl bg-background/50 p-4 shadow-lg border border-border/30">
    <div className="flex items-center gap-4 mb-3">
        <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-primary">{title}</h3>
    </div>
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

const TechItem = ({ name }: { name: string }) => (
    <Badge variant="secondary" className="px-3 py-1 text-sm shadow-md border-border/50 border">
        {name}
    </Badge>
);

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="mb-6 flex items-center justify-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <h2 className="text-center font-headline text-xl font-semibold text-primary">
            {title}
        </h2>
    </div>
);

export default function AboutPage() {
  const techStack = [
    'Next.js', 'React', 'TypeScript', 'Tailwind CSS',
    'ShadCN UI', 'Genkit', 'Firebase', 'Clerk'
  ];
  
  const features = [
    {
      icon: MapPin,
      title: 'Dynamic Weather Dashboard',
      description: 'Get real-time weather data for any city, or use your current location automatically.',
    },
    {
      icon: AreaChart,
      title: 'Interactive Forecast',
      description: 'Visualize the 24-hour temperature trend with a beautiful, interactive set of forecast cards.',
    },
    {
      icon: BrainCircuit,
      title: 'AI-Powered Search & Insights',
      description: 'Our AI understands natural language, corrects typos, and provides helpful, conversational weather summaries.',
    },
    {
      icon: BellRing,
      title: 'Intelligent Alerts',
      description: 'Receive customizable email alerts with scheduling, sensitivity controls, and AI-driven decision-making.',
    },
    {
      icon: SlidersHorizontal,
      title: 'Customizable Display',
      description: 'Tailor the app with your preferred units for temperature (°C/°F), wind speed (km/h/mph), and time format (12/24h).',
    },
    {
      icon: CloudCog,
      title: 'Synced Preferences',
      description: 'Your saved locations, unit settings, and default location are saved to your account and sync seamlessly across all your devices.',
    },
    {
      icon: UserCheck,
      title: 'Secure Authentication',
      description: 'Full sign-up, sign-in, and profile management powered by Clerk, complete with a modern settings hub.',
    },
    {
      icon: Bookmark,
      title: 'Live Saved Locations',
      description: 'Your "Saved Locations" dropdown acts as a mini-dashboard, showing live weather for all your saved cities at a glance.',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10">
        <Card className="mx-auto w-full max-w-4xl rounded-xl border-primary/20 bg-glass shadow-2xl">
            <CardHeader className="items-center pt-8 pb-6 text-center">
                 <div className="mb-4 rounded-full border border-primary/30 bg-primary/20 p-4 animate-in fade-in zoom-in-95">
                    <Sparkles className="h-10 w-10 text-primary drop-shadow-lg" />
                 </div>
                <CardTitle className="font-headline text-2xl font-bold text-primary sm:text-3xl animate-in fade-in-up" style={{ animationDelay: '150ms' }}>
                    About Weatherwise
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-base text-muted-foreground animate-in fade-in-up" style={{ animationDelay: '250ms' }}>
                    An intelligent companion for real-time weather data, AI-powered insights, and a highly customizable alert system.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-12 px-6 pb-8 sm:px-8">
                <section>
                    <SectionHeader icon={Sparkles} title="Core Features" />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {features.map((feature, index) => (
                           <div key={feature.title} className="animate-in fade-in-up" style={{ animationDelay: `${150 + index * 100}ms` }}>
                             <FeatureItem icon={feature.icon} title={feature.title}>
                               {feature.description}
                             </FeatureItem>
                           </div>
                         ))}
                    </div>
                </section>

                <section>
                    <SectionHeader icon={Layers} title="Technology Stack" />
                    <p className="mx-auto mb-6 max-w-xl text-center text-sm text-muted-foreground">
                        Weatherwise is built with a modern tech stack designed for performance, scalability, and a superior developer experience.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {techStack.map((tech, index) => (
                            <div key={tech} className="animate-in fade-in-up" style={{ animationDelay: `${200 + index * 75}ms` }}>
                                <TechItem key={tech} name={tech} />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <SectionHeader icon={Heart} title="Our Mission" />
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center shadow-inner dark:bg-primary/10 animate-in fade-in" style={{ animationDelay: '500ms' }}>
                         <p className="mx-auto max-w-xl text-base italic leading-relaxed text-foreground/90">
                           &ldquo;To provide a weather application that is not only accurate and reliable but also a joy to use. By leveraging the power of generative AI, we deliver insights that go beyond raw data, helping you plan your day more effectively.&rdquo;
                        </p>
                    </div>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
