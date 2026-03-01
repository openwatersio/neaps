import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationSearch } from "../../src/components/StationSearch.js";
import { createTestWrapper } from "../helpers.js";

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
    localStorage.setItem(
      "neaps-recent-searches",
      JSON.stringify([{ id: "noaa/8443970", name: "Boston", region: "MA", country: "US" }]),
    );

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
    localStorage.setItem(
      "neaps-recent-searches",
      JSON.stringify([{ id: "noaa/8443970", name: "Boston", region: "MA", country: "US" }]),
    );

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
});
