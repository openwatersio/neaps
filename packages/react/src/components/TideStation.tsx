import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useStation } from "../hooks/use-station.js";
import { useExtremes } from "../hooks/use-extremes.js";
import { useTimeline } from "../hooks/use-timeline.js";
import { useContainerSize } from "../hooks/use-container-size.js";
import { useHashTab } from "../hooks/use-hash-tab.js";
import { useNeapsConfig } from "../provider.js";
import { TideConditions } from "./TideConditions.js";
import { TideGraph } from "./TideGraph/index.js";
import { TideTable } from "./TideTable.js";
import type { Extreme, Station, TimelineEntry, Units } from "../types.js";
import { TideStationHeader } from "./TideStationHeader.js";
import { StationDisclaimers } from "./StationDisclaimers.js";
import { TideSettings } from "./TideSettings.js";
import { getDefaultRange } from "../utils/defaults.js";

// Below either of these container dimensions the stacked layout can't fit,
// so the sections collapse into tabs (e.g. embedded as a dashboard widget).
const COMPACT_MAX_WIDTH = 500;
const COMPACT_MAX_HEIGHT = 500;

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type CompactReason = "width" | "height";

function evaluateCompact(el: HTMLElement, prev: CompactReason | null): CompactReason | null {
  const { clientWidth, clientHeight, scrollHeight } = el;
  if (clientWidth === 0) return prev;
  if (clientWidth < COMPACT_MAX_WIDTH) return "width";
  if (clientHeight >= COMPACT_MAX_HEIGHT) return null;
  // Below the height threshold. A content-sized container is always at least
  // as tall as its content, so a height this small with overflowing content
  // means an ancestor is constraining us (e.g. a fixed-size dashboard panel).
  // Stay collapsed once collapsed: the tabbed layout fits by design, so
  // overflow would never re-trigger.
  if (prev === "height") return "height";
  return scrollHeight > clientHeight + 1 ? "height" : null;
}

function useCompactLayout() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [reason, setReason] = useState<CompactReason | null>(null);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setReason((prev) => evaluateCompact(element, prev));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  // Re-evaluate after every render: swapping layouts changes the content size
  // without resizing the container, which ResizeObserver doesn't report.
  useIsomorphicLayoutEffect(() => {
    if (element) setReason((prev) => evaluateCompact(element, prev));
  });

  return { ref: setElement, compact: reason !== null };
}

type TabId = "conditions" | "graph" | "table" | "settings";

const TAB_LABELS: Record<TabId, string> = {
  conditions: "Conditions",
  graph: "Graph",
  table: "Table",
  settings: "Settings",
};

export interface TideStationProps {
  id: string;
  showGraph?: boolean;
  showTable?: boolean;
  className?: string;
}

export function TideStation({
  id,
  showGraph = true,
  showTable = true,
  className,
}: TideStationProps) {
  const config = useNeapsConfig();
  const range = useMemo(getDefaultRange, []);
  const { ref, compact } = useCompactLayout();

  const tabs = useMemo<TabId[]>(() => {
    const ids: TabId[] = ["conditions"];
    if (showGraph) ids.push("graph");
    if (showTable) ids.push("table");
    ids.push("settings");
    return ids;
  }, [showGraph, showTable]);
  const [activeTab, setActiveTab] = useHashTab<TabId>(tabs, "conditions");

  const station = useStation(id);
  const timeline = useTimeline({ id, start: range.start, end: range.end });
  const extremes = useExtremes({ id, start: range.start, end: range.end });

  if (station.isLoading || timeline.isLoading || extremes.isLoading) {
    return (
      <div
        ref={ref}
        className={`h-full bg-(--neaps-bg) border border-(--neaps-border) rounded-lg overflow-hidden p-4 text-center text-sm text-(--neaps-text-muted) ${className ?? ""}`}
      >
        Loading...
      </div>
    );
  }

  if (station.error || timeline.error || extremes.error) {
    const err = station.error ?? timeline.error ?? extremes.error;
    return (
      <div
        ref={ref}
        className={`h-full bg-(--neaps-bg) border border-(--neaps-border) rounded-lg overflow-hidden p-4 text-center text-sm text-red-500 ${className ?? ""}`}
      >
        {err!.message}
      </div>
    );
  }

  const s = station.data!;
  const units: Units = timeline.data?.units ?? config.units;
  const timezone = config.timezone ?? s.timezone;
  const timelineData = timeline.data?.timeline ?? [];
  const extremesData = extremes.data?.extremes ?? [];

  // Tabs only make sense when there is more than one section to show.
  const canTab = showGraph || showTable;

  if (canTab && compact) {
    return (
      <div
        ref={ref}
        className={`@container/station h-full min-h-0 bg-(--neaps-bg) flex flex-col gap-2 ${className ?? ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <TideStationHeader station={s} className="min-w-0 flex-1" />
          {/* At very narrow widths the tab bar collapses into this dropdown */}
          <TabsDropdown
            tabs={tabs}
            active={activeTab}
            onSelect={setActiveTab}
            className="@sm/station:hidden"
          />
        </div>
        <TideStationTabs
          id={id}
          station={s}
          timeline={timelineData}
          extremes={extremesData}
          units={units}
          timezone={timezone}
          tabs={tabs}
          active={activeTab}
          onSelect={setActiveTab}
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`@container/station h-full bg-(--neaps-bg) space-y-4 ${className ?? ""}`}
    >
      <TideStationHeader station={s} />

      <StationDisclaimers disclaimers={s.disclaimers} />

      <TideConditions
        timeline={timelineData}
        extremes={extremesData}
        units={units}
        timezone={timezone}
      />

      {showGraph && <TideGraph id={id} />}

      {showTable && <TideTable extremes={extremesData} timezone={timezone} units={units} />}

      <TideSettings station={s} />
    </div>
  );
}

function TideStationTabs({
  id,
  station,
  timeline,
  extremes,
  units,
  timezone,
  tabs,
  active,
  onSelect,
}: {
  id: string;
  station: Station;
  timeline: TimelineEntry[];
  extremes: Extreme[];
  units: Units;
  timezone: string;
  tabs: TabId[];
  active: TabId;
  onSelect: (tab: TabId) => void;
}) {
  const uid = useId();
  const tabRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const tabId = (tab: TabId) => `${uid}-tab-${tab}`;
  const panelId = (tab: TabId) => `${uid}-panel-${tab}`;

  function onKeyDown(event: React.KeyboardEvent) {
    const index = tabs.indexOf(active);
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    onSelect(tabs[next]);
    tabRefs.current[tabs[next]]?.focus();
  }

  function tabButton(tab: TabId) {
    const selected = tab === active;
    return (
      <button
        key={tab}
        ref={(el) => {
          tabRefs.current[tab] = el;
        }}
        type="button"
        role="tab"
        id={tabId(tab)}
        aria-selected={selected}
        aria-controls={panelId(tab)}
        aria-label={TAB_LABELS[tab]}
        title={TAB_LABELS[tab]}
        tabIndex={selected ? 0 : -1}
        onClick={() => onSelect(tab)}
        className={`px-3 py-2 border-b-2 -mb-px cursor-pointer transition-colors ${
          selected
            ? "border-(--neaps-primary) text-(--neaps-text)"
            : "border-transparent text-(--neaps-text-muted) hover:text-(--neaps-text)"
        }`}
      >
        <TabIcon tab={tab} />
      </button>
    );
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Tide station sections"
        onKeyDown={onKeyDown}
        className="hidden @sm/station:flex items-center border-b border-(--neaps-border)"
      >
        {tabs.filter((tab) => tab !== "settings").map(tabButton)}
        <span className="flex-1" />
        {tabButton("settings")}
      </div>

      <div
        role="tabpanel"
        id={panelId(active)}
        aria-labelledby={tabId(active)}
        tabIndex={0}
        className={`flex-1 min-h-0 ${active === "settings" ? "overflow-y-auto" : "overflow-hidden"}`}
      >
        {active === "conditions" && (
          <TideConditions
            timeline={timeline}
            extremes={extremes}
            units={units}
            timezone={timezone}
            fill
          />
        )}
        {active === "graph" && <GraphPanel id={id} />}
        {active === "table" && (
          <TideTable extremes={extremes} timezone={timezone} units={units} fill />
        )}
        {active === "settings" && (
          <div className="space-y-4">
            <TideSettings station={station} />
            <StationDisclaimers disclaimers={station.disclaimers} />
          </div>
        )}
      </div>
    </>
  );
}

// Replaces the tab bar when the container is too narrow for it: a visually
// combined icon + chevron with an invisible native select on top, so picking
// a section keeps native dropdown behavior and accessibility.
function TabsDropdown({
  tabs,
  active,
  onSelect,
  className,
}: {
  tabs: TabId[];
  active: TabId;
  onSelect: (tab: TabId) => void;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      <span
        aria-hidden="true"
        className="flex items-center gap-1 px-2 py-1.5 rounded-md border border-(--neaps-border) text-(--neaps-text-muted)"
      >
        <TabIcon tab={active} />
        <svg
          viewBox="0 0 24 24"
          width={12}
          height={12}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
      <select
        value={active}
        onChange={(event) => onSelect(event.target.value as TabId)}
        aria-label="Section"
        className="absolute inset-0 w-full opacity-0 cursor-pointer"
      >
        {tabs.map((tab) => (
          <option key={tab} value={tab}>
            {TAB_LABELS[tab]}
          </option>
        ))}
      </select>
    </div>
  );
}

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  // Clock — current conditions
  conditions: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z"
      />
    </svg>
  ),
  // Tide curve over a datum line
  graph: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5}>
        <path d="M21 9.011C21 12.001 20.087 21 16.177 21c-2.045 0-3.343-3.62-4.177-9S9.868 3 7.823 3C3.913 3 3 12 3 14.989" />
        <path strokeLinejoin="round" d="M2 12h3m3 0h2m4 0h2m3 0h3" />
      </g>
    </svg>
  ),
  // Bulleted rows
  table: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 9q-.425 0-.712-.288T7 8t.288-.712T8 7h12q.425 0 .713.288T21 8t-.288.713T20 9zm0 4q-.425 0-.712-.288T7 12t.288-.712T8 11h12q.425 0 .713.288T21 12t-.288.713T20 13zm0 4q-.425 0-.712-.288T7 16t.288-.712T8 15h12q.425 0 .713.288T21 16t-.288.713T20 17zM4 9q-.425 0-.712-.288T3 8t.288-.712T4 7t.713.288T5 8t-.288.713T4 9m0 4q-.425 0-.712-.288T3 12t.288-.712T4 11t.713.288T5 12t-.288.713T4 13m0 4q-.425 0-.712-.288T3 16t.288-.712T4 15t.713.288T5 16t-.288.713T4 17"
      />
    </svg>
  ),
  // Horizontal sliders
  settings: (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 4h-7" />
      <path d="M10 4H3" />
      <path d="M21 12h-9" />
      <path d="M8 12H3" />
      <path d="M21 20h-5" />
      <path d="M12 20H3" />
      <path d="M14 2v4" />
      <path d="M8 10v4" />
      <path d="M16 18v4" />
    </svg>
  ),
};

function TabIcon({ tab }: { tab: TabId }) {
  return <>{TAB_ICONS[tab]}</>;
}

// The graph renders at a fixed pixel height, so measure the panel and let
// the chart fill it (minus its border) instead of the default height.
function GraphPanel({ id }: { id: string }) {
  const { ref, height } = useContainerSize();
  return (
    <div ref={ref} className="h-full min-h-0">
      {height > 0 && <TideGraph id={id} height={Math.max(140, Math.floor(height) - 2)} />}
    </div>
  );
}
