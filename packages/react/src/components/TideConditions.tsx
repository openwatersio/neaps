import { formatLevel } from "../utils/format.js";
import type { Extreme, TimelineEntry, Units } from "../types.js";

export interface TideConditionsProps {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  units: Units;
  className?: string;
}

function getCurrentLevel(timeline: TimelineEntry[]): number | null {
  const now = Date.now();
  for (let i = 1; i < timeline.length; i++) {
    const t1 = new Date(timeline[i - 1].time).getTime();
    const t2 = new Date(timeline[i].time).getTime();
    if (now >= t1 && now <= t2) {
      const ratio = (now - t1) / (t2 - t1);
      return timeline[i - 1].level + ratio * (timeline[i].level - timeline[i - 1].level);
    }
  }
  return null;
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

function formatTimeUntil(isoTime: string): string {
  const diff = new Date(isoTime).getTime() - Date.now();
  if (diff <= 0) return "now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function TideConditions({ timeline, extremes, units, className }: TideConditionsProps) {
  const currentLevel = getCurrentLevel(timeline);
  const nextExtreme = getNextExtreme(extremes);
  const rising = isTideRising(extremes);

  return (
    <div className={`flex flex-col items-center p-4 ${className ?? ""}`}>
      {currentLevel !== null && (
        <div>
          <span className="text-2xl font-bold text-(--neaps-text)">
            {formatLevel(currentLevel, units)}
          </span>
          {rising !== null && (
            <span
              className={`ml-1 text-xl ${rising ? "text-(--neaps-high)" : "text-(--neaps-low)"}`}
              aria-label={rising ? "Rising" : "Falling"}
            >
              {rising ? "\u2191" : "\u2193"}
            </span>
          )}
        </div>
      )}
      {nextExtreme && (
        <div className="text-sm">
          <span className="text-(--neaps-text-muted)">
            {nextExtreme.high ? "High" : "Low"}:
            <span className="font-semibold">{formatLevel(nextExtreme.level, units)}</span>
            in {formatTimeUntil(nextExtreme.time)}
          </span>
        </div>
      )}
    </div>
  );
}
