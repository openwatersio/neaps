import { describe, test, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { NeapsProvider, useNeapsConfig, useUpdateConfig } from "../src/provider.js";
import type { ReactNode } from "react";

beforeEach(() => {
  localStorage.removeItem("neaps-settings");
});

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

  test("defaults units based on locale", () => {
    const minimalWrapper = ({ children }: { children: ReactNode }) => (
      <NeapsProvider baseUrl="https://api.example.com">{children}</NeapsProvider>
    );

    const { result } = renderHook(() => useNeapsConfig(), { wrapper: minimalWrapper });

    // en-US defaults to feet; non-US locales default to meters
    expect(result.current.units).toBe("feet");
    expect(result.current.datum).toBeUndefined();
  });

  test("defaults timezone to undefined", () => {
    const minimalWrapper = ({ children }: { children: ReactNode }) => (
      <NeapsProvider baseUrl="https://api.example.com">{children}</NeapsProvider>
    );

    const { result } = renderHook(() => useNeapsConfig(), { wrapper: minimalWrapper });
    expect(result.current.timezone).toBeUndefined();
  });

  test("applies initial datum prop", () => {
    const datumWrapper = ({ children }: { children: ReactNode }) => (
      <NeapsProvider baseUrl="https://api.example.com" datum="MSL">
        {children}
      </NeapsProvider>
    );

    const { result } = renderHook(() => useNeapsConfig(), { wrapper: datumWrapper });
    expect(result.current.datum).toBe("MSL");
  });

  test("applies initial timezone prop", () => {
    const tzWrapper = ({ children }: { children: ReactNode }) => (
      <NeapsProvider baseUrl="https://api.example.com" timezone="America/Los_Angeles">
        {children}
      </NeapsProvider>
    );

    const { result } = renderHook(() => useNeapsConfig(), { wrapper: tzWrapper });
    expect(result.current.timezone).toBe("America/Los_Angeles");
  });

  test("throws when useNeapsConfig is used outside provider", () => {
    expect(() => {
      renderHook(() => useNeapsConfig());
    }).toThrow("useNeapsConfig must be used within a <NeapsProvider>");
  });

  test("throws when useUpdateConfig is used outside provider", () => {
    expect(() => {
      renderHook(() => useUpdateConfig());
    }).toThrow("useUpdateConfig must be used within a <NeapsProvider>");
  });
});

describe("useUpdateConfig", () => {
  test("updates units", () => {
    const { result } = renderHook(() => ({ config: useNeapsConfig(), update: useUpdateConfig() }), {
      wrapper,
    });

    expect(result.current.config.units).toBe("feet");

    act(() => {
      result.current.update({ units: "meters" });
    });

    expect(result.current.config.units).toBe("meters");
  });

  test("updates datum", () => {
    const { result } = renderHook(() => ({ config: useNeapsConfig(), update: useUpdateConfig() }), {
      wrapper,
    });

    act(() => {
      result.current.update({ datum: "MSL" });
    });

    expect(result.current.config.datum).toBe("MSL");
  });

  test("updates timezone", () => {
    const { result } = renderHook(() => ({ config: useNeapsConfig(), update: useUpdateConfig() }), {
      wrapper,
    });

    act(() => {
      result.current.update({ timezone: "UTC" });
    });

    expect(result.current.config.timezone).toBe("UTC");
  });

  test("updates locale", () => {
    const { result } = renderHook(() => ({ config: useNeapsConfig(), update: useUpdateConfig() }), {
      wrapper,
    });

    act(() => {
      result.current.update({ locale: "fr-FR" });
    });

    expect(result.current.config.locale).toBe("fr-FR");
  });

  test("persists settings to localStorage", () => {
    const { result } = renderHook(() => ({ config: useNeapsConfig(), update: useUpdateConfig() }), {
      wrapper,
    });

    act(() => {
      result.current.update({ units: "meters" });
    });

    const stored = JSON.parse(localStorage.getItem("neaps-settings") ?? "{}");
    expect(stored.units).toBe("meters");
  });
});
