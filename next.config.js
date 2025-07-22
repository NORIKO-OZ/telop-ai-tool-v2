/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js'
      }
    }
  },
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  // Force cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },
  // Headers for all API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig