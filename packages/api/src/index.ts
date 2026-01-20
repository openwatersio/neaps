import express, { Express } from "express";
import routes from "./routes/index.js";
import openapi from "./openapi.json" with { type: "json" };

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/openapi.json", (req, res) => {
    res.json(openapi);
  });

  app.use("/", routes);

  return app;
}

export default createApp();
