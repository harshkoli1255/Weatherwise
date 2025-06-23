
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@opentelemetry/instrumentation'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { webpack }) => {
    // This is to prevent a build error for a missing optional dependency in @opentelemetry/sdk-node
    // which is a dependency of genkit.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@opentelemetry\/exporter-(jaeger|zipkin)$/,
      })
    );
    return config;
  },
};

export default nextConfig;
