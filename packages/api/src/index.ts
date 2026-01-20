import express, { Express, Request, Response } from "express";
import routes from "./routes/index.js";
import openapi from "./openapi.json" with { type: "json" };

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/openapi.json", (req, res) => {
    res.json(openapi);
  });

  app.use("/", routes);

  app.use((err: Error, _req: Request, res: Response) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return app;
}

export default createApp();
