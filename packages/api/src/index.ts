import express from "express";
import compression from "compression";
import routes from "./routes.js";
import openapi from "./openapi.js";

export function createApp() {
  const app = express();
  app.use(compression());
  app.use("/", routes);
  return app;
}

export { routes, openapi };
