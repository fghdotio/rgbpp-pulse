import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.version': '"v16.0.0"',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      stream: 'stream-browserify',
      util: 'util',
      events: 'events',
      buffer: 'buffer',
      // Force ESM source (root index.js) instead of CJS dist
      '@bitcoinerlab/secp256k1': '@bitcoinerlab/secp256k1/index.js',
    },
  },
  optimizeDeps: {
    include: [
      'buffer', 'process', 'stream-browserify', 'util', 'events',
      '@bitcoinerlab/secp256k1', 'ecpair', 'bitcoinjs-lib',
    ],
  },
})
