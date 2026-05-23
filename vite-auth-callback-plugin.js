import fs from 'fs';
import path from 'path';

export default function authCallbackPlugin() {
  return {
    name: 'auth-callback-plugin',

    configureServer(server) {
      // In dev: serve /auth-callback.html the same as /
      return () => {
        server.middlewares.use('/auth-callback.html', (req, res, next) => {
          req.url = '/';
          next();
        });
      };
    },

    writeBundle() {
      // After build: copy index.html to auth-callback.html
      const distDir = path.resolve(process.cwd(), 'dist');
      const indexPath = path.join(distDir, 'index.html');
      const callbackPath = path.join(distDir, 'auth-callback.html');

      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, callbackPath);
        console.log('✓ Created dist/auth-callback.html');
      }
    },
  };
}
