import { describe, test, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDebouncedCallback } from "../../src/hooks/use-debounced-callback.js";

const DELAY = 50;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("useDebouncedCallback", () => {
  test("invokes the callback once with the latest arguments", async () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, DELAY));

    result.current("a");
    result.current("b");
    result.current("c");

    expect(fn).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(fn).toHaveBeenCalledExactlyOnceWith("c");
    });
  });

  test("uses the latest callback without resetting the timer", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useDebouncedCallback(fn, DELAY), {
      initialProps: { fn: first },
    });

    result.current();
    rerender({ fn: second });

    await waitFor(() => {
      expect(second).toHaveBeenCalledOnce();
    });
    expect(first).not.toHaveBeenCalled();
  });

  test("cancels the pending invocation on unmount", async () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, DELAY));

    result.current();
    unmount();

    await sleep(DELAY * 3);

    expect(fn).not.toHaveBeenCalled();
  });
});
