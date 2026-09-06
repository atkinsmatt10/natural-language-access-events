/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  env: {
    TZ: 'America/Phoenix',
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    ] }];
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
