import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Units } from "./types.js";
import { getDefaultUnits } from "./utils/defaults.js";

const defaultLocale = typeof navigator !== "undefined" ? navigator.language : "en-US";

export interface NeapsConfig {
  baseUrl: string;
  units: Units;
  datum?: string;
  timezone?: string;
  locale: string;
}

export type NeapsConfigUpdater = (
  patch: Partial<Pick<NeapsConfig, "units" | "datum" | "timezone" | "locale">>,
) => void;

interface NeapsContextValue {
  config: NeapsConfig;
  updateConfig: NeapsConfigUpdater;
}

const NeapsContext = createContext<NeapsContextValue | null>(null);

const SETTINGS_KEY = "neaps-settings";
type PersistedSettings = Partial<Pick<NeapsConfig, "units" | "datum" | "timezone" | "locale">>;

function loadSettings(): PersistedSettings {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: PersistedSettings): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
  } catch {
    // Ignore localStorage errors (quota, SSR, etc.)
  }
}

/** Create a new QueryClient with the standard neaps defaults. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let defaultQueryClient: QueryClient | null = null;

function getDefaultQueryClient(): QueryClient {
  // On the server, always return a fresh client to prevent cross-request data leakage.
  if (typeof window === "undefined") return createQueryClient();
  if (!defaultQueryClient) defaultQueryClient = createQueryClient();
  return defaultQueryClient;
}

export interface NeapsProviderProps {
  baseUrl: string;
  units?: Units;
  datum?: string;
  timezone?: string;
  locale?: string;
  queryClient?: QueryClient;
  children: ReactNode;
}

export function NeapsProvider({
  baseUrl,
  units: initialUnits = getDefaultUnits(),
  datum: initialDatum,
  timezone: initialTimezone,
  locale: initialLocale = defaultLocale,
  queryClient,
  children,
}: NeapsProviderProps) {
  // Start with empty overrides to match the server render.
  // localStorage is read in useEffect to avoid hydration mismatches.
  const [overrides, setOverrides] = useState<PersistedSettings>({});

  useEffect(() => {
    const saved = loadSettings();
    if (Object.keys(saved).length > 0) {
      setOverrides(saved);
    }
  }, []);

  const config = useMemo<NeapsConfig>(
    () => ({
      baseUrl,
      units: overrides.units ?? initialUnits,
      datum: overrides.datum ?? initialDatum,
      timezone: overrides.timezone ?? initialTimezone,
      locale: overrides.locale ?? initialLocale,
    }),
    [baseUrl, initialUnits, initialDatum, initialTimezone, initialLocale, overrides],
  );

  const updateConfig = useCallback<NeapsConfigUpdater>((patch) => {
    setOverrides((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const contextValue = useMemo<NeapsContextValue>(
    () => ({ config, updateConfig }),
    [config, updateConfig],
  );

  return (
    <NeapsContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient ?? getDefaultQueryClient()}>
        {children}
      </QueryClientProvider>
    </NeapsContext.Provider>
  );
}

export function useNeapsConfig(): NeapsConfig {
  const ctx = useContext(NeapsContext);
  if (!ctx) {
    throw new Error("useNeapsConfig must be used within a <NeapsProvider>");
  }
  return ctx.config;
}

export function useUpdateConfig(): NeapsConfigUpdater {
  const ctx = useContext(NeapsContext);
  if (!ctx) {
    throw new Error("useUpdateConfig must be used within a <NeapsProvider>");
  }
  return ctx.updateConfig;
}
