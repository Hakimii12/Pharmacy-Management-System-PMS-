import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',

  build: {
    outDir: 'dist',

    // Target modern browsers — enables smaller, faster output
    target: 'es2015',

    // esbuild is faster than the default terser and produces comparably small output
    minify: 'esbuild',

    // Warn when any individual chunk exceeds 500 kB
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy:
         *
         * - "vendor-react"  : React core + DOM + Router (changes rarely, long-lived cache)
         * - "vendor-charts" : Chart.js + react-chartjs-2 (heavy, separate cache)
         * - "vendor-motion" : Framer Motion (heavy animation library, separate cache)
         * - "vendor-ui"     : Icon libraries + toast (change independently)
         * - "vendor-misc"   : Everything else from node_modules
         *
         * App code (pages, components) is split automatically by React.lazy()
         * into per-route chunks.
         */
        manualChunks(id) {
          if (!id.includes('node_modules')) return; // let Rollup handle app code

          if (id.includes('react-dom') || id.includes('react-router')) {
            return 'vendor-react';
          }
          if (id.includes('react/')) {
            return 'vendor-react';
          }
          if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
            return 'vendor-charts';
          }
          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }
          if (
            id.includes('react-icons') ||
            id.includes('lucide-react') ||
            id.includes('react-toastify')
          ) {
            return 'vendor-ui';
          }
          // Everything else (axios, date-fns, etc.)
          return 'vendor-misc';
        },
      },
    },
  },

  // Speed up local dev server
  optimizeDeps: {
    // Pre-bundle heavy dependencies so HMR stays fast
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'framer-motion',
      'chart.js',
      'react-chartjs-2',
    ],
  },
})
