import express, { Express, ErrorRequestHandler } from "express";
import { middleware as openapiValidator } from "express-openapi-validator";
import routes from "./routes/index.js";
import openapi from "./openapi.js";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use(
    openapiValidator({
      apiSpec: openapi,
      validateRequests: {
        coerceTypes: true,
      },
      validateResponses: !!(import.meta.env && import.meta.env.VITEST),
    }),
  );

  app.get("/openapi.json", (req, res) => {
    res.json(openapi);
  });

  app.use("/", routes);

  app.use(((err, _req, res, next) => {
    const status = err.status ?? 500;
    const message = err.message ?? "Unknown error";

    res.status(status).json({ message, errors: err.errors });
  }) satisfies ErrorRequestHandler);

  return app;
}

export default createApp();
