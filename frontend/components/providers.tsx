"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { VisitorTracker } from "@/components/visitor-tracker";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          const status = error instanceof Error && "status" in error ? Number((error as { status?: number }).status) : 0;
          return status >= 400 && status < 500 ? false : failureCount < 2;
        },
      },
    },
  }));

  return <QueryClientProvider client={queryClient}><VisitorTracker />{children}</QueryClientProvider>;
}
