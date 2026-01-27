import { Router, Request, Response } from "express";
import { getExtremesPrediction, getTimelinePrediction, findStation, stationsNear } from "neaps";

const router = Router();

router.get("/extremes", (req: Request, res: Response) => {
  try {
    const options = {
      latitude: req.query.latitude as unknown as number,
      longitude: req.query.longitude as unknown as number,
      start: new Date(req.query.start as string),
      end: new Date(req.query.end as string),
      ...(req.query.datum && { datum: req.query.datum as string }),
      ...(req.query.units && { units: req.query.units as "meters" | "feet" }),
    };

    const result = getExtremesPrediction(options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

router.get("/timeline", (req: Request, res: Response) => {
  try {
    const options = {
      latitude: req.query.latitude as unknown as number,
      longitude: req.query.longitude as unknown as number,
      start: new Date(req.query.start as string),
      end: new Date(req.query.end as string),
      ...(req.query.datum && { datum: req.query.datum as string }),
      ...(req.query.units && { units: req.query.units as "meters" | "feet" }),
    };

    const result = getTimelinePrediction(options);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: (error as Error).message });
  }
});

router.get("/stations", (req: Request, res: Response) => {
  if (req.query.id) {
    try {
      const station = findStation(req.query.id as string);
      return res.json(station);
    } catch (error) {
      return res.status(404).json({ message: (error as Error).message });
    }
  }

  const latitude = req.query.latitude as unknown as number;
  const longitude = req.query.longitude as unknown as number;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "Either 'id' or coordinates (latitude and longitude) required",
    });
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const stations = stationsNear({ latitude, longitude }, limit);
  res.json(stations);
});

router.get("/stations/:id/extremes", (req: Request, res: Response) => {
  let station: ReturnType<typeof findStation>;

  try {
    station = findStation(req.params.id);
  } catch (error) {
    return res.status(404).json({ message: (error as Error).message });
  }

  const options = {
    start: new Date(req.query.start as string),
    end: new Date(req.query.end as string),
    ...(req.query.datum && { datum: req.query.datum as string }),
    ...(req.query.units && { units: req.query.units as "meters" | "feet" }),
  };

  const result = station.getExtremesPrediction(options);
  res.json(result);
});

router.get("/stations/:id/timeline", (req: Request, res: Response) => {
  try {
    const station = findStation(req.params.id);

    const options = {
      start: new Date(req.query.start as string),
      end: new Date(req.query.end as string),
      ...(req.query.datum && { datum: req.query.datum as string }),
      ...(req.query.units && { units: req.query.units as "meters" | "feet" }),
    };

    const result = station.getTimelinePrediction(options);
    res.json(result);
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      return res.status(404).json({ message: (error as Error).message });
    }
    // Subordinate station errors and other application errors
    return res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
