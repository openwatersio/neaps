import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationSearch } from "../../src/components/StationSearch.js";
import { createTestWrapper } from "../helpers.js";

// Node 22's global localStorage doesn't implement Web Storage API
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  },
  writable: true,
  configurable: true,
});

describe("StationSearch integration", () => {
  beforeEach(() => store.clear());

  test("renders search input", () => {
    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    expect(view.getByRole("combobox")).toBeDefined();
  });

  test("shows results when typing a query", async () => {
    const user = userEvent.setup();
    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.type(input, "Boston");

    await waitFor(
      () => {
        expect(view.getByRole("listbox")).toBeDefined();
      },
      { timeout: 10000 },
    );

    const options = view.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
  });

  test("calls onSelect when a result is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<StationSearch onSelect={onSelect} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.type(input, "Boston");

    await waitFor(
      () => {
        expect(view.getByRole("listbox")).toBeDefined();
      },
      { timeout: 10000 },
    );

    const option = view.getAllByRole("option")[0];
    await user.click(option);

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect.mock.calls[0][0]).toHaveProperty("id");
    expect(onSelect.mock.calls[0][0]).toHaveProperty("name");
  });

  test("shows recent searches when focused with empty query", async () => {
    // Seed localStorage
    const recent = [{ id: "noaa/8443970", name: "Boston", region: "MA", country: "US" }];
    localStorage.setItem("neaps-recent-searches", JSON.stringify(recent));

    const user = userEvent.setup();
    const { container } = render(<StationSearch onSelect={vi.fn()} />, {
      wrapper: createTestWrapper(),
    });
    const view = within(container);

    const input = view.getByRole("combobox");
    await user.click(input);

    await waitFor(() => {
      expect(view.getByText("Recent")).toBeDefined();
    });

    expect(view.getByText("Boston")).toBeDefined();

    // Clean up
    localStorage.removeItem("neaps-recent-searches");
  });
});
