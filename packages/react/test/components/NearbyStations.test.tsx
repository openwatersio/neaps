import { describe, test, expect } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import { NearbyStations } from "../../src/components/NearbyStations.js";
import { createTestWrapper } from "../helpers.js";

describe("NearbyStations", () => {
  test("shows loading state initially", () => {
    const { container } = render(<NearbyStations stationId="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText(/Loading/)).toBeDefined();
  });

  test("renders station list as buttons", async () => {
    const { container } = render(<NearbyStations stationId="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText(/Loading/)).toBeNull();
      },
      { timeout: 10000 },
    );

    const buttons = view.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);

    // Each button should contain station name text
    for (const button of buttons) {
      expect(button.textContent!.length).toBeGreaterThan(0);
    }
  });

  test("applies className", async () => {
    const { container } = render(<NearbyStations stationId="noaa/8443970" className="my-list" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText(/Loading/)).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(container.querySelector(".my-list")).toBeDefined();
  });
});
