import { inject } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { NeapsProvider, NeapsProviderProps } from "../src/provider.js";
import type { ReactNode } from "react";

export function createTestWrapper({
  baseUrl = inject("apiBaseUrl"),
  ...props
}: Partial<NeapsProviderProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <NeapsProvider baseUrl={baseUrl} queryClient={queryClient} {...props}>
        {children}
      </NeapsProvider>
    );
  };
}
