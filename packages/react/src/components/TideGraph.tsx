import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AreaClosed, LinePath } from "@visx/shape";
import { AxisTop, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { curveNatural } from "@visx/curve";
import { useTooltip } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { bisector } from "d3-array";

import { useTideChunks } from "../hooks/use-tide-chunks.js";
import { useCurrentLevel } from "../hooks/use-current-level.js";
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
  datum?: string;
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
  datum,
  locale,
  svgWidth,
  yDomainOverride,
  latitude,
  longitude,
  className,
}: {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  timezone: string;
  units: Units;
  datum?: string;
  locale: string;
  svgWidth: number;
  yDomainOverride?: [number, number];
  latitude?: number;
  longitude?: number;
  className?: string;
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

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      if (event.pointerType === "touch") return;
      const point = localPoint(event);
      if (!point) return;
      const x0 = xScale.invert(point.x - MARGIN.left).getTime();
      const idx = timelineBisector(timeline, x0, 1);
      const d0 = timeline[idx - 1];
      const d1 = timeline[idx];
      if (!d0) return;
      const d = d1 && x0 - new Date(d0.time).getTime() > new Date(d1.time).getTime() - x0 ? d1 : d0;
      showTooltip({ tooltipData: d });
    },
    [xScale, timeline, showTooltip],
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
        {(() => {
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
        {extremes.map((e, i) => {
          const cx = xScale(new Date(e.time).getTime());
          const cy = yScale(e.level);
          return (
            <g key={i}>
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
          onPointerLeave={hideTooltip}
        />
      </Group>
    </svg>
  );
}

// ─── Y-axis overlay (stays fixed on the left while chart scrolls) ───────────

function YAxisOverlay({
  yScale,
  innerH,
  narrowRange,
  unitSuffix,
  datum,
}: {
  yScale: ReturnType<typeof useTideScales>["yScale"];
  innerH: number;
  narrowRange: boolean;
  unitSuffix: string;
  datum?: string;
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
    datum,
  } = useTideChunks({ id });

  const totalMs = dataEnd - dataStart;
  const totalDays = totalMs / MS_PER_DAY;
  const svgWidth = Math.max(1, totalDays * pxPerDay + MARGIN.left + MARGIN.right);

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

  // Scroll to "now" on initial data load
  useEffect(() => {
    if (hasScrolledToNow.current || !timeline.length || !scrollRef.current) return;
    const container = scrollRef.current;
    const nowMs = Date.now();
    const nowFraction = (nowMs - dataStart) / totalMs;
    const nowPx = nowFraction * (svgWidth - MARGIN.left - MARGIN.right) + MARGIN.left;
    container.scrollLeft = nowPx - container.clientWidth / 2;
    hasScrolledToNow.current = true;
    prevDataStartRef.current = dataStart;
    prevScrollWidthRef.current = container.scrollWidth;
  }, [timeline.length, dataStart, totalMs, svgWidth]);

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

  // Track whether "now" is visible and which direction it is
  const [todayDirection, setTodayDirection] = useState<"left" | "right" | null>(null);

  const getNowPx = useCallback(() => {
    const nowMs = Date.now();
    return ((nowMs - dataStart) / totalMs) * (svgWidth - MARGIN.left - MARGIN.right) + MARGIN.left;
  }, [dataStart, totalMs, svgWidth]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    function onScroll() {
      const nowPx = getNowPx();
      const left = container!.scrollLeft;
      const right = left + container!.clientWidth;
      if (nowPx < left) setTodayDirection("left");
      else if (nowPx > right) setTodayDirection("right");
      else setTodayDirection(null);
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [getNowPx]);

  // Scroll to now handler
  const scrollToNow = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ left: getNowPx() - container.clientWidth / 2, behavior: "smooth" });
  }, [getNowPx]);

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
          innerH={innerH}
          narrowRange={narrowRange}
          unitSuffix={unitSuffix}
          datum={datum}
        />

        {/* Today button — fades in when today is out of view, positioned toward today */}
        <button
          type="button"
          onClick={scrollToNow}
          className={`absolute -translate-y-1/2 px-2 py-1 text-xs font-medium rounded-md border border-(--neaps-border) bg-(--neaps-bg) text-(--neaps-text-muted) hover:text-(--neaps-text) hover:border-(--neaps-primary) cursor-pointer transition-all duration-300 ${todayDirection ? "opacity-100" : "opacity-0 pointer-events-none"} ${todayDirection === "left" ? "left-16" : "right-2"}`}
          style={{ top: MARGIN.top + (HEIGHT - MARGIN.top - MARGIN.bottom) / 2 }}
          aria-label="Scroll to current time"
        >
          {todayDirection === "left" ? "\u2190 Today" : "Today \u2192"}
        </button>
      </div>
    </div>
  );
}

// ─── Public component ───────────────────────────────────────────────────────

export function TideGraph(props: TideGraphProps) {
  const config = useNeapsConfig();
  const pxPerDay = props.pxPerDay ?? PX_PER_DAY_DEFAULT;

  // Data-driven mode: timeline/extremes passed directly (non-scrollable)
  if (props.timeline) {
    const { ref: containerRef, width: containerWidth } = useContainerWidth();
    return (
      <div ref={containerRef} className={`relative min-h-50 ${props.className ?? ""}`}>
        {containerWidth > 0 && (
          <TideGraphChart
            timeline={props.timeline}
            extremes={props.extremes ?? []}
            timezone={props.timezone ?? "UTC"}
            units={props.units ?? config.units}
            datum={props.datum}
            locale={config.locale}
            svgWidth={containerWidth}
          />
        )}
      </div>
    );
  }

  // Fetch mode: scrollable infinite chart
  return (
    <TideGraphScroll
      id={props.id}
      pxPerDay={pxPerDay}
      locale={config.locale}
      className={props.className}
    />
  );
}
