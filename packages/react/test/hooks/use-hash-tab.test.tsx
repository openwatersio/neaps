import { describe, test, expect, afterEach } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import { useHashTab } from "../../src/hooks/use-hash-tab.js";

const TABS = ["conditions", "graph", "table"] as const;

function Probe() {
  const tabs = useMemo(() => TABS, []);
  const [active, setActive] = useHashTab(tabs, "conditions");
  return (
    <div>
      <span data-testid="active">{active}</span>
      {tabs.map((tab) => (
        <button key={tab} type="button" onClick={() => setActive(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

function resetHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

describe("useHashTab", () => {
  afterEach(resetHash);

  test("defaults to the given tab without a hash", () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("active").textContent).toBe("conditions");
  });

  test("initializes from the URL hash", () => {
    window.history.replaceState(null, "", "#graph");
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("active").textContent).toBe("graph");
  });

  test("ignores hashes that are not tabs", () => {
    window.history.replaceState(null, "", "#some-anchor");
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("active").textContent).toBe("conditions");
  });

  test("selecting a tab updates the URL hash without adding history entries", () => {
    const historyLength = window.history.length;
    const { getByTestId, getByRole } = render(<Probe />);

    act(() => {
      getByRole("button", { name: "table" }).click();
    });

    expect(getByTestId("active").textContent).toBe("table");
    expect(window.location.hash).toBe("#table");
    expect(window.history.length).toBe(historyLength);
  });

  test("responds to external hash changes", async () => {
    const { getByTestId } = render(<Probe />);

    act(() => {
      window.location.hash = "#graph";
    });

    await waitFor(() => {
      expect(getByTestId("active").textContent).toBe("graph");
    });
  });
});
