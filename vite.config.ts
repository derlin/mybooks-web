import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import authCallbackPlugin from './vite-auth-callback-plugin.js';
import path from 'path';
import { fileURLToPath } from 'url';

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
