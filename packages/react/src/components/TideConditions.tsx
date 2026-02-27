import { useCurrentLevel } from "../hooks/use-current-level.js";
import { useNeapsConfig } from "../provider.js";
import { formatLevel } from "../utils/format.js";
import { TideCycleGraph } from "./TideCycleGraph.js";
import type { Extreme, TimelineEntry, Units } from "../types.js";

export interface TideConditionsProps {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  units: Units;
  timezone: string;
  className?: string;
}

function getNextExtreme(extremes: Extreme[]): Extreme | null {
  const now = new Date();
  return extremes.find((e) => new Date(e.time) > now) ?? null;
}

function isTideRising(extremes: Extreme[]): boolean | null {
  const next = getNextExtreme(extremes);
  if (!next) return null;
  return next.high;
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
  state,
  variant,
}: {
  label: string;
  level: number;
  time: string;
  units: Units;
  locale: string;
  state?: TideState;
  variant?: "left" | "right";
}) {
  const stateIcon = state ? STATE_ICON[state] : null;
  return (
    <div className={`flex flex-col${variant === "right" ? " items-end text-right" : ""}`}>
      <div className="text-(--neaps-text-muted) text-2xs uppercase tracking-wide">{label}</div>
      <span
        className={`flex items-baseline gap-1 text-2xl font-semibold tabular-nums text-(--neaps-text)${variant === "right" ? " flex-row-reverse" : ""}`}
      >
        {formatLevel(level, units)}
        {stateIcon && (
          <span className={`text-xl ${stateIcon.color}`} aria-label={stateIcon.label}>
            {stateIcon.icon}
          </span>
        )}
      </span>
      <span className="text-xs text-(--neaps-text-muted)">
        {new Date(time).toLocaleString(locale, {
          timeStyle: "short",
        })}
      </span>
    </div>
  );
}

export function TideConditions({
  timeline,
  extremes,
  units,
  className,
  timezone,
}: TideConditionsProps) {
  const { locale } = useNeapsConfig();
  const currentLevel = useCurrentLevel(timeline);
  const nextExtreme = getNextExtreme(extremes);
  const rising = isTideRising(extremes);

  if (!currentLevel) {
    return (
      <div className={`text-(--neaps-text) ${className ?? ""}`}>
        <h2 className="text-lg">No tide data available</h2>
      </div>
    );
  }

  return (
    <div className={`text-(--neaps-text) ${className ?? ""}`}>
      <div className="relative border border-(--neaps-border) rounded-md overflow-hidden">
        <TideCycleGraph
          timeline={timeline}
          extremes={extremes}
          units={units}
          timezone={timezone}
          className="absolute inset-0"
        />
        <div className="m-4 mb-0">
          <h2 className="text-lg font-semibold">
            {new Date(currentLevel.time).toLocaleString(locale, {
              dateStyle: "medium",
              timeZone: timezone,
            })}
          </h2>
        </div>
        <div className="flex justify-center items-center p-8 gap-8 pointer-events-none">
          <WaterLevelAtTime
            {...currentLevel}
            label="Now"
            units={units}
            locale={locale}
            state={rising === null ? undefined : rising ? "rising" : "falling"}
            variant="right"
          />

          {nextExtreme && (
            <WaterLevelAtTime
              label="Next"
              level={nextExtreme.level}
              time={nextExtreme.time}
              units={units}
              locale={locale}
              state={nextExtreme.high ? "high" : "low"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
