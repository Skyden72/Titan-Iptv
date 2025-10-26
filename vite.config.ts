import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { sourcemap: true },
  define: { 'process.env.NODE_ENV': JSON.stringify('development') }
});
