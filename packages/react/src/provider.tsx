import { createContext, useContext, useMemo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Units } from "./types.js";

export interface NeapsConfig {
  baseUrl: string;
  units: Units;
  datum?: string;
  locale: string;
}

const NeapsContext = createContext<NeapsConfig | null>(null);

let defaultQueryClient: QueryClient | null = null;

function getDefaultQueryClient(): QueryClient {
  if (!defaultQueryClient) {
    defaultQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
  return defaultQueryClient;
}

export interface NeapsProviderProps {
  baseUrl: string;
  units?: Units;
  datum?: string;
  locale?: string;
  queryClient?: QueryClient;
  children: ReactNode;
}

export function NeapsProvider({
  baseUrl,
  units = "meters",
  datum,
  locale = typeof navigator !== "undefined" ? navigator.language : "en-US",
  queryClient,
  children,
}: NeapsProviderProps) {
  const config = useMemo<NeapsConfig>(
    () => ({ baseUrl, units, datum, locale }),
    [baseUrl, units, datum, locale],
  );

  return (
    <NeapsContext.Provider value={config}>
      <QueryClientProvider client={queryClient ?? getDefaultQueryClient()}>
        {children}
      </QueryClientProvider>
    </NeapsContext.Provider>
  );
}

export function useNeapsConfig(): NeapsConfig {
  const config = useContext(NeapsContext);
  if (!config) {
    throw new Error("useNeapsConfig must be used within a <NeapsProvider>");
  }
  return config;
}
