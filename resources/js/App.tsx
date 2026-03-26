import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { AppRouter } from './src/router/router';
import { Toaster } from '@/src/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import '../css/app.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            5 * 60 * 1000, // 5 minutes
      gcTime:               15 * 60 * 1000,  // ← increase from 10 to 15
      
      retry:                1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: "always",
      placeholderData:      (prev: unknown) => prev,  // ← ADD THIS
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
        <Toaster />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;