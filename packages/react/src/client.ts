import type {
  Units,
  Station,
  StationSummary,
  ExtremesResponse,
  TimelineResponse,
} from "./types.js";

export interface PredictionParams {
  start?: string;
  end?: string;
  datum?: string;
  units?: Units;
}

export interface LocationParams extends PredictionParams {
  latitude: number;
  longitude: number;
}

export interface StationPredictionParams extends PredictionParams {
  id: string;
}

export interface StationsSearchParams {
  query?: string;
  latitude?: number;
  longitude?: number;
  maxResults?: number;
  maxDistance?: number;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildURL(base: string, path: string, params: object = {}): string {
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** Parse a station ID like "noaa/8722588" into source and id path segments. */
function parseStationId(id: string): { source: string; stationId: string } {
  const slash = id.indexOf("/");
  if (slash === -1) throw new Error(`Invalid station ID: "${id}". Expected format "source/id".`);
  return { source: id.slice(0, slash), stationId: id.slice(slash + 1) };
}

/** Convert all Date properties to string (the raw JSON shape before parsing). */
type JSONResponse<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends (infer U)[]
      ? JSONResponse<U>[]
      : T[K] extends object
        ? JSONResponse<T[K]>
        : T[K];
};

type RawExtremesResponse = JSONResponse<ExtremesResponse>;
type RawTimelineResponse = JSONResponse<TimelineResponse>;

export async function fetchExtremes(
  baseUrl: string,
  params: LocationParams,
): Promise<ExtremesResponse> {
  const data = await fetchJSON<RawExtremesResponse>(buildURL(baseUrl, "/tides/extremes", params));
  return { ...data, extremes: data.extremes.map((e) => ({ ...e, time: new Date(e.time) })) };
}

export async function fetchTimeline(
  baseUrl: string,
  params: LocationParams,
): Promise<TimelineResponse> {
  const data = await fetchJSON<RawTimelineResponse>(buildURL(baseUrl, "/tides/timeline", params));
  return { ...data, timeline: data.timeline.map((e) => ({ ...e, time: new Date(e.time) })) };
}

export function fetchStation(baseUrl: string, id: string): Promise<Station> {
  const { source, stationId } = parseStationId(id);
  return fetchJSON(buildURL(baseUrl, `/tides/stations/${source}/${stationId}`));
}

export function fetchStations(
  baseUrl: string,
  params: StationsSearchParams = {},
): Promise<StationSummary[]> {
  return fetchJSON(buildURL(baseUrl, "/tides/stations", params));
}

export async function fetchStationExtremes(
  baseUrl: string,
  params: StationPredictionParams,
): Promise<ExtremesResponse> {
  const { id, ...rest } = params;
  const { source, stationId } = parseStationId(id);
  const data = await fetchJSON<RawExtremesResponse>(
    buildURL(baseUrl, `/tides/stations/${source}/${stationId}/extremes`, rest),
  );
  return { ...data, extremes: data.extremes.map((e) => ({ ...e, time: new Date(e.time) })) };
}

export async function fetchStationTimeline(
  baseUrl: string,
  params: StationPredictionParams,
): Promise<TimelineResponse> {
  const { id, ...rest } = params;
  const { source, stationId } = parseStationId(id);
  const data = await fetchJSON<RawTimelineResponse>(
    buildURL(baseUrl, `/tides/stations/${source}/${stationId}/timeline`, rest),
  );
  return { ...data, timeline: data.timeline.map((e) => ({ ...e, time: new Date(e.time) })) };
}
