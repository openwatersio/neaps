import { describe, test, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { StationDisclaimers } from "../../src/components/StationDisclaimers.js";

describe("StationDisclaimers", () => {
  test("renders nothing when disclaimers is undefined", () => {
    const { container } = render(<StationDisclaimers />);
    expect(container.innerHTML).toBe("");
  });

  test("renders nothing when disclaimers is empty string", () => {
    const { container } = render(<StationDisclaimers disclaimers="" />);
    // falsy string returns null
    expect(container.innerHTML).toBe("");
  });

  test("renders disclaimer text", () => {
    const text = "Data is for reference only. Not for navigation.";
    const { container } = render(<StationDisclaimers disclaimers={text} />);

    const view = within(container);
    expect(view.getByText(text)).toBeDefined();
  });

  test("renders as a paragraph element", () => {
    const { container } = render(<StationDisclaimers disclaimers="Some disclaimer" />);

    const p = container.querySelector("p");
    expect(p).not.toBeNull();
    expect(p!.textContent).toBe("Some disclaimer");
  });

  test("applies className", () => {
    const { container } = render(<StationDisclaimers disclaimers="Test" className="my-class" />);

    const p = container.querySelector("p");
    expect(p!.className).toContain("my-class");
  });
});
