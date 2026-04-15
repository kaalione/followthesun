import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@followthesun/venue-data',
    '@followthesun/sun-engine',
    '@followthesun/map-core',
    '@followthesun/ui',
  ],
};

export default nextConfig;
