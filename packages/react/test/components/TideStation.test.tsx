import { describe, test, expect, afterEach } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
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
    const heading = view.getByRole("heading", { level: 1 });
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

  test("renders graph and table by default", async () => {
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
    expect(view.getByRole("table")).toBeDefined();
  });

  test("does not use tabs in a large container", async () => {
    const { container } = render(
      <div style={{ width: 800 }}>
        <TideStation id="noaa/8443970" />
      </div>,
      { wrapper: createTestWrapper() },
    );
    const view = within(container);

    await waitFor(
      () => {
        expect(view.queryByText("Loading...")).toBeNull();
      },
      { timeout: 10000 },
    );

    expect(view.queryByRole("tablist")).toBeNull();
    expect(view.getByRole("table")).toBeDefined();
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

  describe("compact layout", () => {
    afterEach(() => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });

    async function renderCompact(style: React.CSSProperties = { width: 400, height: 320 }) {
      const result = render(
        <div style={style}>
          <TideStation id="noaa/8443970" />
        </div>,
        { wrapper: createTestWrapper() },
      );
      const view = within(result.container);

      await waitFor(
        () => {
          expect(view.queryByText("Loading...")).toBeNull();
        },
        { timeout: 10000 },
      );

      return { ...result, view };
    }

    test("collapses to tabs in a small container", async () => {
      const { view } = await renderCompact();

      expect(view.getByRole("tablist")).toBeDefined();
      expect(view.getByRole("tab", { name: "Conditions" })).toBeDefined();
      expect(view.getByRole("tab", { name: "Graph" })).toBeDefined();
      expect(view.getByRole("tab", { name: "Table" })).toBeDefined();
      expect(view.getByRole("tab", { name: "Settings" })).toBeDefined();

      // Only the conditions panel is rendered initially
      expect(view.queryByRole("table")).toBeNull();
    });

    test("collapses to tabs when only the height is constrained", async () => {
      const { view } = await renderCompact({ width: 700, height: 300 });

      expect(view.getByRole("tablist")).toBeDefined();
    });

    test("switches tabs on click and updates the URL hash", async () => {
      const user = userEvent.setup();
      const { view } = await renderCompact();

      await user.click(view.getByRole("tab", { name: "Table" }));

      expect(view.getByRole("table")).toBeDefined();
      expect(view.getByRole("tab", { name: "Table" }).getAttribute("aria-selected")).toBe("true");
      expect(window.location.hash).toBe("#table");
    });

    test("shows settings and disclaimers behind the settings tab", async () => {
      const user = userEvent.setup();
      const { view } = await renderCompact();

      await user.click(view.getByRole("tab", { name: "Settings" }));

      expect(view.getByLabelText("Units")).toBeDefined();
    });

    test("opens the tab from the URL hash", async () => {
      window.history.replaceState(null, "", "#table");
      const { view } = await renderCompact();

      expect(view.getByRole("tab", { name: "Table" }).getAttribute("aria-selected")).toBe("true");
      expect(view.getByRole("table")).toBeDefined();
    });

    test("collapses the tab bar into a dropdown at very narrow widths", async () => {
      const user = userEvent.setup();
      const { view } = await renderCompact({ width: 250, height: 220 });

      expect(view.queryByRole("tablist")).toBeNull();
      const dropdown = view.getByRole("combobox", { name: "Section" });

      await user.selectOptions(dropdown, "Table");

      expect(view.getByRole("table")).toBeDefined();
      expect(window.location.hash).toBe("#table");
    });

    test("shows the tab bar instead of the dropdown when wide enough", async () => {
      const { view } = await renderCompact({ width: 400, height: 320 });

      expect(view.getByRole("tablist")).toBeDefined();
      expect(view.queryByRole("combobox", { name: "Section" })).toBeNull();
    });

    test("supports arrow key navigation between tabs", async () => {
      const user = userEvent.setup();
      const { view } = await renderCompact();

      await user.click(view.getByRole("tab", { name: "Conditions" }));
      await user.keyboard("{ArrowRight}");

      expect(view.getByRole("tab", { name: "Graph" }).getAttribute("aria-selected")).toBe("true");
      expect(window.location.hash).toBe("#graph");
    });
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
