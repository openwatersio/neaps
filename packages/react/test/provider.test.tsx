import { describe, test, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { NeapsProvider, useNeapsConfig } from "../src/provider.js";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <NeapsProvider baseUrl="https://api.example.com" units="feet" datum="MLLW">
      {children}
    </NeapsProvider>
  );
}

describe("NeapsProvider", () => {
  test("provides config to consumers", () => {
    const { result } = renderHook(() => useNeapsConfig(), { wrapper });

    expect(result.current).toEqual({
      baseUrl: "https://api.example.com",
      units: "feet",
      datum: "MLLW",
      locale: "en-US",
    });
  });

  test("defaults units to meters", () => {
    const minimalWrapper = ({ children }: { children: ReactNode }) => (
      <NeapsProvider baseUrl="https://api.example.com">{children}</NeapsProvider>
    );

    const { result } = renderHook(() => useNeapsConfig(), { wrapper: minimalWrapper });

    expect(result.current.units).toBe("meters");
    expect(result.current.datum).toBeUndefined();
  });

  test("throws when used outside provider", () => {
    expect(() => {
      renderHook(() => useNeapsConfig());
    }).toThrow("useNeapsConfig must be used within a <NeapsProvider>");
  });
});
