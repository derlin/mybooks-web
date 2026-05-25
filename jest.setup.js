// Mock import.meta.env for tests
global.import = {
  meta: {
    env: {
      VITE_DROPBOX_APP_KEY: 'test-app-key',
      VITE_DROPBOX_APP_SECRET: 'test-app-secret',
    },
  },
};
