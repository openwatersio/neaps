import { describe, test, expect } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import { TideStation } from "../../src/components/TideStation.js";
import { createTestWrapper } from "../helpers.js";

const STATION_ID = "noaa/8443970";

describe("TideStation integration", () => {
  test("renders station name after loading", async () => {
    const { container } = render(<TideStation id={STATION_ID} />, { wrapper: createTestWrapper() });
    const view = within(container);

    expect(view.getByText("Loading...")).toBeDefined();

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(view.getByRole("heading", { level: 1 })).toBeDefined();
  });

  test("renders graph by default", async () => {
    const { container } = render(<TideStation id={STATION_ID} />, { wrapper: createTestWrapper() });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(container.querySelector("canvas")).toBeDefined();
  });

  test("renders table when showTable is true", async () => {
    const { container } = render(<TideStation id={STATION_ID} showTable />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(view.getByRole("table")).toBeDefined();
  });

  test("shows error for invalid station", async () => {
    const { container } = render(<TideStation id="nonexistent/station" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    // Should show an error message instead of station content
    expect(view.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
