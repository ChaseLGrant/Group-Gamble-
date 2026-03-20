/** @type {import('next').NextConfig} */
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
let appHost;
try {
  if (appUrl) appHost = new URL(appUrl).host;
} catch { /* ignore invalid URL */ }

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google OAuth avatars
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        appHost,
        process.env.VERCEL_URL,
        process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
      ].filter(Boolean),
    },
  },
};

module.exports = nextConfig;
