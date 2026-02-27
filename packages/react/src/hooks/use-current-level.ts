import { useState, useEffect, useMemo } from "react";
import type { TimelineEntry } from "../types.js";

export function interpolateLevel(timeline: TimelineEntry[], at: number): TimelineEntry | null {
  if (!timeline.length) return null;

  let lo = -1;
  let hi = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (new Date(timeline[i].time).getTime() <= at) lo = i;
    else if (hi === -1) {
      hi = i;
      break;
    }
  }

  if (lo === -1 || hi === -1) return null;

  const t0 = new Date(timeline[lo].time).getTime();
  const t1 = new Date(timeline[hi].time).getTime();
  const ratio = (at - t0) / (t1 - t0);
  const level = timeline[lo].level + (timeline[hi].level - timeline[lo].level) * ratio;

  return { time: new Date(at).toISOString(), level };
}

/**
 * Returns a TimelineEntry for the current moment by linearly interpolating
 * between the two nearest entries in the timeline. Updates every minute.
 * Returns null if the timeline is empty.
 */
export function useCurrentLevel(timeline: TimelineEntry[]): TimelineEntry | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const minute = 60_000;
    const id = setInterval(() => {
      const next = Math.floor(Date.now() / minute) * minute;
      if (now !== next) setNow(next);
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => interpolateLevel(timeline, now), [timeline, now]);
}
