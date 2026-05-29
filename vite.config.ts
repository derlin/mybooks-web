import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import authCallbackPlugin from './vite-auth-callback-plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue(), authCallbackPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: ['localhost', '.ngrok-free.app'],
  },
  build: {
    rollupOptions: {
      external: [/\.test\.(js|ts)$/, /\.spec\.(js|ts)$/],
    },
  },
});
