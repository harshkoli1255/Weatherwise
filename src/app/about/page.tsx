
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Weatherwise',
  description: 'Learn about the features and technology behind the Weatherwise application.',
};

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
    <span className="text-muted-foreground">{children}</span>
  </li>
);

export default function AboutPage() {
  const techStack = [
    'Next.js', 'React', 'TypeScript', 'Tailwind CSS',
    'ShadCN UI', 'Genkit', 'Firebase', 'Clerk'
  ];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12">
      <Card className="w-full max-w-4xl mx-auto bg-glass border-primary/20 shadow-2xl rounded-2xl">
        <CardHeader className="text-center items-center pt-8 pb-4">
          <CardTitle className="text-3xl sm:text-4xl font-headline font-bold text-primary">
            About Weatherwise
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2 max-w-2xl">
            Your intelligent companion for real-time weather data, AI-powered insights, and a highly customizable alert system.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8 space-y-8">
          <section>
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 border-b pb-2">
              Core Features
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <FeatureItem>Dynamic weather dashboard with automatic location detection.</FeatureItem>
              <FeatureItem>Interactive 24-hour forecast chart to visualize temperature trends.</FeatureItem>
              <FeatureItem>AI-powered natural language search for cities and landmarks.</FeatureItem>
              <FeatureItem>Conversational weather summaries and creative activity suggestions.</FeatureItem>
              <FeatureItem>Intelligent, customizable email alerts with scheduling and sensitivity controls.</FeatureItem>
              <FeatureItem>Live weather updates for all your favorite cities at a glance.</FeatureItem>
              <FeatureItem>Secure user authentication and profile management.</FeatureItem>
              <FeatureItem>Modern, responsive UI with light and dark modes.</FeatureItem>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 border-b pb-2">
              Technology Stack
            </h2>
            <p className="text-muted-foreground mb-4">
              Weatherwise is built with a modern tech stack designed for performance, scalability, and a superior developer experience.
            </p>
            <div className="flex flex-wrap gap-2">
              {techStack.map(tech => (
                <Badge key={tech} variant="secondary" className="text-sm">
                  {tech}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-headline font-semibold text-foreground mb-4 border-b pb-2">
              Our Mission
            </h2>
            <p className="text-muted-foreground">
              Our goal is to provide a weather application that is not only accurate and reliable but also a joy to use. By leveraging the power of generative AI, we aim to deliver insights that go beyond raw data, helping you plan your day more effectively.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
