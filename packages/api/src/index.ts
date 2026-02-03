import express from "express";
import compression from "compression";
import { createHash } from "node:crypto";
import routes from "./routes.js";
import openapi from "./openapi.js";
import pkg from "../package.json" with { type: "json" };

export function createApp() {
  const app = express();

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
