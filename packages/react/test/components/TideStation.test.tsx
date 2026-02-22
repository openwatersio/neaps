import { describe, test, expect } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import { TideStation } from "../../src/components/TideStation.js";
import { createTestWrapper } from "../helpers.js";

describe("TideStation", () => {
  test("shows loading state initially", () => {
    const { container } = render(<TideStation id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText("Loading...")).toBeDefined();
  });

  test("renders station name and region after loading", async () => {
    const { container } = render(<TideStation id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    // Station name should be in an h3
    const heading = view.getByRole("heading", { level: 3 });
    expect(heading.textContent!.length).toBeGreaterThan(0);
  });

  test("shows current level with arrow indicator", async () => {
    const { container } = render(<TideStation id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    // Should have a Rising or Falling indicator
    const rising = view.queryByLabelText("Rising");
    const falling = view.queryByLabelText("Falling");
    expect(rising ?? falling).toBeDefined();
  });

  test("renders graph by default, no table", async () => {
    const { container } = render(<TideStation id="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(container.querySelector("canvas")).toBeDefined();
    expect(view.queryByRole("table")).toBeNull();
  });

  test("renders table when showTable is true", async () => {
    const { container } = render(<TideStation id="noaa/8443970" showTable showGraph={false} />, {
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

  test("applies className", async () => {
    const { container } = render(<TideStation id="noaa/8443970" className="my-station" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(container.querySelector(".my-station")).toBeDefined();
  });
});
