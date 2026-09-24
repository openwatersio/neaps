import { describe, test, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SlackwaterProvider, useSlackwaterConfig, useUpdateConfig } from "../src/provider.js";
import type { ReactNode } from "react";

beforeEach(() => {
  localStorage.removeItem("slackwater-settings");
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SlackwaterProvider baseUrl="https://api.example.com" units="feet" datum="MLLW">
      {children}
    </SlackwaterProvider>
  );
}

describe("SlackwaterProvider", () => {
  test("provides config to consumers", () => {
    const { result } = renderHook(() => useSlackwaterConfig(), { wrapper });

    expect(result.current).toEqual({
      baseUrl: "https://api.example.com",
      units: "feet",
      datum: "MLLW",
      locale: "en-US",
    });
  });

  test("defaults units based on locale", () => {
    const minimalWrapper = ({ children }: { children: ReactNode }) => (
      <SlackwaterProvider baseUrl="https://api.example.com">{children}</SlackwaterProvider>
    );

    const { result } = renderHook(() => useSlackwaterConfig(), { wrapper: minimalWrapper });

    // en-US defaults to feet; non-US locales default to meters
    expect(result.current.units).toBe("feet");
    expect(result.current.datum).toBeUndefined();
  });

  test("defaults timezone to undefined", () => {
    const minimalWrapper = ({ children }: { children: ReactNode }) => (
      <SlackwaterProvider baseUrl="https://api.example.com">{children}</SlackwaterProvider>
    );

    const { result } = renderHook(() => useSlackwaterConfig(), { wrapper: minimalWrapper });
    expect(result.current.timezone).toBeUndefined();
  });

  test("applies initial datum prop", () => {
    const datumWrapper = ({ children }: { children: ReactNode }) => (
      <SlackwaterProvider baseUrl="https://api.example.com" datum="MSL">
        {children}
      </SlackwaterProvider>
    );

    const { result } = renderHook(() => useSlackwaterConfig(), { wrapper: datumWrapper });
    expect(result.current.datum).toBe("MSL");
  });

  test("applies initial timezone prop", () => {
    const tzWrapper = ({ children }: { children: ReactNode }) => (
      <SlackwaterProvider baseUrl="https://api.example.com" timezone="America/Los_Angeles">
        {children}
      </SlackwaterProvider>
    );

    const { result } = renderHook(() => useSlackwaterConfig(), { wrapper: tzWrapper });
    expect(result.current.timezone).toBe("America/Los_Angeles");
  });

  test("throws when useSlackwaterConfig is used outside provider", () => {
    expect(() => {
      renderHook(() => useSlackwaterConfig());
    }).toThrow("useSlackwaterConfig must be used within a <SlackwaterProvider>");
  });

  test("throws when useUpdateConfig is used outside provider", () => {
    expect(() => {
      renderHook(() => useUpdateConfig());
    }).toThrow("useUpdateConfig must be used within a <SlackwaterProvider>");
  });
});

describe("useUpdateConfig", () => {
  test("updates units", () => {
    const { result } = renderHook(
      () => ({ config: useSlackwaterConfig(), update: useUpdateConfig() }),
      {
        wrapper,
      },
    );

    expect(result.current.config.units).toBe("feet");

    act(() => {
      result.current.update({ units: "meters" });
    });

    expect(result.current.config.units).toBe("meters");
  });

  test("updates datum", () => {
    const { result } = renderHook(
      () => ({ config: useSlackwaterConfig(), update: useUpdateConfig() }),
      {
        wrapper,
      },
    );

    act(() => {
      result.current.update({ datum: "MSL" });
    });

    expect(result.current.config.datum).toBe("MSL");
  });

  test("updates timezone", () => {
    const { result } = renderHook(
      () => ({ config: useSlackwaterConfig(), update: useUpdateConfig() }),
      {
        wrapper,
      },
    );

    act(() => {
      result.current.update({ timezone: "UTC" });
    });

    expect(result.current.config.timezone).toBe("UTC");
  });

  test("updates locale", () => {
    const { result } = renderHook(
      () => ({ config: useSlackwaterConfig(), update: useUpdateConfig() }),
      {
        wrapper,
      },
    );

    act(() => {
      result.current.update({ locale: "fr-FR" });
    });

    expect(result.current.config.locale).toBe("fr-FR");
  });

  test("persists settings to localStorage", () => {
    const { result } = renderHook(
      () => ({ config: useSlackwaterConfig(), update: useUpdateConfig() }),
      {
        wrapper,
      },
    );

    act(() => {
      result.current.update({ units: "meters" });
    });

    const stored = JSON.parse(localStorage.getItem("slackwater-settings") ?? "{}");
    expect(stored.units).toBe("meters");
  });
});
