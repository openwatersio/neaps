import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTooltip } from "@visx/tooltip";

import { useTideChunks } from "../../hooks/use-tide-chunks.js";
import { useCurrentLevel } from "../../hooks/use-current-level.js";
import { useTideScales } from "../../hooks/use-tide-scales.js";
import { TideGraphChart } from "./TideGraphChart.js";
import { YAxisOverlay } from "./YAxisOverlay.js";
import { HEIGHT, MARGIN, MS_PER_DAY } from "./constants.js";
import type { TimelineEntry } from "../../types.js";

export function TideGraphScroll({
  id,
  pxPerDay,
  locale,
  className,
}: {
  id: string;
  pxPerDay: number;
  locale: string;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevDataStartRef = useRef<number | null>(null);
  const prevScrollWidthRef = useRef<number | null>(null);
  const hasScrolledToNow = useRef(false);

  const {
    timeline,
    extremes,
    dataStart,
    dataEnd,
    yDomain,
    loadPrevious,
    loadNext,
    isLoadingPrevious,
    isLoadingNext,
    isLoading,
    error,
    station,
    timezone,
    units,
  } = useTideChunks({ id });

  const totalMs = dataEnd - dataStart;
  const totalDays = totalMs / MS_PER_DAY;
  const svgWidth = Math.max(1, totalDays * pxPerDay + MARGIN.left + MARGIN.right);
  const innerW = svgWidth - MARGIN.left - MARGIN.right;

  // Y-axis scales (for the overlay)
  const { yScale } = useTideScales({
    timeline,
    extremes,
    width: svgWidth,
    height: HEIGHT,
    margin: MARGIN,
    yDomainOverride: yDomain,
    domainOverride: { xMin: dataStart, xMax: dataEnd },
  });

  const narrowRange = useMemo(() => {
    const range = yDomain[1] - yDomain[0];
    return range > 0 && range < 3;
  }, [yDomain]);

  const unitSuffix = units === "feet" ? "ft" : "m";

  // Annotation state: entries, not timestamps
  const currentLevel = useCurrentLevel(timeline);
  const { tooltipData, showTooltip, hideTooltip } = useTooltip<TimelineEntry>();
  const [pinnedEntry, setPinnedEntry] = useState<TimelineEntry | null>(null);
  const activeEntry = tooltipData ?? pinnedEntry ?? currentLevel;

  const handleSelect = useCallback(
    (entry: TimelineEntry | null, sticky?: boolean) => {
      if (sticky) setPinnedEntry(entry);
      else if (entry) showTooltip({ tooltipData: entry });
      else hideTooltip();
    },
    [showTooltip, hideTooltip],
  );

  // Position of "now" in SVG coordinates (for today-button visibility)
  const nowMs = currentLevel ? new Date(currentLevel.time).getTime() : null;
  const nowPx = useMemo(() => {
    if (nowMs === null) return null;
    return ((nowMs - dataStart) / totalMs) * innerW + MARGIN.left;
  }, [nowMs, dataStart, totalMs, innerW]);

  // Scroll to "now" on initial data load
  useEffect(() => {
    if (hasScrolledToNow.current || !timeline.length || !scrollRef.current) return;
    const container = scrollRef.current;
    const nowPx = ((Date.now() - dataStart) / totalMs) * innerW + MARGIN.left;
    container.scrollLeft = nowPx - container.clientWidth / 2;
    hasScrolledToNow.current = true;
    prevDataStartRef.current = dataStart;
    prevScrollWidthRef.current = container.scrollWidth;
  }, [timeline.length, dataStart, totalMs, innerW]);

  // Preserve scroll position when chunks prepend (leftward)
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || prevDataStartRef.current === null || prevScrollWidthRef.current === null)
      return;
    if (dataStart < prevDataStartRef.current) {
      const widthAdded = container.scrollWidth - prevScrollWidthRef.current;
      container.scrollLeft += widthAdded;
    }
    prevDataStartRef.current = dataStart;
    prevScrollWidthRef.current = container.scrollWidth;
  }, [dataStart]);

  // Sentinel-based edge detection
  const leftSentinelRef = useRef<HTMLDivElement>(null);
  const rightSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const leftSentinel = leftSentinelRef.current;
    const rightSentinel = rightSentinelRef.current;
    if (!container || !leftSentinel || !rightSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === leftSentinel) loadPrevious();
          if (entry.target === rightSentinel) loadNext();
        }
      },
      { root: container, rootMargin: `0px ${pxPerDay}px` },
    );

    observer.observe(leftSentinel);
    observer.observe(rightSentinel);
    return () => observer.disconnect();
  }, [loadPrevious, loadNext, pxPerDay]);

  // Today button direction
  const [todayDirection, setTodayDirection] = useState<"left" | "right" | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    function onScroll() {
      const sl = container!.scrollLeft;
      const w = container!.clientWidth;

      if (pinnedEntry && nowMs !== null) {
        const pinnedMs = new Date(pinnedEntry.time).getTime();
        setTodayDirection(pinnedMs < nowMs ? "right" : "left");
      } else if (nowPx !== null) {
        const nowVx = nowPx - sl;
        if (nowVx < 60) setTodayDirection("left");
        else if (nowVx > w - 10) setTodayDirection("right");
        else setTodayDirection(null);
      } else {
        setTodayDirection(null);
      }

      // Clear pinned entry when it scrolls far out of view
      if (pinnedEntry) {
        const pinnedMs = new Date(pinnedEntry.time).getTime();
        const pinnedPx = ((pinnedMs - dataStart) / totalMs) * innerW + MARGIN.left;
        const pvx = pinnedPx - sl;
        if (pvx < -w || pvx > 2 * w) {
          setPinnedEntry(null);
        }
      }
    }

    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [nowPx, nowMs, pinnedEntry, dataStart, totalMs, innerW]);

  // Scroll to now handler
  const scrollToNow = useCallback(() => {
    setPinnedEntry(null);
    const container = scrollRef.current;
    if (!container) return;
    const nowPx = ((Date.now() - dataStart) / totalMs) * innerW + MARGIN.left;
    container.scrollTo({ left: nowPx - container.clientWidth / 2, behavior: "smooth" });
  }, [dataStart, totalMs, innerW]);

  if (isLoading && !timeline.length) {
    return (
      <div className={`p-4 text-center text-sm text-(--neaps-text-muted) ${className ?? ""}`}>
        Loading tide data...
      </div>
    );
  }

  if (error && !timeline.length) {
    return (
      <div className={`p-4 text-center text-sm text-red-500 ${className ?? ""}`}>
        {error.message}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden border border-(--neaps-border) rounded-md">
        {/* Scrollable chart area */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide"
          tabIndex={0}
          role="region"
          aria-label="Tide level graph, scrollable"
        >
          <div className="relative">
            {/* Left sentinel */}
            <div ref={leftSentinelRef} className="absolute top-0 w-px h-px left-0" />

            <TideGraphChart
              timeline={timeline}
              extremes={extremes}
              timezone={timezone}
              units={units}
              locale={locale}
              svgWidth={svgWidth}
              yDomainOverride={yDomain}
              latitude={station?.latitude}
              longitude={station?.longitude}
              activeEntry={activeEntry}
              onSelect={handleSelect}
            />

            {/* Right sentinel */}
            <div ref={rightSentinelRef} className="absolute right-0 top-0 w-px h-px" />
          </div>

          {/* Edge loading indicators */}
          {isLoadingPrevious && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 text-xs text-(--neaps-text-muted)">
              Loading...
            </div>
          )}
          {isLoadingNext && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-(--neaps-text-muted)">
              Loading...
            </div>
          )}
        </div>

        {/* Right edge fade */}
        <div className="absolute top-0 bottom-0 w-10 right-0 pointer-events-none bg-linear-to-l from-(--neaps-bg) to-transparent" />

        {/* Y-axis overlay (fixed left) */}
        <YAxisOverlay yScale={yScale} narrowRange={narrowRange} unitSuffix={unitSuffix} />

        {/* Today button — fades in when now is off-screen or a point is pinned */}
        <button
          type="button"
          onClick={scrollToNow}
          className={`absolute px-2 py-1 text-xs font-medium rounded-md border border-(--neaps-border) bg-(--neaps-bg) text-(--neaps-text-muted) hover:text-(--neaps-text) hover:border-(--neaps-primary) cursor-pointer transition-all duration-300 ${todayDirection ? "opacity-100" : "opacity-0 pointer-events-none"} ${todayDirection === "left" ? "left-16" : "right-2"}`}
          style={{ top: MARGIN.top }}
          aria-label="Scroll to current time"
        >
          {todayDirection === "left" ? "\u2190 Now" : "Now \u2192"}
        </button>
      </div>
    </div>
  );
}
