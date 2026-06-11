import { useMemo } from "react";
import { useCurrentLevel } from "../hooks/use-current-level.js";
import { useTimeline } from "../hooks/use-timeline.js";
import { useExtremes } from "../hooks/use-extremes.js";
import { useNeapsConfig } from "../provider.js";
import { formatLevel } from "../utils/format.js";
import { TideCycleGraph } from "./TideCycleGraph.js";
import type { Extreme, TimelineEntry, Units } from "../types.js";
import { HALF_TIDE_CYCLE_MS } from "../constants.js";

interface TideConditionsDataProps {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  units: Units;
  timezone: string;
}

interface TideConditionsFetchProps {
  id: string;
}

export type TideConditionsProps = (TideConditionsDataProps | TideConditionsFetchProps) & {
  showDate?: boolean;
  /** Fill the parent's height instead of using the default minimum height */
  fill?: boolean;
  className?: string;
};

const NEAR_EXTREME_MS = 10 * 60 * 1000;

function getNearestExtremes(extremes: Extreme[]): {
  current: Extreme | null;
  next: Extreme | null;
} {
  const now = Date.now();
  const nextIdx = extremes.findIndex((e) => e.time.getTime() > now);
  if (nextIdx === -1) return { current: null, next: null };

  const next = extremes[nextIdx];
  // If we're within 10 minutes of the next extreme, treat it as "now"
  if (next.time.getTime() - now <= NEAR_EXTREME_MS) {
    return { current: next, next: extremes[nextIdx + 1] ?? null };
  }

  // Also check the previous extreme
  if (nextIdx > 0) {
    const prev = extremes[nextIdx - 1];
    if (now - prev.time.getTime() <= NEAR_EXTREME_MS) {
      return { current: prev, next };
    }
  }

  return { current: null, next };
}

type TideState = "rising" | "falling" | "high" | "low";

const STATE_ICON: Record<TideState, { icon: string; label: string; color: string }> = {
  rising: { icon: "↗", label: "Rising", color: "text-(--neaps-high)" },
  falling: { icon: "↘", label: "Falling", color: "text-(--neaps-low)" },
  high: { icon: "⤒", label: "High tide", color: "text-(--neaps-high)" },
  low: { icon: "⤓", label: "Low tide", color: "text-(--neaps-low)" },
};

export function WaterLevelAtTime({
  label,
  level,
  time,
  units,
  locale,
  timezone,
  state,
  variant,
}: {
  label: string;
  level: number;
  time: Date;
  units: Units;
  locale: string;
  timezone?: string;
  state?: TideState;
  variant?: "left" | "right";
}) {
  const stateIcon = state ? STATE_ICON[state] : null;
  return (
    <div className={`flex flex-col${variant === "right" ? " items-end text-right" : ""}`}>
      <div
        className={`flex items-baseline gap-1 text-(--neaps-text-muted) text-2xs uppercase tracking-wide${variant === "right" ? " flex-row-reverse" : ""}`}
      >
        <span>{label}</span>
        {stateIcon && (
          <span
            role="img"
            className={`text-lg font-semibold ${stateIcon.color}`}
            aria-label={stateIcon.label}
          >
            {stateIcon.icon}
          </span>
        )}
      </div>
      <span
        className={`flex items-baseline gap-1 text-xl @md:text-2xl text-nowrap font-semibold tabular-nums text-(--neaps-text)${variant === "right" ? " flex-row-reverse" : ""}`}
      >
        {formatLevel(level, units)}
      </span>
      <span className="text-sm text-(--neaps-text-muted)">
        {time.toLocaleString(locale, {
          timeStyle: "short",
          timeZone: timezone,
        })}
      </span>
    </div>
  );
}

function TideConditionsStatic({
  timeline,
  extremes,
  units,
  timezone,
  showDate,
  fill,
  className,
}: TideConditionsDataProps & { showDate: boolean; fill?: boolean; className?: string }) {
  const { locale } = useNeapsConfig();
  const currentLevel = useCurrentLevel(timeline);
  const { current: nearExtreme, next: nextExtreme } = getNearestExtremes(extremes);

  if (!currentLevel) {
    return (
      <div className={`text-(--neaps-text) ${className ?? ""}`}>
        <h2 className="text-lg">No tide data available</h2>
      </div>
    );
  }

  const dateLabel = currentLevel.time.toLocaleString(locale, {
    dateStyle: "medium",
    timeZone: timezone,
  });

  return (
    <div className={`@container text-(--neaps-text) ${fill ? "h-full" : ""} ${className ?? ""}`}>
      <div
        className={`relative ${fill ? "h-full" : "min-h-60"} border border-(--neaps-border) rounded-md overflow-hidden`}
      >
        <TideCycleGraph timeline={timeline} extremes={extremes} className="absolute inset-0" />
        {showDate && (
          <div className="hidden @sm:block absolute top-0 left-0 m-4">
            <h2 className="text-lg font-semibold">{dateLabel}</h2>
          </div>
        )}
        <div
          className={`flex flex-col justify-center items-center ${fill ? "h-full" : "min-h-60"} p-4 @sm:p-8 gap-1 pointer-events-none`}
        >
          {/* At small sizes the date flows centered above the levels instead
              of overlaying the top-left corner */}
          {showDate && <h2 className="@sm:hidden text-sm font-semibold">{dateLabel}</h2>}
          <div className="flex justify-center items-center w-full gap-4 @sm:gap-8 *:flex-1">
            <WaterLevelAtTime
              {...(nearExtreme ?? currentLevel)}
              label="Now"
              units={units}
              locale={locale}
              timezone={timezone}
              state={
                nearExtreme
                  ? nearExtreme.high
                    ? "high"
                    : "low"
                  : nextExtreme
                    ? nextExtreme.high
                      ? "rising"
                      : "falling"
                    : undefined
              }
              variant="right"
            />

            {nextExtreme ? (
              <WaterLevelAtTime
                label="Next"
                level={nextExtreme.level}
                time={nextExtreme.time}
                units={units}
                locale={locale}
                timezone={timezone}
                state={nextExtreme.high ? "high" : "low"}
              />
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TideConditionsFetcher({
  id,
  showDate,
  fill,
  className,
}: TideConditionsFetchProps & { showDate: boolean; fill?: boolean; className?: string }) {
  const config = useNeapsConfig();
  const [start, end] = useMemo(() => {
    const now = Date.now();
    return [
      new Date(now - HALF_TIDE_CYCLE_MS).toISOString(),
      new Date(now + HALF_TIDE_CYCLE_MS).toISOString(),
    ];
  }, []);

  const timeline = useTimeline({ id, start, end });
  const extremes = useExtremes({ id, start, end });

  if (timeline.isLoading || extremes.isLoading) {
    return (
      <div className={`text-(--neaps-text) ${fill ? "h-full" : ""} ${className ?? ""}`}>
        <div
          className={`${fill ? "h-full" : "min-h-60"} border border-(--neaps-border) rounded-md flex items-center justify-center text-sm text-(--neaps-text-muted)`}
        >
          Loading...
        </div>
      </div>
    );
  }

  const error = timeline.error ?? extremes.error;
  if (error) {
    return (
      <div className={`text-(--neaps-text) ${fill ? "h-full" : ""} ${className ?? ""}`}>
        <div
          className={`${fill ? "h-full" : "min-h-60"} border border-(--neaps-border) rounded-md flex items-center justify-center p-4 text-center text-sm text-red-500`}
        >
          {error.message}
        </div>
      </div>
    );
  }

  if (!timeline.data || !extremes.data) return null;

  return (
    <TideConditionsStatic
      timeline={timeline.data.timeline}
      extremes={extremes.data.extremes}
      units={timeline.data.units ?? config.units}
      timezone={config.timezone ?? extremes.data.station?.timezone ?? "UTC"}
      showDate={showDate}
      fill={fill}
      className={className}
    />
  );
}

export function TideConditions({
  showDate = true,
  fill,
  className,
  ...props
}: TideConditionsProps) {
  if ("id" in props) {
    return (
      <TideConditionsFetcher id={props.id} showDate={showDate} fill={fill} className={className} />
    );
  }
  return <TideConditionsStatic {...props} showDate={showDate} fill={fill} className={className} />;
}
