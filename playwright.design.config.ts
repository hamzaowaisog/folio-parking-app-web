// Written by ai-factory from ai-factory design 20261021-folio3-parking-app-introductio-4049 v1 (73c567c899bf), approved by Hamza (via web) on 2026-10-21.
// The approved design's tests (e2e/design): npx playwright test -c playwright.design.config.ts. Set DESIGN_BASE_URL to test a running app,
// DESIGN_BROWSERS=chromium to leave WebKit out, DESIGN_CHANNEL=chrome to use the installed Chrome.
import { defineConfig } from "@playwright/test";

const base = process.env.DESIGN_BASE_URL;
const browsers = (process.env.DESIGN_BROWSERS ?? "chromium,webkit").split(",");
const channel = process.env.DESIGN_CHANNEL || undefined;
const chromium = (name: string, viewport: { width: number; height: number }, extra: object = {}) => ({ name, use: { browserName: "chromium" as const, channel, viewport, ...extra } });

export default defineConfig({
  testDir: "./e2e/design",
  fullyParallel: true,
  reporter: process.env.CI ? [["list"], ["json", { outputFile: "test-results/design.json" }]] : "list",
  use: { baseURL: base ?? "http://127.0.0.1:3100", reducedMotion: "reduce", locale: "en-US", timezoneId: "UTC" },
  projects: [
    chromium("phone", { width: 390, height: 844 }, { isMobile: true, hasTouch: true }),
    chromium("tablet", { width: 820, height: 1180 }),
    chromium("desktop", { width: 1280, height: 800 }),
    ...(browsers.includes("webkit") ? [{ name: "webkit-phone", use: { browserName: "webkit" as const, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }] : []),
  ],
  webServer: base ? undefined : { command: "npm run build && npx next start -p 3100", url: "http://127.0.0.1:3100", reuseExistingServer: true, timeout: 600_000 },
});
