import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import authCallbackPlugin from './vite-auth-callback-plugin.js';

const requiredEnvVars = ['VITE_DROPBOX_APP_KEY', 'VITE_DROPBOX_APP_SECRET'];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n\nCreate a .secrets file with:\nVITE_DROPBOX_APP_KEY=your_key\nVITE_DROPBOX_APP_SECRET=your_secret`
  );
}

export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [vue(), authCallbackPlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
