import { inject } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { SlackwaterProvider, SlackwaterProviderProps } from "../src/provider.js";
import type { ReactNode } from "react";

export function createTestWrapper({
  baseUrl = inject("apiBaseUrl"),
  ...props
}: Partial<SlackwaterProviderProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return (
      <SlackwaterProvider baseUrl={baseUrl} queryClient={queryClient} {...props}>
        {children}
      </SlackwaterProvider>
    );
  };
}
