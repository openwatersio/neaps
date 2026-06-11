import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationSearch } from "../../src/components/StationSearch.js";
import { createTestWrapper } from "../helpers.js";

const recentBoston = {
  id: "noaa/8443970",
  name: "Boston",
  region: "MA",
  country: "US",
  latitude: 42.3539,
  longitude: -71.0503,
  continent: "North America",
  timezone: "America/New_York",
  type: "reference",
};

describe("StationSearch", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("renders input with default placeholder", () => {
    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByPlaceholderText("Search stations...")).toBeDefined();
  });

  test("renders input with custom placeholder", () => {
    const { container } = render(
      <StationSearch onSelect={vi.fn()} placeholder="Find a station..." />,
      { wrapper: createTestWrapper() },
    );
    const view = within(container);

    expect(view.getByPlaceholderText("Find a station...")).toBeDefined();
  });

  test("has combobox role with correct ARIA attributes", () => {
    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.getAttribute("autocomplete")).toBe("off");
  });

  test("does not show dropdown when query is too short", async () => {
    const user = userEvent.setup();
    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.type(input, "B");

    expect(view.queryByRole("listbox")).toBeNull();
  });

  test("closes dropdown on Escape", async () => {
    const user = userEvent.setup();

    // Seed recent searches so dropdown opens on focus
    localStorage.setItem("neaps-recent-searches", JSON.stringify([recentBoston]));

    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.click(input);

    expect(view.getByRole("listbox")).toBeDefined();

    await user.keyboard("{Escape}");

    expect(view.queryByRole("listbox")).toBeNull();
  });

  test("saves selected station to recent searches", async () => {
    const user = userEvent.setup();

    // Seed recent searches
    localStorage.setItem("neaps-recent-searches", JSON.stringify([recentBoston]));

    const onSelect = vi.fn();
    const { container } = render(<StationSearch onSelect={onSelect} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.click(input);

    const option = view.getAllByRole("option")[0];
    await user.click(option);

    const recent = JSON.parse(localStorage.getItem("neaps-recent-searches") ?? "[]");
    expect(recent.length).toBeGreaterThan(0);
  });

  test("discards recent searches saved in a legacy shape", async () => {
    const user = userEvent.setup();

    // Old versions persisted only id/name/region/country
    localStorage.setItem(
      "neaps-recent-searches",
      JSON.stringify([{ id: "noaa/8443970", name: "Boston", region: "MA", country: "US" }]),
    );

    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await user.click(view.getByRole("combobox"));

    expect(view.queryByRole("listbox")).toBeNull();
  });

  test("navigates recent searches with arrow keys and selects with Enter", async () => {
    const user = userEvent.setup();

    const recentPortland = {
      ...recentBoston,
      id: "noaa/8418150",
      name: "Portland",
      region: "ME",
      latitude: 43.6567,
      longitude: -70.2467,
    };
    localStorage.setItem("neaps-recent-searches", JSON.stringify([recentBoston, recentPortland]));

    const onSelect = vi.fn();
    const { container } = render(<StationSearch onSelect={onSelect} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.click(input);

    await user.keyboard("{ArrowDown}{ArrowDown}");

    const options = view.getAllByRole("option");
    expect(options[1].getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(options[1].id);

    // ArrowUp moves back to the first option
    await user.keyboard("{ArrowUp}");
    expect(view.getAllByRole("option")[0].getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledOnce();
    const selected = onSelect.mock.calls[0][0];
    expect(selected.id).toBe(recentBoston.id);
    // Recent selections carry the full station summary, not placeholders
    expect(selected.latitude).toBe(recentBoston.latitude);
    expect(selected.timezone).toBe(recentBoston.timezone);
  });

  test("Enter does nothing when no option is active", async () => {
    const user = userEvent.setup();
    localStorage.setItem("neaps-recent-searches", JSON.stringify([recentBoston]));

    const onSelect = vi.fn();
    const { container } = render(<StationSearch onSelect={onSelect} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    await user.click(view.getByRole("combobox"));
    await user.keyboard("{Enter}");

    expect(onSelect).not.toHaveBeenCalled();
  });
});
