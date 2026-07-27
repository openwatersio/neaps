import { useCallback, useEffect, useState } from "react";

function readHash(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.hash.slice(1) || null;
}

/**
 * Tab selection synced with the URL hash so tabs are permalinkable
 * (e.g. `#graph` opens the Graph tab). Selecting a tab updates the
 * hash via `history.replaceState` to avoid polluting history or
 * triggering scroll jumps; external hash changes (links, back/forward)
 * are picked up via `hashchange`.
 *
 * `tabs` should be referentially stable (memoized by the caller).
 */
export function useHashTab<T extends string>(tabs: readonly T[], defaultTab: T) {
  const isTab = useCallback(
    (value: string | null): value is T => tabs.includes(value as T),
    [tabs],
  );

  const [active, setActiveState] = useState<T>(() => {
    const hash = readHash();
    return isTab(hash) ? hash : defaultTab;
  });

  useEffect(() => {
    function onHashChange() {
      const hash = readHash();
      if (isTab(hash)) setActiveState(hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [isTab]);

  const setActive = useCallback((tab: T) => {
    setActiveState(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(window.history.state, "", `#${tab}`);
    }
  }, []);

  // Fall back when the active tab disappears (e.g. showGraph turned off)
  const resolved = isTab(active) ? active : defaultTab;

  return [resolved, setActive] as const;
}
