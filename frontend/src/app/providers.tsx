'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { MapProvider } from '@/contexts/MapContext';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';

export function VaxTraceProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MapProvider>
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </MapProvider>
    </QueryClientProvider>
  );
}
