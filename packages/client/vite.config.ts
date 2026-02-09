import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  // Electron 패키징 시 file:// 로 로드되므로 상대 경로 필수 (절대 경로면 흰 화면)
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: { port: 5173 },
});
