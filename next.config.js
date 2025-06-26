
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // This is the key fix. Genkit's tracing uses OpenTelemetry packages
    // that are not compatible with Webpack's static analysis.
    // We need to explicitly tell Next.js to treat them as external packages
    // on the server, so they are required at runtime instead of bundled at build time.
    serverComponentsExternalPackages: [
      '@opentelemetry/instrumentation',
      '@opentelemetry/sdk-node',
    ],
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

module.exports = nextConfig;
