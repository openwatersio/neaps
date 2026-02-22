import { createContext, useContext, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Units } from "./types.js";

export interface NeapsConfig {
  baseUrl: string;
  units: Units;
  datum?: string;
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
  queryClient?: QueryClient;
  children: ReactNode;
}

export function NeapsProvider({
  baseUrl,
  units = "meters",
  datum,
  queryClient,
  children,
}: NeapsProviderProps) {
  const config: NeapsConfig = { baseUrl, units, datum };

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
