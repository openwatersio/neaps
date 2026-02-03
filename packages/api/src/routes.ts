import { json, Router, Request, Response, type ErrorRequestHandler } from "express";
import { stations, Station } from "@neaps/tide-database";
import { getExtremesPrediction, getTimelinePrediction, findStation, stationsNear } from "neaps";
import { middleware as openapiValidator } from "express-openapi-validator";
import openapi from "./openapi.js";

const router = Router();

router.use(json());

router.use(
  openapiValidator({
    apiSpec: openapi,
    validateRequests: {
      coerceTypes: true,
    },
    validateResponses: import.meta.env?.VITEST,
  }),
);

router.get("/tides/openapi.json", (req, res) => {
  res.json(openapi);
});

router.get("/tides/extremes", (req: Request, res: Response) => {
  res.json(
    getExtremesPrediction({
      ...positionOptions(req),
      ...predictionOptions(req),
    }),
  );
});

router.get("/tides/timeline", (req: Request, res: Response) => {
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

router.get("/tides/stations/:source/:id", (req: Request, res: Response) => {
  try {
    return res.json(findStation(`${req.params.source}/${req.params.id}`));
  } catch (error) {
    return res.status(404).json({ message: (error as Error).message });
  }
});

router.get("/tides/stations", (req: Request, res: Response) => {
  const { latitude, longitude } = positionOptions(req);

  if (latitude === undefined || longitude === undefined) {
    return res.json(stations.map(stripStationDetails));
  }

  res.json(
    stationsNear({
      latitude,
      longitude,
      maxResults: req.query.limit as unknown as number,
    }),
  );
});

router.get("/tides/stations/:source/:id/extremes", (req: Request, res: Response) => {
  let station: ReturnType<typeof findStation>;

  try {
    station = findStation(`${req.params.source}/${req.params.id}`);
  } catch (error) {
    return res.status(404).json({ message: (error as Error).message });
  }

  res.json(station.getExtremesPrediction(predictionOptions(req)));
});

router.get("/tides/stations/:source/:id/timeline", (req: Request, res: Response) => {
  try {
    const station = findStation(`${req.params.source}/${req.params.id}`);
    res.json(station.getTimelinePrediction(predictionOptions(req)));
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      return res.status(404).json({ message: (error as Error).message });
    }
    // Subordinate station errors and other application errors
    return res.status(400).json({ message: (error as Error).message });
  }
});

router.use(((err, _req, res, next) => {
  if (!err) return next();

  const status = err.status ?? 500;
  const message = err.message ?? "Unknown error";

  res.status(status).json({ message, errors: err.errors });
}) satisfies ErrorRequestHandler);

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

export default router;
