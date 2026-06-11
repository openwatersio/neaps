import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
// Real styles so layout-dependent behavior (container queries, compact
// layout detection) works in browser tests
import "./styles.css";

afterEach(() => {
  cleanup();
  localStorage.removeItem("neaps-settings");
});
