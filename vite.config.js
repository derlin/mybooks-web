import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import authCallbackPlugin from './vite-auth-callback-plugin.js';
import path from 'path';

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
  },
  build: {
    rollupOptions: {
      external: [/\.test\.js$/, /\.spec\.js$/],
    },
  },
});
