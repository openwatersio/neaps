import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AreaClosed, LinePath } from "@visx/shape";
import { AxisTop, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { curveNatural } from "@visx/curve";
import { useTooltip } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { bisector } from "d3-array";

import { useTideChunks } from "../hooks/use-tide-chunks.js";
import { useCurrentLevel, interpolateLevel } from "../hooks/use-current-level.js";
import { useNeapsConfig } from "../provider.js";
import { formatLevel, formatTime } from "../utils/format.js";
import { useTideScales, type Margin } from "../utils/scales.js";
import { getNightIntervals } from "../utils/sun.js";
import type { TimelineEntry, Extreme, Units } from "../types.js";

export interface TideGraphDataProps {
  timeline: TimelineEntry[];
  extremes?: Extreme[];
  timezone?: string;
  units?: Units;
}

export interface TideGraphFetchProps {
  id: string;
  timeline?: undefined;
}

export type TideGraphProps = (TideGraphDataProps | TideGraphFetchProps) & {
  pxPerDay?: number;
  className?: string;
};

const PX_PER_DAY_DEFAULT = 200;
const HEIGHT = 300;
const MARGIN: Margin = { top: 65, right: 0, bottom: 40, left: 60 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const timelineBisector = bisector<TimelineEntry, number>((d) => new Date(d.time).getTime()).left;

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

// ─── Static (data-driven) chart ─────────────────────────────────────────────

function TideGraphChart({
  timeline,
  extremes,
  timezone,
  units,
  locale,
  svgWidth,
  yDomainOverride,
  latitude,
  longitude,
  className,
  onSelect,
}: {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  timezone: string;
  units: Units;
  locale: string;
  svgWidth: number;
  yDomainOverride?: [number, number];
  latitude?: number;
  longitude?: number;
  className?: string;
  onSelect?: (entry: TimelineEntry | null, sticky?: boolean) => void;
}) {
  const gradientId = useId();
  const currentLevel = useCurrentLevel(timeline);

  const { xScale, yScale, innerW, innerH } = useTideScales({
    timeline,
    extremes,
    width: svgWidth,
    height: HEIGHT,
    margin: MARGIN,
    yDomainOverride,
  });

  const { showTooltip, hideTooltip, tooltipData } = useTooltip<TimelineEntry>();

  const findNearestEntry = useCallback(
    (event: React.PointerEvent<SVGRectElement>): TimelineEntry | null => {
      const point = localPoint(event);
      if (!point) return null;
      const x0 = xScale.invert(point.x - MARGIN.left).getTime();
      const idx = timelineBisector(timeline, x0, 1);
      const d0 = timeline[idx - 1];
      const d1 = timeline[idx];
      if (!d0) return null;
      return d1 && x0 - new Date(d0.time).getTime() > new Date(d1.time).getTime() - x0 ? d1 : d0;
    },
    [xScale, timeline],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (event.pointerType === "touch") return;
      const d = findNearestEntry(event);
      if (!d) return;
      if (onSelect) onSelect(d);
      else showTooltip({ tooltipData: d });
    },
    [findNearestEntry, showTooltip, onSelect],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (event.pointerType !== "touch") return;
      const d = findNearestEntry(event);
      if (d) onSelect?.(d, true);
    },
    [findNearestEntry, onSelect],
  );

  const nightIntervals = useMemo(() => {
    if (latitude == null || longitude == null || !timeline.length) return [];
    const [start, end] = xScale.domain();
    return getNightIntervals(latitude, longitude, start.getTime(), end.getTime());
  }, [latitude, longitude, timeline.length, xScale]);

  const zeroY = yScale(0);
  // A scale whose range()[0] is the zero line — used as AreaClosed baseline
  const zeroBaseScale = useMemo(() => ({ range: () => [zeroY, 0] }) as typeof yScale, [zeroY]);

  if (innerW <= 0 || svgWidth <= 0) return null;

  return (
    <svg width={svgWidth} height={HEIGHT} className={className} aria-label="Tide level graph">
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={0}
          y2={zeroY}
        >
          <stop offset="0%" stopColor="var(--neaps-primary)" stopOpacity={0.5} />
          <stop offset="100%" stopColor="var(--neaps-primary)" stopOpacity={0.05} />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-neg`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          x2="0"
          y1={zeroY}
          y2={innerH}
        >
          <stop offset="0%" stopColor="var(--neaps-danger)" stopOpacity={0.1} />
          <stop offset="100%" stopColor="var(--neaps-danger)" stopOpacity={0.5} />
        </linearGradient>
        <clipPath id={`${gradientId}-clip-pos`}>
          <rect x={0} y={0} width={innerW} height={Math.max(0, zeroY)} />
        </clipPath>
        <clipPath id={`${gradientId}-clip-neg`}>
          <rect
            x={0}
            y={Math.min(zeroY, innerH)}
            width={innerW}
            height={Math.max(0, innerH - zeroY)}
          />
        </clipPath>
      </defs>

      <Group left={MARGIN.left} top={MARGIN.top}>
        {/* Night bands */}
        {nightIntervals.map((interval, i) => {
          const x1 = xScale(interval.start);
          const x2 = xScale(interval.end);
          return (
            <rect
              key={i}
              x={x1}
              y={-MARGIN.top}
              width={x2 - x1}
              height={HEIGHT}
              fill="var(--neaps-night)"
            />
          );
        })}

        {/* Zero reference line */}
        <line
          x1={0}
          x2={innerW}
          y1={yScale(0)}
          y2={yScale(0)}
          stroke="var(--neaps-primary)"
          strokeWidth={1.5}
          strokeDasharray="1, 3"
          strokeOpacity={0.75}
        />

        {/* Area fill: positive (above zero) */}
        <AreaClosed
          data={timeline}
          x={(d) => xScale(new Date(d.time).getTime())}
          y={(d) => yScale(d.level)}
          yScale={zeroBaseScale}
          curve={curveNatural}
          fill={`url(#${gradientId})`}
          clipPath={`url(#${gradientId}-clip-pos)`}
        />
        {/* Area fill: negative (below zero) */}
        <AreaClosed
          data={timeline}
          x={(d) => xScale(new Date(d.time).getTime())}
          y={(d) => yScale(d.level)}
          yScale={zeroBaseScale}
          curve={curveNatural}
          fill={`url(#${gradientId}-neg)`}
          clipPath={`url(#${gradientId}-clip-neg)`}
        />
        <LinePath
          data={timeline}
          x={(d) => xScale(new Date(d.time).getTime())}
          y={(d) => yScale(d.level)}
          curve={curveNatural}
          stroke="var(--neaps-primary)"
          strokeWidth={2}
        />

        {/* Active point: shows hovered point, or current level when idle */}
        {!onSelect && (() => {
          const active = tooltipData ?? currentLevel;
          if (!active) return null;
          const x = xScale(new Date(active.time).getTime());
          return (
            <g>
              <line
                x1={x}
                x2={x}
                y1={0 - MARGIN.top}
                y2={innerH + MARGIN.bottom}
                stroke="var(--neaps-secondary)"
                opacity={0.75}
                strokeWidth={1.5}
              />
              <g transform={`translate(${x}, ${innerH / 2})`}>
                <rect
                  x={-36}
                  y={-18}
                  width={72}
                  height={36}
                  rx={6}
                  fill="var(--neaps-bg)"
                  fillOpacity={0.85}
                  stroke="var(--neaps-border)"
                  strokeWidth={1}
                  filter="drop-shadow(0 1px 3px rgba(0,0,0,0.1))"
                />
                <text textAnchor="middle" y={-4} fontSize={10} fill="var(--neaps-text-muted)">
                  {formatTime(active.time, timezone, locale)}
                </text>
                <text
                  className="tabular-nums"
                  textAnchor="middle"
                  y={12}
                  fontSize={14}
                  fontWeight={600}
                  fill="var(--neaps-text)"
                >
                  {formatLevel(active.level, units)}
                </text>
              </g>
            </g>
          );
        })()}

        {/* Extreme points + labels */}
        {extremes.map((e) => {
          const cx = xScale(new Date(e.time).getTime());
          const cy = yScale(e.level);
          return (
            <g key={e.time}>
              <circle
                cx={cx}
                cy={cy}
                r={4}
                fill={e.high ? "var(--neaps-high)" : "var(--neaps-low)"}
                stroke="var(--neaps-bg)"
                strokeWidth={2}
              />
              <text x={cx} y={e.high ? "-1.2em" : innerH - 5} textAnchor="middle">
                {e.high ? (
                  <>
                    <tspan x={cx} fontSize={14} fill="var(--neaps-text-muted)">
                      {formatTime(e.time, timezone, locale)}
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={16}
                      fontWeight={600}
                      fill="var(--neaps-high)"
                      className="tabular-nums"
                    >
                      {formatLevel(e.level, units)}
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={16}
                      fontWeight={600}
                      fill="var(--neaps-high)"
                    >
                      ⤒
                    </tspan>
                  </>
                ) : (
                  <>
                    <tspan x={cx} fontSize={16} fontWeight={600} fill="var(--neaps-low)">
                      ⤓
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={16}
                      fontWeight={600}
                      fill="var(--neaps-low)"
                      className="tabular-nums"
                    >
                      {formatLevel(e.level, units)}
                    </tspan>
                    <tspan
                      x={cx}
                      dy="1.2em"
                      fontSize={14}
                      fill="var(--neaps-text-muted)"
                    >
                      {formatTime(e.time, timezone, locale)}
                    </tspan>
                  </>
                )}
              </text>
            </g>
          );
        })}

        {/* Top axis — date ticks */}
        {(() => {
          const [start, end] = xScale.domain();
          const dates: Date[] = [];
          const d = new Date(start);
          d.setHours(12, 0, 0, 0);
          if (d.getTime() < start.getTime()) d.setDate(d.getDate() + 1);
          while (d <= end) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 1);
          }
          const fmt = new Intl.DateTimeFormat(locale, { timeZone: timezone, month: "short" });
          const months = dates.map((dt) => fmt.format(dt));

          return (
            <AxisTop
              scale={xScale}
              top={-40}
              tickLength={0}
              tickValues={dates}
              tickFormat={(v, i) => {
                const dt = new Date(v as Date);
                const showMonth = i === 0 || months[i] !== months[i - 1];
                return dt.toLocaleDateString(locale, {
                  weekday: "short",
                  day: "numeric",
                  month: showMonth ? "short" : undefined,
                  timeZone: timezone,
                });
              }}
              stroke="var(--neaps-border)"
              tickStroke="none"
              tickLabelProps={{
                fill: "var(--neaps-text-muted)",
                fontSize: 12,
                fontWeight: 600,
                textAnchor: "middle",
              }}
            />
          );
        })()}

        {/* Tooltip hit area */}
        <rect
          width={innerW}
          height={innerH}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => (onSelect ? onSelect(null) : hideTooltip())}
        />
      </Group>
    </svg>
  );
}

// ─── Y-axis overlay (stays fixed on the left while chart scrolls) ───────────

function YAxisOverlay({
  yScale,
  narrowRange,
  unitSuffix,
}: {
  yScale: ReturnType<typeof useTideScales>["yScale"];
  narrowRange: boolean;
  unitSuffix: string;
}) {
  return (
    <div
      className="absolute top-0 left-0 bottom-0 pointer-events-none"
      style={{
        width: 60,
        background: `linear-gradient(to right, var(--neaps-bg) 15px, transparent)`,
      }}
    >
      <svg width="60" height={HEIGHT}>
        <Group left={45} top={MARGIN.top}>
          <AxisLeft
            scale={yScale}
            stroke="none"
            tickStroke="none"
            numTicks={narrowRange ? 6 : 4}
            tickFormat={(v) =>
              `${narrowRange ? Number(v).toFixed(1) : Math.round(Number(v))} ${unitSuffix}`
            }
            tickLabelProps={{
              fill: "var(--neaps-text-muted)",
              fontSize: 12,
              textAnchor: "end",
              dy: 4,
              style: { fontVariantNumeric: "tabular-nums" },
            }}
          />
        </Group>
      </svg>
    </div>
  );
}

// ─── Scrollable chart (fetch mode) ──────────────────────────────────────────

function TideGraphScroll({
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
  const overlayRef = useRef<HTMLDivElement>(null);

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
  const { yScale, innerH } = useTideScales({
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

  // Unified annotation: hover > pinned > current level, clamped toward "now"
  const currentLevel = useCurrentLevel(timeline);
  const [hoverData, setHoverData] = useState<TimelineEntry | null>(null);
  const [pinnedData, setPinnedData] = useState<TimelineEntry | null>(null);
  const handleSelect = useCallback((entry: TimelineEntry | null, sticky?: boolean) => {
    if (sticky) setPinnedData(entry);
    else setHoverData(entry);
  }, []);

  // active: the conceptual anchor point (hover, pinned, or current moment)
  const active = hoverData ?? pinnedData ?? currentLevel;
  // displayedEntry: the interpolated level at the *clamped* overlay position,
  // which may differ from active when the overlay is pinned to a viewport edge.
  const [displayedEntry, setDisplayedEntry] = useState<TimelineEntry | null>(null);

  const activeX = useMemo(() => {
    if (!active) return null;
    const ms = new Date(active.time).getTime();
    return ((ms - dataStart) / totalMs) * innerW + MARGIN.left;
  }, [active, dataStart, totalMs, innerW]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    const overlay = overlayRef.current;
    if (!container || !overlay || activeX === null) return;

    const nowMs = currentLevel ? new Date(currentLevel.time).getTime() : null;
    const nowSvgX = nowMs !== null ? ((nowMs - dataStart) / totalMs) * innerW + MARGIN.left : null;
    const pinnedSvgX = pinnedData
      ? ((new Date(pinnedData.time).getTime() - dataStart) / totalMs) * innerW + MARGIN.left
      : null;

    function update() {
      const left = container!.scrollLeft;
      const w = container!.clientWidth;

      // Clamp the overlay to the viewport
      const vx = activeX! - left;
      const clamped = Math.max(100, Math.min(w - 50, vx));
      overlay!.style.left = `${clamped}px`;

      // Reverse-map the clamped position to a chart time and interpolate
      const svgX = clamped + left;
      const ms = ((svgX - MARGIN.left) / innerW) * totalMs + dataStart;
      const entry = interpolateLevel(timeline, ms);
      setDisplayedEntry((prev) => {
        if (prev?.time === entry?.time && prev?.level === entry?.level) return prev;
        return entry;
      });

      // Today direction: show button when pinned or when now is off-screen
      if (nowSvgX !== null) {
        const dir: "left" | "right" | null = pinnedData
          ? (new Date(pinnedData.time).getTime() > nowMs! ? "left" : "right")
          : nowSvgX < left ? "left"
          : nowSvgX > left + w ? "right"
          : null;
        setTodayDirection((prev) => (prev === dir ? prev : dir));
      }

      // Clear pinned point when it scrolls out of view
      if (pinnedSvgX !== null) {
        const pvx = pinnedSvgX - left;
        if (pvx < 0 || pvx > w) setPinnedData(null);
      }
    }

    update();
    container.addEventListener("scroll", update, { passive: true });
    return () => container.removeEventListener("scroll", update);
  }, [activeX, innerW, totalMs, dataStart, timeline, currentLevel, pinnedData]);

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

  const [todayDirection, setTodayDirection] = useState<"left" | "right" | null>(null);

  // Scroll to now handler
  const scrollToNow = useCallback(() => {
    setPinnedData(null);
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
        <YAxisOverlay
          yScale={yScale}
          narrowRange={narrowRange}
          unitSuffix={unitSuffix}
        />

        {/* Active level overlay (stays in viewport, clamps toward "now") */}
        {active && (
          <div
            ref={overlayRef}
            className="absolute top-0 pointer-events-none"
            style={{ height: HEIGHT, transform: "translateX(-50%)" }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: 1.5,
                marginLeft: -0.75,
                background: "var(--neaps-secondary)",
                opacity: 0.75,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: MARGIN.top + innerH / 2,
                transform: "translate(-50%, -50%)",
                background: "var(--neaps-bg)",
                border: "1px solid var(--neaps-border)",
                borderRadius: 6,
                padding: "3px 8px",
                textAlign: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                whiteSpace: "nowrap",
              }}
            >
              <div style={{ fontSize: 10, color: "var(--neaps-text-muted)", lineHeight: 1.4 }}>
                {displayedEntry ? formatTime(displayedEntry.time, timezone, locale) : ""}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--neaps-text)",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                }}
              >
                {displayedEntry ? formatLevel(displayedEntry.level, units) : ""}
              </div>
            </div>
          </div>
        )}

        {/* Today button — fades in when a pinned point is active */}
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

// ─── Data-driven (non-scrollable) chart ─────────────────────────────────────

function TideGraphStatic({
  timeline,
  extremes = [],
  timezone = "UTC",
  units,
  locale,
  className,
}: TideGraphDataProps & { locale: string; className?: string }) {
  const { ref: containerRef, width: containerWidth } = useContainerWidth();
  return (
    <div ref={containerRef} className={`relative min-h-50 ${className ?? ""}`}>
      {containerWidth > 0 && (
        <TideGraphChart
          timeline={timeline}
          extremes={extremes}
          timezone={timezone}
          units={units ?? "feet"}
          locale={locale}
          svgWidth={containerWidth}
        />
      )}
    </div>
  );
}

// ─── Public component ───────────────────────────────────────────────────────

export function TideGraph(props: TideGraphProps) {
  const config = useNeapsConfig();

  if (props.timeline) {
    return (
      <TideGraphStatic
        timeline={props.timeline}
        extremes={props.extremes}
        timezone={props.timezone}
        units={props.units ?? config.units}
        locale={config.locale}
        className={props.className}
      />
    );
  }

  return (
    <TideGraphScroll
      id={props.id}
      pxPerDay={props.pxPerDay ?? PX_PER_DAY_DEFAULT}
      locale={config.locale}
      className={props.className}
    />
  );
}
