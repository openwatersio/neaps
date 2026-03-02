import { Body, Observer, SearchRiseSet } from "astronomy-engine";

export interface NightInterval {
  start: number; // ms timestamp (sunset)
  end: number; // ms timestamp (sunrise)
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns night intervals (sunset → sunrise) for a given location and time range.
 * Pads by 1 day on each side to capture partial nights at boundaries.
 */
export function getNightIntervals(
  latitude: number,
  longitude: number,
  startMs: number,
  endMs: number,
): NightInterval[] {
  const observer = new Observer(latitude, longitude, 0);
  const intervals: NightInterval[] = [];

  // Start 1 day before to catch a sunset that happened before our range
  const cursor = new Date(startMs - MS_PER_DAY);
  cursor.setHours(12, 0, 0, 0); // noon local-ish to avoid ambiguity

  const limit = endMs + MS_PER_DAY;

  while (cursor.getTime() < limit) {
    const sunset = SearchRiseSet(Body.Sun, observer, -1, cursor, 2);
    if (!sunset) {
      // Polar region — no sunset; skip this day
      cursor.setTime(cursor.getTime() + MS_PER_DAY);
      continue;
    }

    const sunrise = SearchRiseSet(Body.Sun, observer, +1, sunset.date, 2);
    if (!sunrise) {
      // Polar region — no sunrise after sunset; skip
      cursor.setTime(cursor.getTime() + MS_PER_DAY);
      continue;
    }

    const sunsetMs = sunset.date.getTime();
    const sunriseMs = sunrise.date.getTime();

    // Only include intervals that overlap our range
    if (sunriseMs > startMs && sunsetMs < endMs) {
      intervals.push({
        start: Math.max(sunsetMs, startMs),
        end: Math.min(sunriseMs, endMs),
      });
    }

    // Advance past this sunrise to find the next sunset
    cursor.setTime(sunriseMs + 60 * 60 * 1000); // +1h past sunrise
  }

  return intervals;
}
