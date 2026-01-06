
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 3000,
    strictPort: true
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 3000,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    target: 'esnext'
  }
});
