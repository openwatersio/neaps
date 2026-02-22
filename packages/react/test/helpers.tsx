import { inject } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { NeapsProvider } from "../src/provider.js";
import type { ReactNode } from "react";

export function createTestWrapper({ baseUrl }: { baseUrl?: string } = {}) {
  const url = baseUrl ?? inject("apiBaseUrl");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <NeapsProvider baseUrl={url} queryClient={queryClient}>
        {children}
      </NeapsProvider>
    );
  };
}
