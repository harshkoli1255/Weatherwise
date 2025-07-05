
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  BrainCircuit,
  BellRing,
  Bookmark,
  UserCheck,
  Sparkles,
  Layers,
  Heart,
  CloudCog,
  Waypoints,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Weatherwise',
  description: 'Learn about the features and technology that make Weatherwise a smart, modern weather application.',
};

const FeatureItem = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="relative h-full overflow-hidden rounded-lg bg-background/50 p-4 shadow-lg border border-border/30 transition-all duration-300 hover:border-primary/40 hover:bg-muted/60 hover:shadow-primary/10 hover:scale-[1.02]">
    <div className="flex items-start gap-4">
      <div className="mt-1 flex-shrink-0 rounded-lg bg-primary/10 p-3">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{children}</p>
      </div>
    </div>
  </div>
);


const TechItem = ({ name }: { name: string }) => (
    <Badge variant="secondary" className="px-3 py-1 text-sm shadow-md border-border/50 border">
        {name}
    </Badge>
);

const SectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
    <div className="mb-8 flex items-center justify-center gap-3">
        <Icon className="h-7 w-7 text-primary" />
        <h2 className="text-center font-headline text-xl sm:text-2xl font-semibold text-primary">
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
      icon: AreaChart,
      title: 'Dynamic Weather Dashboard',
      description: 'Get real-time weather data for any city worldwide, complete with an interactive hourly forecast and beautiful data visualizations.',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Go beyond raw data. Get conversational summaries, creative activity suggestions, and a unique, AI-generated image that brings the weather to life.',
    },
    {
      icon: BrainCircuit,
      title: 'Intelligent Search',
      description: 'Our AI understands natural language, corrects typos, and interprets complex queries like landmarks or businesses (e.g., "weather at the eiffel tower").',
    },
    {
      icon: BellRing,
      title: 'Customizable Intelligent Alerts',
      description: 'Define specific days, times, and a timezone for your alerts. An AI agent analyzes conditions to decide if an alert is significant enough to send.',
    },
    {
      icon: Waypoints,
      title: 'Proactive Location Alerts',
      description: 'As you move, Weatherwise can automatically check the weather at your new location and notify you of significant changes, keeping you prepared on the go.',
    },
    {
      icon: CloudCog,
      title: 'Synced & Personalized Experience',
      description: 'Your saved locations, unit preferences (°C/°F, km/h/mph), and default city are saved to your account and sync seamlessly across all your devices.',
    },
    {
      icon: Bookmark,
      title: 'Live Saved Locations',
      description: 'Your "Saved Locations" dropdown shows live weather for all your saved cities at a glance and allows setting your alert city with one click.',
    },
    {
      icon: UserCheck,
      title: 'Secure User Authentication',
      description: 'Full sign-up, sign-in, and profile management powered by Clerk for a secure and seamless user experience.',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
        <Card className="mx-auto w-full max-w-4xl rounded-lg border-primary/20 bg-glass shadow-2xl">
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

            <CardContent className="space-y-16 px-6 pb-8 sm:px-8">
                <section>
                    <SectionHeader icon={Sparkles} title="Core Features" />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                    <p className="mx-auto mb-8 max-w-xl text-center text-sm text-muted-foreground">
                        Weatherwise is built with a modern tech stack designed for performance, scalability, and a superior developer experience.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {techStack.map((tech, index) => (
                            <div key={tech} className="animate-in fade-in-up" style={{ animationDelay: `${200 + index * 75}ms` }}>
                                <TechItem key={tech} name={tech} />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <SectionHeader icon={Heart} title="Our Mission" />
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center shadow-inner dark:bg-primary/10 animate-in fade-in" style={{ animationDelay: '500ms' }}>
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
