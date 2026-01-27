import express from "express";
import routes from "./routes.js";
import openapi from "./openapi.js";

export function createApp() {
  return express().use("/", routes);
}

export { routes, openapi };
export default createApp();
