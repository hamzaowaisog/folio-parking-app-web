// Written by ai-factory from ai-factory design 20261021-folio3-parking-app-introductio-4049 v1 (73c567c899bf), approved by Hamza (via web) on 2026-10-21.
// Runs before every test file. A screen test (a *.test.tsx file whose first line is "// @vitest-environment jsdom") renders
// a page with no router and no browser: navigation is recorded in ./screen, and the few browser parts jsdom lacks are
// filled in. A plain *.test.ts file is not affected.
import { afterEach, beforeEach, vi } from "vitest";
// the DOM matchers screen tests use (toBeVisible, toBeInTheDocument, toHaveTextContent ...)
import "@testing-library/jest-dom/vitest";
import { resetNav, TEST_NOW } from "./screen";

// The same instant and time zone on every run and machine. Only Date is faked, and it moves on with real time from TEST_NOW,
// so waits, timers and debounces work as usual.
process.env.TZ = "UTC";
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"], now: TEST_NOW, shouldAdvanceTime: true }); });

vi.mock("@/lib/nav", async () => {
  const { createElement } = await import("react");
  const { nav } = await import("./screen");
  return {
    useNav: () => ({ path: nav.path, go: (to: string) => { nav.went.push(to); }, param: (name: string) => nav.params[name] ?? null }),
    Link: ({ to, onClick, ...props }: { to: string; onClick?: (e: unknown) => void } & Record<string, unknown>) =>
      createElement("a", { ...props, href: to, onClick: (e: { preventDefault(): void }) => { onClick?.(e); e.preventDefault(); nav.went.push(to); } }),
  };
});

// A page that uses the router's package itself, not lib/nav, gets the same stand-in: outside the app it has no router.
vi.mock("next/navigation", async (original) => {
  const real = await original<typeof import("next/navigation")>();
  const { nav } = await import("./screen");
  const go = (to: string) => { nav.went.push(to); };
  return {
    ...real,
    useRouter: () => ({ push: go, replace: go, back: () => {}, forward: () => {}, refresh: () => {}, prefetch: () => {} }),
    usePathname: () => nav.path,
    useSearchParams: () => new URLSearchParams(nav.params),
    useParams: () => nav.params,
  };
});

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  const { nav } = await import("./screen");
  return {
    default: ({ href, onClick, prefetch: _p, replace: _r, scroll: _s, ...props }: { href: unknown; onClick?: (e: unknown) => void } & Record<string, unknown>) =>
      createElement("a", { ...props, href: String(href), onClick: (e: { preventDefault(): void }) => { onClick?.(e); e.preventDefault(); nav.went.push(String(href)); } }),
  };
});

// A page is tested without the app's frame, so render() puts around it what the frame gives every page: the tooltip
// provider (a page with a tooltip cannot render without it) and the place toasts appear in.
vi.mock("@testing-library/react", async (original) => {
  const real = await original<typeof import("@testing-library/react")>();
  const { createElement, Fragment } = await import("react");
  const { TooltipProvider } = await import("@/components/ui/tooltip");
  const { Toaster } = await import("@/components/ui/sonner");
  const wrapper = ({ children }: { children: unknown }) => createElement(TooltipProvider, null, createElement(Fragment, null, children as never, createElement(Toaster)));
  return { ...real, render: (ui: never, options?: object) => real.render(ui, { wrapper: wrapper as never, ...options }) };
});

if (typeof window !== "undefined") {
  const noop = () => undefined;
  class Observer { observe = noop; unobserve = noop; disconnect = noop; takeRecords = () => []; }
  const w = window as unknown as Record<string, unknown>;
  w.ResizeObserver ??= Observer;
  w.IntersectionObserver ??= Observer;
  w.matchMedia ??= (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop, dispatchEvent: () => false });
  const el = Element.prototype as unknown as Record<string, unknown>;
  el.scrollIntoView ??= noop;
  el.hasPointerCapture ??= () => false;
  el.setPointerCapture ??= noop;
  el.releasePointerCapture ??= noop;
}

afterEach(async () => {
  vi.useRealTimers();
  resetNav();
  if (typeof document !== "undefined") (await import("@testing-library/react")).cleanup();
});
