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

  const validationErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    if (!err) {
      return next();
    }

    const status = typeof (err as any).status === "number" ? (err as any).status : 500;

    // Handle express-openapi-validator errors
    const errObj = err as any;

    // Check if this is a validation error
    if (errObj.errors && Array.isArray(errObj.errors) && errObj.errors.length > 0) {
      const message = errObj.message || "Request validation failed";
      return res.status(status).json({ message, errors: errObj.errors });
    }

    // Handle regular errors
    const message =
      typeof (err as Error).message === "string" ? (err as Error).message : "Unknown error";
    res.status(status).json({ message });
  };

  app.use(validationErrorHandler);

  return app;
}

export default createApp();
