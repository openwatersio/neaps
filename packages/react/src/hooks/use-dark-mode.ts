import { useEffect, useState } from "react";

/**
 * Tracks dark mode state via `.dark` class on `<html>` and `prefers-color-scheme` media query.
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    };

    // Watch for .dark class changes on <html>
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Watch for system preference changes
    mq.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return isDark;
}
