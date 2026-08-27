import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30 * 1000 },
  },
});

// undefined.length 등 TypeError 방지: 전역 에러 핸들러로 로깅 (앱 먹통 방지)
window.addEventListener('error', (e) => {
  if (e.message?.includes("Cannot read properties of undefined") || e.message?.includes("reading 'length'")) {
    console.error('[CSIN-Tech] 방어 필요:', e.message, e.filename, e.lineno);
  }
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message ?? String(e.reason);
  if (msg?.includes?.("Cannot read properties of undefined") || msg?.includes?.("reading 'length'")) {
    console.error('[CSIN-Tech] Unhandled rejection:', msg);
  }
});

const rootEl = document.getElementById('root')!;
rootEl.style.height = '100%';
rootEl.style.minHeight = '100vh';

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
