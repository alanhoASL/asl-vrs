import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Project site: https://alanhoasl.github.io/asl-vrs/
  base: process.env.GITHUB_PAGES === 'true' ? '/asl-vrs/' : '/',
  server: { port: 5173 },
});
