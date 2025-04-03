/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', 'three-stdlib', '@react-three/fiber', '@react-three/drei', '@react-three/xr'],
  webpack: (config) => {
    // Mejorar el soporte para Three.js y three-stdlib
    config.resolve.alias = {
      ...config.resolve.alias,
      'three': require.resolve('three'),
    }
    
    // Asegurarnos de que next.js puede resolver los módulos JSM de three
    config.resolve.extensions.push('.js', '.jsx', '.json', '.ts', '.tsx', '.mjs')
    
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
    ]
  },
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
  basePath: '',
  images: {
    unoptimized: true,
  },
  // Ignorar errores de TypeScript durante la compilación
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignorar errores de ESLint durante la compilación
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 