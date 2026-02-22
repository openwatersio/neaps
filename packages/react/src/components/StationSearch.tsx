import { useState, useRef, useCallback, useEffect, useId, type KeyboardEvent } from "react";

import { useStations } from "../hooks/use-stations.js";
import type { StationSummary } from "../types.js";

const RECENT_KEY = "neaps-recent-searches";
const MAX_RECENT = 5;

interface RecentSearch {
  id: string;
  name: string;
  region: string;
  country: string;
}

function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(station: StationSummary): void {
  try {
    const recent = getRecentSearches().filter((r) => r.id !== station.id);
    recent.unshift({
      id: station.id,
      name: station.name,
      region: station.region,
      country: station.country,
    });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // Ignore localStorage errors
  }
}

export interface StationSearchProps {
  onSelect: (station: StationSummary) => void;
  placeholder?: string;
  className?: string;
}

export function StationSearch({
  onSelect,
  placeholder = "Search stations...",
  className,
}: StationSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const instanceId = useId();
  const listboxId = `${instanceId}-results`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [] } = useStations(
    debouncedQuery.length >= 2 ? { query: debouncedQuery } : {},
  );

  const showResults = isOpen && debouncedQuery.length >= 2 && results.length > 0;
  const showRecent = isOpen && query.length === 0 && recentSearches.length > 0;

  const handleSelect = useCallback(
    (station: StationSummary) => {
      setQuery(station.name);
      setIsOpen(false);
      setActiveIndex(-1);
      saveRecentSearch(station);
      setRecentSearches(getRecentSearches());
      onSelect(station);
    },
    [onSelect],
  );

  const handleRecentSelect = useCallback(
    (recent: RecentSearch) => {
      setQuery(recent.name);
      setIsOpen(false);
      setActiveIndex(-1);
      onSelect({
        id: recent.id,
        name: recent.name,
        region: recent.region,
        country: recent.country,
        latitude: 0,
        longitude: 0,
        continent: "",
        timezone: "",
        type: "reference",
      });
    },
    [onSelect],
  );

  const dropdownItems = showResults ? results : [];
  const totalItems = showRecent ? recentSearches.length : dropdownItems.length;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showResults && !showRecent) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < totalItems) {
            if (showRecent) {
              handleRecentSelect(recentSearches[activeIndex]);
            } else {
              handleSelect(dropdownItems[activeIndex]);
            }
          }
          break;
        case "Escape":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [
      showResults,
      showRecent,
      dropdownItems,
      recentSearches,
      activeIndex,
      totalItems,
      handleSelect,
      handleRecentSelect,
    ],
  );

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay to allow click on result
          setTimeout(() => setIsOpen(false), 200);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-(--neaps-border) rounded-lg bg-(--neaps-bg) text-(--neaps-text) text-sm outline-none transition-colors focus:border-(--neaps-primary) focus:ring-3 focus:ring-(--neaps-primary)/20"
        role="combobox"
        aria-expanded={showResults || showRecent}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `${instanceId}-option-${activeIndex}` : undefined}
        autoComplete="off"
      />
      {showRecent && (
        <ul
          ref={listRef}
          id={listboxId}
          className="absolute top-full left-0 right-0 z-50 mt-1 p-1 list-none bg-(--neaps-bg) border border-(--neaps-border) rounded-lg shadow-md max-h-80 overflow-y-auto"
          role="listbox"
        >
          <li
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-(--neaps-text-muted)"
            role="presentation"
          >
            Recent
          </li>
          {recentSearches.map((recent, i) => (
            <li
              key={recent.id}
              id={`${instanceId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`flex flex-col px-3 py-2 rounded-md cursor-pointer ${
                i === activeIndex ? "bg-(--neaps-bg-subtle)" : "hover:bg-(--neaps-bg-subtle)"
              }`}
              onMouseDown={() => handleRecentSelect(recent)}
            >
              <span className="font-medium text-(--neaps-text)">{recent.name}</span>
              <span className="text-xs text-(--neaps-text-muted)">
                {[recent.region, recent.country].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {showResults && (
        <ul
          ref={listRef}
          id={listboxId}
          className="absolute top-full left-0 right-0 z-50 mt-1 p-1 list-none bg-(--neaps-bg) border border-(--neaps-border) rounded-lg shadow-md max-h-80 overflow-y-auto"
          role="listbox"
        >
          {results.map((station, i) => (
            <li
              key={station.id}
              id={`${instanceId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`flex flex-col px-3 py-2 rounded-md cursor-pointer ${
                i === activeIndex ? "bg-(--neaps-bg-subtle)" : "hover:bg-(--neaps-bg-subtle)"
              }`}
              onMouseDown={() => handleSelect(station)}
            >
              <span className="font-medium text-(--neaps-text)">{station.name}</span>
              <span className="text-xs text-(--neaps-text-muted)">
                {[station.region, station.country].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
