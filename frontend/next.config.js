const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/v1/:path*',
          destination: 'http://127.0.0.1:8000/api/v1/:path*',
        },
      ],
    }
  },
  reactStrictMode: true,
  swcMinify: true,
  httpAgentOptions: {
    keepAlive: false,
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000',
    BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
  },
}

module.exports = nextConfig
