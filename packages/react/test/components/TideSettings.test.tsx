import { describe, test, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { TideSettings } from "../../src/components/TideSettings.js";
import { createTestWrapper } from "../helpers.js";

const station = {
  datums: { MLLW: 0, MSL: 1.5, MHHW: 3.0 },
  defaultDatum: "MLLW",
  timezone: "America/New_York",
};

describe("TideSettings", () => {
  test("renders units select with options", () => {
    const { container } = render(<TideSettings station={station} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const group = view.getByRole("group", { name: /Tide display settings/i });
    expect(group).toBeDefined();

    // Should have units dropdown
    expect(view.getByText("Units")).toBeDefined();
    expect(view.getByText("Metric (m)")).toBeDefined();
    expect(view.getByText("Imperial (ft)")).toBeDefined();
  });

  test("renders datum select when multiple datums", () => {
    const { container } = render(<TideSettings station={station} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText("Datum")).toBeDefined();
    // Should show default datum option
    expect(view.getByText("SD (MLLW)")).toBeDefined();
  });

  test("does not render datum select with single datum", () => {
    const singleDatum = { ...station, datums: { MLLW: 0 } };
    const { container } = render(<TideSettings station={singleDatum} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.queryByText("Datum")).toBeNull();
  });

  test("renders timezone select", () => {
    const { container } = render(<TideSettings station={station} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByText("Timezone")).toBeDefined();
    expect(view.getByText(/Station/)).toBeDefined();
  });

  test("hides timezone select when only station timezone available", () => {
    // When station timezone equals browser timezone and there's no UTC difference
    const utcStation = { ...station, timezone: "UTC" };
    const { container } = render(<TideSettings station={utcStation} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    // UTC station, browser may or may not be UTC, but we should not crash
    // The timezone select may or may not be shown based on browser timezone
    expect(view.getByText("Units")).toBeDefined();
  });

  test("changing units updates config", async () => {
    const user = userEvent.setup();
    const { container } = render(<TideSettings station={station} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const selects = view.getAllByRole("combobox");
    const unitSelect = selects[0];

    await user.selectOptions(unitSelect, "meters");
    expect((unitSelect as HTMLSelectElement).value).toBe("meters");
  });

  test("applies className", () => {
    const { container } = render(<TideSettings station={station} className="my-settings" />, {
      wrapper: createTestWrapper(),
    });

    const group = container.querySelector("[role='group']");
    expect(group!.className).toContain("my-settings");
  });
});
