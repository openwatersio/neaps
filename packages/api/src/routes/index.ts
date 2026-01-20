import { Router, Request, Response } from "express";
import { getExtremesPrediction, getTimelinePrediction, findStation, stationsNear } from "neaps";

const router = Router();

interface QueryParams {
  [key: string]: string | string[] | undefined;
}

function parseCoordinates(query: QueryParams): { lat: number; lon: number } | null {
  const lat = query.lat || query.latitude;
  const lon = query.lon || query.lng || query.longitude;

  if (lat === undefined || lon === undefined) {
    return null;
  }

  const parsedLat = parseFloat(lat as string);
  const parsedLon = parseFloat(lon as string);

  if (isNaN(parsedLat) || isNaN(parsedLon)) {
    return null;
  }

  return { lat: parsedLat, lon: parsedLon };
}

function parseDateParams(query: QueryParams): { start: Date; end: Date } | null {
  if (!query.start || !query.end) {
    return null;
  }

  const start = new Date(query.start as string);
  const end = new Date(query.end as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null;
  }

  return { start, end };
}

router.get("/extremes", (req: Request, res: Response) => {
  try {
    const coords = parseCoordinates(req.query);
    if (!coords) {
      return res.status(400).json({
        error: "Missing or invalid coordinates (lat/latitude and lon/lng/longitude required)",
      });
    }

    const dates = parseDateParams(req.query);
    if (!dates) {
      return res.status(400).json({
        error: "Missing or invalid date parameters (start and end required in ISO 8601 format)",
      });
    }

    const options: Record<string, unknown> = {
      ...coords,
      ...dates,
    };

    if (req.query.datum) {
      options.datum = req.query.datum;
    }

    if (req.query.units) {
      options.units = req.query.units;
    }

    const result = getExtremesPrediction(options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get("/timeline", (req: Request, res: Response) => {
  try {
    const coords = parseCoordinates(req.query);
    if (!coords) {
      return res.status(400).json({
        error: "Missing or invalid coordinates (lat/latitude and lon/lng/longitude required)",
      });
    }

    const dates = parseDateParams(req.query);
    if (!dates) {
      return res.status(400).json({
        error: "Missing or invalid date parameters (start and end required in ISO 8601 format)",
      });
    }

    const options: Record<string, unknown> = {
      ...coords,
      ...dates,
    };

    if (req.query.datum) {
      options.datum = req.query.datum;
    }

    if (req.query.units) {
      options.units = req.query.units;
    }

    const result = getTimelinePrediction(options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get("/stations", (req: Request, res: Response) => {
  try {
    if (req.query.id) {
      const station = findStation(req.query.id as string);
      return res.json(station);
    }

    const coords = parseCoordinates(req.query);
    if (!coords) {
      return res.status(400).json({
        error: "Either 'id' or coordinates (lat/latitude and lon/lng/longitude) required",
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: "Invalid limit parameter (must be between 1 and 100)" });
    }

    const stations = stationsNear(coords, limit);
    res.json(stations);
  } catch (error) {
    // findStation throws "not found" errors
    res.status(404).json({ error: (error as Error).message });
  }
});

router.get("/stations/:id/extremes", (req: Request, res: Response) => {
  try {
    const station = findStation(req.params.id);

    const dates = parseDateParams(req.query);
    if (!dates) {
      return res.status(400).json({
        error: "Missing or invalid date parameters (start and end required in ISO 8601 format)",
      });
    }

    const options: Record<string, unknown> = dates;

    if (req.query.datum) {
      options.datum = req.query.datum;
    }

    if (req.query.units) {
      options.units = req.query.units;
    }

    const result = station.getExtremesPrediction(options);
    res.json(result);
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      return res.status(404).json({ error: (error as Error).message });
    }
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get("/stations/:id/timeline", (req: Request, res: Response) => {
  try {
    const station = findStation(req.params.id);

    const dates = parseDateParams(req.query);
    if (!dates) {
      return res.status(400).json({
        error: "Missing or invalid date parameters (start and end required in ISO 8601 format)",
      });
    }

    const options: Record<string, unknown> = dates;

    if (req.query.datum) {
      options.datum = req.query.datum;
    }

    if (req.query.units) {
      options.units = req.query.units;
    }

    const result = station.getTimelinePrediction(options);
    res.json(result);
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      return res.status(404).json({ error: (error as Error).message });
    }
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
