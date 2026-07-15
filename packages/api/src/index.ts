import express, { type RequestHandler } from "express";
import compression from "compression";
import { createHash } from "node:crypto";
import { createRoutes } from "./routes.js";
import openapi from "./openapi.js";
import pkg from "../package.json" with { type: "json" };
import cors from "cors";

const MAX_AGE = Number(process.env.NEAPS_API_MAX_AGE ?? 3600);
const CORS_ORIGIN = process.env.NEAPS_API_CORS_ORIGIN ?? "*";

interface CreateAppOptions {
  prefix?: string;
  compress?: boolean;
  /**
   * Extra middleware mounted before the routes. Used by tests to mount
   * express-openapi-validator (which relies on Ajv codegen and so can't run on
   * edge runtimes) and enforce request/response conformance to the OpenAPI spec.
   */
  middleware?: RequestHandler[];
}

export function createApp({
  prefix = "/tides",
  compress = true,
  middleware = [],
}: CreateAppOptions = {}) {
  const routes = createRoutes({ middleware });
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

  // Opt-out: compression() corrupts responses through the node:http bridge on
  // edge runtimes (e.g. Cloudflare Workers), which compress at the edge anyway.
  if (compress) app.use(compression());
  app.use(prefix, routes);
  return app;
}

export { createRoutes, openapi };
