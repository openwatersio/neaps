import { describe, test, expect, vi } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NearbyStations } from "../../src/components/NearbyStations.js";
import { createTestWrapper } from "../helpers.js";

describe("NearbyStations integration", () => {
  test("renders nearby stations by station ID", async () => {
    const { container } = render(<NearbyStations stationId="noaa/8443970" />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText(/Loading/)).toBeDefined();

    await waitFor(
      () => {
        expect(view.queryByText(/Loading/)).toBeNull();
      },
      { timeout: 10000 },
    );

    const buttons = view.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  test("renders nearby stations by lat/lng", async () => {
    const { container } = render(<NearbyStations latitude={42.3541} longitude={-71.0495} />, {
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
  });

  test("limits results with maxResults", async () => {
    const { container } = render(
      <NearbyStations latitude={42.3541} longitude={-71.0495} maxResults={2} />,
      { wrapper: createTestWrapper() },
    );
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText(/Loading/)).toBeNull();
      },
      { timeout: 10000 },
    );

    const buttons = view.getAllByRole("button");
    expect(buttons.length).toBeLessThanOrEqual(2);
  });

  test("calls onStationSelect when a station is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <NearbyStations stationId="noaa/8443970" onStationSelect={onSelect} />,
      { wrapper: createTestWrapper() },
    );
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText(/Loading/)).toBeNull();
      },
      { timeout: 10000 },
    );

    const firstButton = view.getAllByRole("button")[0];
    await user.click(firstButton);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0][0]).toHaveProperty("id");
  });
});
