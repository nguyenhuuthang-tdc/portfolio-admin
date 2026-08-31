import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import { App } from './App';
import { normalizeApiError } from '@/lib/api-error';
import { showApiError } from '@/lib/api-error-toast';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (normalizeApiError(error).code === 'RATE_LIMITED') showApiError(error);
    },
  }),
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#e5e5e5',
            border: '1px solid #262626',
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
);
