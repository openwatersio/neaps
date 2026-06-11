import { describe, test, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useContainerSize } from "../../src/hooks/use-container-size.js";

function Probe() {
  const { ref, width, height } = useContainerSize();
  return (
    <div ref={ref} style={{ width: 320, height: 180 }} data-testid="container">
      {width}x{height}
    </div>
  );
}

describe("useContainerSize", () => {
  test("reports the observed container size", async () => {
    const { getByTestId } = render(<Probe />);

    await waitFor(() => {
      expect(getByTestId("container").textContent).toBe("320x180");
    });
  });

  test("measures elements that mount after the first render", async () => {
    function LateProbe() {
      const { ref, width, height } = useContainerSize();
      const [mounted, setMounted] = useState(false);
      if (!mounted) {
        return (
          <button type="button" onClick={() => setMounted(true)}>
            mount
          </button>
        );
      }
      return (
        <div ref={ref} style={{ width: 200, height: 100 }} data-testid="late">
          {width}x{height}
        </div>
      );
    }

    const { getByRole, getByTestId } = render(<LateProbe />);
    getByRole("button").click();

    await waitFor(() => {
      expect(getByTestId("late").textContent).toBe("200x100");
    });
  });
});
