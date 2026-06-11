import { describe, test, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useContainerWidth } from "../../src/hooks/use-container-width.js";

function Probe() {
  const { ref, width } = useContainerWidth();
  return (
    <div ref={ref} style={{ width: 320 }} data-testid="container">
      {width}
    </div>
  );
}

describe("useContainerWidth", () => {
  test("reports the observed container width", async () => {
    const { getByTestId } = render(<Probe />);

    await waitFor(() => {
      expect(getByTestId("container").textContent).toBe("320");
    });
  });
});
