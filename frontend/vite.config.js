import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],

    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },

    // ── Dev server ────────────────────────────────────────────────────────
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET ?? 'http://localhost:8081',
          changeOrigin: true,
          secure: false,
        },
        '/oauth2': {
          target: env.VITE_PROXY_TARGET ?? 'http://localhost:8081',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ── Production build ──────────────────────────────────────────────────
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 600,

      rollupOptions: {
        output: {
          // Manual chunk splitting — keeps initial bundle small
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // Charts (largest dep — load separately)
            'vendor-recharts': ['recharts'],
            // Utilities
            'vendor-utils': ['axios', 'date-fns', 'clsx'],
            // Icons
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },

    // ── Preview (test production build locally) ───────────────────────────
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET ?? 'http://localhost:8081',
          changeOrigin: true,
        },
      },
    },
  }
})