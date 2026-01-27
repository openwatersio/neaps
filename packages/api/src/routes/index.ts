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
  try {
    if (req.query.id) {
      const station = findStation(req.query.id as string);
      return res.json(station);
    }

    const latitude = req.query.latitude as unknown as number;
    const longitude = req.query.longitude as unknown as number;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: "Either 'id' or coordinates (latitude and longitude) required",
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res
        .status(400)
        .json({ message: "Invalid limit parameter (must be between 1 and 100)" });
    }

    const stations = stationsNear({ latitude, longitude }, limit);
    res.json(stations);
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      return res.status(404).json({ message: (error as Error).message });
    }
    res.status(400).json({ message: (error as Error).message });
  }
});

router.get("/stations/:id/extremes", (req: Request, res: Response) => {
  try {
    const station = findStation(req.params.id);

    const options = {
      start: new Date(req.query.start as string),
      end: new Date(req.query.end as string),
      ...(req.query.datum && { datum: req.query.datum as string }),
      ...(req.query.units && { units: req.query.units as "meters" | "feet" }),
    };

    const result = station.getExtremesPrediction(options);
    res.json(result);
  } catch (error) {
    if ((error as Error).message.includes("not found")) {
      return res.status(404).json({ message: (error as Error).message });
    }
    res.status(400).json({ message: (error as Error).message });
  }
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
    res.status(400).json({ message: (error as Error).message });
  }
});

export default router;
