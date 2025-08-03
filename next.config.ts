import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Enable static compilation for better Service Worker support
    forceSwcTransforms: true,
  },
  
  // Webpack configuration for ONNX Runtime and Web Workers
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Handle ONNX Runtime WASM files
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });

      // Resolve ONNX Runtime modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Set WASM MIME type
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
    }
    
    return config;
  },
  
  // Required headers for SharedArrayBuffer support (needed for whisper.cpp WASM) and ONNX Runtime
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp'
          },
          {
            key: 'Cross-Origin-Opener-Policy', 
            value: 'same-origin'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  },
};

export default nextConfig;
