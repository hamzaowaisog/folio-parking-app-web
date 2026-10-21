// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { getFolio3ParkingAPIMock, getGetLiveGateEventsMockHandler } from "@/lib/api/client.msw";
import { GateTue14OctLiveContainer } from "@/components/screens/s-7/container";
import { at } from "./support/screen";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: () => "test-access-token",
  storeAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

const server = setupServer(...getFolio3ParkingAPIMock());

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

// Review R-3: with the camera unavailable the page kept showing the last authorised event and its green light.
describe("gate while the camera is unavailable", () => {
  it("shows no earlier authorised event or green light", async () => {
    at("/gate");
    server.use(getGetLiveGateEventsMockHandler({
      cameraStatus: "unavailable",
      events: [{
        id: 9911, plate: "QRT-762", driver: "Daniyal Sheikh", date: "2025-10-14", time: "08:24:15", result: "Authorised",
        entryStatus: "Admitted", indicatorState: "green", reason: "Valid temporary authorisation today", permanentSticker: false,
      }],
    }));

    render(<GateTue14OctLiveContainer />);

    expect((await screen.findAllByText("Denied", { exact: true }))[0]).toBeVisible();
    // the earlier check stays in today's list, but not as the car at the gate now
    const table = screen.getByRole("table");
    for (const plate of screen.queryAllByText("QRT-762")) expect(table.contains(plate)).toBe(true);
    expect(screen.queryByText("green", { exact: true })).not.toBeInTheDocument();
  });
});
