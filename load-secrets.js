import dotenv from 'dotenv';
import { spawn } from 'child_process';

dotenv.config({ path: '.secrets' });

const args = process.argv.slice(2);
const command = args[0] || 'dev';

const vite = spawn('vite', [command], {
  env: process.env,
  stdio: 'inherit',
});

vite.on('exit', (code) => {
  process.exit(code);
});
