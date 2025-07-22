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
  // Force cache busting with multiple strategies
  generateBuildId: async () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `build-${timestamp}-${random}`
  },
  // Disable all caching
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    optimizeCss: false
  },
  // Force recompilation
  webpack: (config, { isServer }) => {
    config.cache = false
    return config
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