import { json, Router, Request, Response, type ErrorRequestHandler } from "express";
import { stations, Station, search } from "@neaps/tide-database";
import { getExtremesPrediction, getTimelinePrediction, findStation, stationsNear } from "neaps";
import { middleware as openapiValidator } from "express-openapi-validator";
import openapi from "./openapi.js";

export function createRoutes({ prefix = "/" } = {}) {
  const spec = { ...openapi, servers: [{ url: prefix }] };
  const router = Router();

  router.use(json());

  router.use(
    openapiValidator({
      apiSpec: spec,
      validateRequests: {
        coerceTypes: true,
      },
      validateResponses: import.meta.env?.VITEST,
    }),
  );

  router.get("/", (req, res) => {
    res.json({
      name: openapi.info.title,
      version: openapi.info.version,
      docs: `${req.baseUrl}/openapi.json`,
    });
  });

  router.get("/openapi.json", (req, res) => {
    res.json({ ...openapi, servers: [{ url: req.baseUrl || "/" }] });
  });

  router.get("/extremes", (req: Request, res: Response) => {
    res.json(
      getExtremesPrediction({
        ...positionOptions(req),
        ...predictionOptions(req),
      }),
    );
  });

  router.get("/timeline", (req: Request, res: Response) => {
    try {
      res.json(
        getTimelinePrediction({
          ...positionOptions(req),
          ...predictionOptions(req),
        }),
      );
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  router.get("/stations/:source/:id", (req: Request, res: Response) => {
    try {
      return res.json(findStation(`${req.params.source}/${req.params.id}`));
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }
  });

  router.get("/stations", (req: Request, res: Response) => {
    const { latitude, longitude } = positionOptions(req);
    const query = req.query.query as string | undefined;
    const maxResults = req.query.maxResults as unknown as number | undefined;
    const maxDistance = req.query.maxDistance as unknown as number | undefined;
    const bboxParam = req.query.bbox as string | undefined;

    if (query) {
      const results = search(query).map(stripStationDetails);
      const limit = maxResults ?? 10;
      return res.json(results.slice(0, limit));
    }

    if (bboxParam) {
      const parts = bboxParam.split(",").map(Number);
      return res.json(
        bbox({ min: [parts[0], parts[1]], max: [parts[2], parts[3]] }).map(stripStationDetails),
      );
    }

    if (latitude === undefined || longitude === undefined) {
      return res.json(stations.map(stripStationDetails));
    }

    res.json(
      stationsNear({
        latitude,
        longitude,
        maxResults,
        maxDistance,
      }),
    );
  });

  router.get("/stations/:source/:id/extremes", (req: Request, res: Response) => {
    let station: ReturnType<typeof findStation>;

    try {
      station = findStation(`${req.params.source}/${req.params.id}`);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }

    res.json(station.getExtremesPrediction(predictionOptions(req)));
  });

  router.get("/stations/:source/:id/timeline", (req: Request, res: Response) => {
    let station: ReturnType<typeof findStation>;

    try {
      station = findStation(`${req.params.source}/${req.params.id}`);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }

    res.json(station.getTimelinePrediction(predictionOptions(req)));
  });

  router.use(((err, _req, res, next) => {
    if (!err) return next();

    const status = err.status ?? 500;
    const message = err.message ?? "Unknown error";

    res.status(status).json({ message, errors: err.errors });
  }) satisfies ErrorRequestHandler);

  return router;
}

function positionOptions(req: Request) {
  return {
    latitude: req.query.latitude as unknown as number,
    longitude: req.query.longitude as unknown as number,
  };
}

function predictionOptions(req: Request) {
  return {
    start: req.query.start ? new Date(req.query.start as string) : new Date(),
    end: req.query.end
      ? new Date(req.query.end as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...(req.query.datum && { datum: req.query.datum as string }),
    ...(req.query.units && { units: req.query.units as "meters" | "feet" }),
  };
}

function stripStationDetails(station: Station) {
  const { id, name, region, country, continent, latitude, longitude, timezone, type } = station;
  return { id, name, region, country, continent, latitude, longitude, timezone, type };
}

// TODO: replace with https://github.com/openwatersio/tide-database/pull/67
function bbox({ min, max }: { min: [number, number]; max: [number, number] }) {
  return stations.filter(
    (s) =>
      s.longitude >= min[0] &&
      s.longitude <= max[0] &&
      s.latitude >= min[1] &&
      s.latitude <= max[1],
  );
}
