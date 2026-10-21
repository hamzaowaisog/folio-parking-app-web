// Written by ai-factory from ai-factory design 20261021-folio3-parking-app-introductio-4049 v1 (73c567c899bf), approved by Hamza (via web) on 2026-10-21.
// Every test runs at TEST_NOW in UTC (set up in ./setup): work out expected dates and durations from it, never from the real clock.
// (the factory's environment check runs the tests once more at another instant, through FACTORY_TEST_NOW)
export const TEST_NOW = new Date(process.env.FACTORY_TEST_NOW ?? "2026-01-15T12:00:00.000Z");

// What a screen test reads and sets about the address. In tests the app's navigation (lib/nav) is replaced by this:
// nothing really navigates, and every place the page went to is kept in nav.went.
export const nav = { path: "/", params: {} as Record<string, string>, went: [] as string[] };

/** Put the test at an address before rendering, e.g. at("/orders/7", { tab: "paid" }). */
export function at(path: string, params: Record<string, string> = {}): void {
  nav.path = path;
  nav.params = params;
}

export function resetNav(): void {
  nav.path = "/";
  nav.params = {};
  nav.went = [];
}
