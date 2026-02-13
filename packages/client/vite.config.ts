import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  // Electron: base './'. 웹 배포(Docker) 시 VITE_BASE_URL='/' 로 빌드해 asset 절대 경로 사용
  base: process.env.VITE_BASE_URL ?? './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '^/(auth|users|rooms|org|files|announcement|events|polls|projects|bookmarks|mentions|link-preview|folders|ollama)': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
