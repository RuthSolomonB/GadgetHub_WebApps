import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe(target) {
    this.callback([
      {
        target,
        contentRect: {
          width: target.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 1024) || 1024,
          height: target.clientHeight || 0,
        },
      },
    ]);
  }

  unobserve() {}

  disconnect() {}
}

globalThis.ResizeObserver = MockResizeObserver;

if (typeof window !== "undefined" && window.HTMLElement?.prototype) {
  Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
}

afterEach(() => {
  cleanup();
});
