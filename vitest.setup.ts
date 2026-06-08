// Mock import.meta.env for tests
globalThis.import = {
  meta: {
    env: {
      VITE_DROPBOX_APP_KEY: 'test-app-key',
      VITE_CORS_PROXY_URL: 'https://cors-proxy.example.com/proxy?url=',
    },
  },
};
