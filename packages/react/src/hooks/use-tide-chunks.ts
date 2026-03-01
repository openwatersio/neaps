import { useCallback, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { useNeapsConfig } from "../provider.js";
import { fetchStationTimeline, fetchStationExtremes } from "../client.js";
import type { TimelineEntry, Extreme, Station, Units } from "../types.js";

const CHUNK_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ChunkRange {
  start: string; // ISO
  end: string; // ISO
}

function getChunkRange(anchorMs: number, offset: number): ChunkRange {
  const start = new Date(anchorMs + offset * CHUNK_DAYS * MS_PER_DAY);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + CHUNK_DAYS * MS_PER_DAY);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getInitialChunks(): ChunkRange[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const anchorMs = now.getTime();
  return [getChunkRange(anchorMs, -1), getChunkRange(anchorMs, 0), getChunkRange(anchorMs, 1)];
}

export interface UseTideChunksParams {
  id: string;
}

export interface UseTideChunksReturn {
  timeline: TimelineEntry[];
  extremes: Extreme[];
  dataStart: number;
  dataEnd: number;
  yDomain: [number, number];
  loadPrevious: () => void;
  loadNext: () => void;
  isLoadingPrevious: boolean;
  isLoadingNext: boolean;
  isLoading: boolean;
  error: Error | null;
  station: Station | null;
  timezone: string;
  units: Units;
  datum: string | undefined;
}

export function useTideChunks({ id }: UseTideChunksParams): UseTideChunksReturn {
  const { baseUrl, units, datum, timezone } = useNeapsConfig();
  const [chunks, setChunks] = useState<ChunkRange[]>(getInitialChunks);
  const yDomainRef = useRef<[number, number] | null>(null);

  const timelineQueries = useQueries({
    queries: chunks.map((chunk) => ({
      queryKey: ["neaps", "timeline", { id, start: chunk.start, end: chunk.end, units, datum }],
      queryFn: () =>
        fetchStationTimeline(baseUrl, { id, start: chunk.start, end: chunk.end, units, datum }),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const extremesQueries = useQueries({
    queries: chunks.map((chunk) => ({
      queryKey: ["neaps", "extremes", { id, start: chunk.start, end: chunk.end, units, datum }],
      queryFn: () =>
        fetchStationExtremes(baseUrl, { id, start: chunk.start, end: chunk.end, units, datum }),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const timeline = useMemo(() => {
    const seen = new Set<string>();
    const result: TimelineEntry[] = [];
    for (const q of timelineQueries) {
      if (!q.data) continue;
      for (const entry of q.data.timeline) {
        if (!seen.has(entry.time)) {
          seen.add(entry.time);
          result.push(entry);
        }
      }
    }
    result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return result;
  }, [timelineQueries]);

  const extremes = useMemo(() => {
    const seen = new Set<string>();
    const result: Extreme[] = [];
    for (const q of extremesQueries) {
      if (!q.data) continue;
      for (const entry of q.data.extremes) {
        if (!seen.has(entry.time)) {
          seen.add(entry.time);
          result.push(entry);
        }
      }
    }
    result.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return result;
  }, [extremesQueries]);

  // Expanding-only y-domain
  const yDomain = useMemo<[number, number]>(() => {
    const levels = [...timeline.map((d) => d.level), ...extremes.map((e) => e.level)];
    if (!levels.length) return yDomainRef.current ?? [0, 1];

    const dataMin = Math.min(0, ...levels);
    const dataMax = Math.max(...levels);
    const pad = (dataMax - dataMin) * 0.2 || 0.5;

    const prev = yDomainRef.current;
    const newDomain: [number, number] = [
      prev ? Math.min(prev[0], dataMin - pad) : dataMin - pad,
      prev ? Math.max(prev[1], dataMax + pad) : dataMax + pad,
    ];
    yDomainRef.current = newDomain;
    return newDomain;
  }, [timeline, extremes]);

  const dataStart = useMemo(() => new Date(chunks[0].start).getTime(), [chunks]);
  const dataEnd = useMemo(() => new Date(chunks[chunks.length - 1].end).getTime(), [chunks]);

  const loadPrevious = useCallback(() => {
    setChunks((prev) => {
      const earliestStart = new Date(prev[0].start).getTime();
      const newChunk = getChunkRange(earliestStart, -1);
      return [newChunk, ...prev];
    });
  }, []);

  const loadNext = useCallback(() => {
    setChunks((prev) => {
      const latestEnd = new Date(prev[prev.length - 1].end).getTime();
      const newChunk: ChunkRange = {
        start: new Date(latestEnd).toISOString(),
        end: new Date(latestEnd + CHUNK_DAYS * MS_PER_DAY).toISOString(),
      };
      return [...prev, newChunk];
    });
  }, []);

  const firstTimeline = timelineQueries.find((q) => q.data);
  const firstExtremes = extremesQueries.find((q) => q.data);
  const station = firstTimeline?.data?.station ?? firstExtremes?.data?.station ?? null;

  const isLoading =
    timelineQueries.some((q) => q.isLoading) || extremesQueries.some((q) => q.isLoading);
  const isLoadingPrevious = timelineQueries[0]?.isLoading || extremesQueries[0]?.isLoading;
  const isLoadingNext =
    timelineQueries[timelineQueries.length - 1]?.isLoading ||
    extremesQueries[extremesQueries.length - 1]?.isLoading;

  const error =
    timelineQueries.find((q) => q.error)?.error ??
    extremesQueries.find((q) => q.error)?.error ??
    null;

  return {
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
    error: error as Error | null,
    station,
    timezone: timezone ?? station?.timezone ?? "UTC",
    units: firstTimeline?.data?.units ?? units,
    datum: firstTimeline?.data?.datum ?? firstExtremes?.data?.datum,
  };
}
