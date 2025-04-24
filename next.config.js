/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    TZ: 'America/Phoenix',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-image-domain.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig