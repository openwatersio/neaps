// MapLibre 6 locates its worker with `new URL("./maplibre-gl-worker.mjs", import.meta.url)`,
// which Vite rewrites to the hashed chunk URL, so in production the worker 404s and the
// map stays blank. Bundle the worker ourselves and tell MapLibre where it landed.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

export * from "maplibre-gl";
