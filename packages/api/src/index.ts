import express, { Express, Request, Response, NextFunction } from "express";
import routes from "./routes/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/openapi.json", (req, res) => {
    try {
      const openapiPath = join(__dirname, "openapi.json");
      const openapi = JSON.parse(readFileSync(openapiPath, "utf-8"));
      res.json(openapi);
    } catch {
      res.status(500).json({ error: "Failed to load OpenAPI specification" });
    }
  });

  app.use("/", routes);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  return app;
}

export function startServer(port: number = 3000): void {
  const app = createApp();
  app.listen(port, () => {
    console.log(`Neaps API server listening on port ${port}`);
  });
}

export default createApp();
