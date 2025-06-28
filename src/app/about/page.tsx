import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  AreaChart,
  BrainCircuit,
  BellRing,
  Star,
  UserCheck,
  Sparkles,
  Layers,
  Heart,
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Weatherwise',
  description: 'Learn about the features and technology that make Weatherwise a smart, modern weather application.',
};

const FeatureItem = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="flex flex-col items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-muted/80 transition-all duration-300 shadow-lg border border-border/30 hover:shadow-xl hover:border-primary/50 hover:scale-[1.02]">
    <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

const TechItem = ({ name }: { name: string }) => (
    <Badge variant="secondary" className="text-xs py-0.5 px-2.5">
        {name}
    </Badge>
);

export default function AboutPage() {
  const techStack = [
    'Next.js', 'React', 'TypeScript', 'Tailwind CSS',
    'ShadCN UI', 'Genkit', 'Firebase', 'Clerk'
  ];

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 md:py-10">
        <Card className="w-full max-w-4xl mx-auto bg-glass border-primary/20 shadow-2xl rounded-xl">
            <CardHeader className="text-center items-center pt-8 pb-6">
                 <div className="p-4 bg-primary/20 rounded-full mb-4 border border-primary/30">
                    <Sparkles className="h-10 w-10 text-primary drop-shadow-lg" />
                 </div>
                <CardTitle className="text-2xl sm:text-3xl font-headline font-bold text-primary">
                    About Weatherwise
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground mt-2 max-w-2xl">
                    An intelligent companion for real-time weather data, AI-powered insights, and a highly customizable alert system.
                </CardDescription>
            </CardHeader>

            <CardContent className="px-6 sm:px-8 pb-8 space-y-10">
                <section>
                    <h2 className="text-xl font-headline font-semibold text-foreground mb-5 text-center">
                        Core Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FeatureItem icon={MapPin} title="Dynamic Weather Dashboard">
                            Get real-time weather data for any city, or use your current location automatically.
                        </FeatureItem>
                         <FeatureItem icon={AreaChart} title="Interactive Forecast">
                            Visualize the 24-hour temperature trend with a beautiful, interactive set of forecast cards.
                        </FeatureItem>
                        <FeatureItem icon={BrainCircuit} title="AI-Powered Search">
                            Our AI understands natural language, corrects typos, and interprets complex queries like "weather at the eiffel tower".
                        </FeatureItem>
                        <FeatureItem icon={BellRing} title="Intelligent Alerts">
                            Receive customizable email alerts with scheduling, sensitivity controls, and AI-driven decision-making.
                        </FeatureItem>
                        <FeatureItem icon={Star} title="Live Favorites">
                            Your favorites dropdown acts as a mini-dashboard, showing live weather for all your saved cities at a glance.
                        </FeatureItem>
                         <FeatureItem icon={UserCheck} title="Secure Authentication">
                            Full sign-up, sign-in, and profile management powered by Clerk, complete with a modern settings hub.
                        </FeatureItem>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-center gap-3 mb-5">
                        <Layers className="h-6 w-6 text-muted-foreground" />
                        <h2 className="text-xl font-headline font-semibold text-foreground text-center">
                            Technology Stack
                        </h2>
                    </div>
                    <p className="text-muted-foreground mb-5 text-center max-w-xl mx-auto text-sm">
                        Weatherwise is built with a modern tech stack designed for performance, scalability, and a superior developer experience.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {techStack.map(tech => (
                            <TechItem key={tech} name={tech} />
                        ))}
                    </div>
                </section>

                <section>
                     <div className="flex items-center justify-center gap-3 mb-5">
                        <Heart className="h-6 w-6 text-muted-foreground" />
                        <h2 className="text-xl font-headline font-semibold text-foreground text-center">
                            Our Mission
                        </h2>
                    </div>
                    <div className="bg-primary/5 dark:bg-primary/10 p-5 rounded-lg shadow-inner border border-primary/20 text-center">
                         <p className="text-base text-foreground/90 italic leading-relaxed max-w-xl mx-auto">
                           &ldquo;To provide a weather application that is not only accurate and reliable but also a joy to use. By leveraging the power of generative AI, we deliver insights that go beyond raw data, helping you plan your day more effectively.&rdquo;
                        </p>
                    </div>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
