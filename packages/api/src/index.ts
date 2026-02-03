import express from "express";
import compression from "compression";
import { createHash } from "node:crypto";
import routes from "./routes.js";
import openapi from "./openapi.js";
import pkg from "../package.json" with { type: "json" };
import cors from "cors";

const MAX_AGE = Number(process.env.NEAPS_API_MAX_AGE ?? 3600);
const CORS_ORIGIN = process.env.NEAPS_API_CORS_ORIGIN ?? "*";

export function createApp() {
  const app = express();

  // Configure CORS
  app.use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
      optionsSuccessStatus: 200,
    }),
  );

  // Cache-Control middleware
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", `public, max-age=${MAX_AGE}`);
    next();
  });

  // Configure ETag generation to include package version
  app.set("etag", (body: Buffer | string, encoding: BufferEncoding) => {
    const bodyString = typeof body === "string" ? body : body.toString(encoding);
    const hash = createHash("sha256")
      .update(pkg.version + bodyString, "utf8")
      .digest("hex")
      .substring(0, 27);
    return `W/"${hash}"`;
  });

  app.use(compression());
  app.use("/", routes);
  return app;
}

export { routes, openapi };
