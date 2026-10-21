// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { Dashboard, GateFeed, Report, Verification, VerificationList } from "@/lib/api/client.schemas";
import {
  getClaimParkingSpaceResponseMock,
  getFolio3ParkingAPIMock,
  getGetLiveGateEventsMockHandler,
  getGetParkingDashboardMockHandler,
  getGetParkingDashboardResponseMock,
  getGetParkingReportMockHandler,
  getGetParkingReportResponseMock,
  getListEntryRecordsMockHandler,
  getListEntryRecordsResponseMock,
} from "@/lib/api/client.msw";
import { DashboardContainer } from "@/components/screens/s-3/container";
import { FreeSpacesContainer } from "@/components/screens/s-5/container";
import { GateTue14OctLiveContainer } from "@/components/screens/s-7/container";
import { EntryRecordsContainer } from "@/components/screens/s-8/container";
import { ReportsContainer } from "@/components/screens/s-9/container";
import { at } from "./support/screen";

const server = setupServer(...getFolio3ParkingAPIMock());

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});

function verification(overrides: Partial<Verification>): Verification {
  return {
    id: 9901,
    plate: "LXA-093",
    driver: "Unknown driver",
    date: "2025-10-14",
    time: "08:24:15",
    result: "Denied",
    entryStatus: "Denied",
    indicatorState: "off",
    reason: "No valid authorisation today",
    permanentSticker: false,
    ...overrides,
  };
}

describe("parking claim and availability", () => {
  it("AC_14_1_ShowsClaimUnavailableMessageWithoutClaimAssignment", async () => {
    at("/free-spaces");
    server.use(
      http.post("*/parking/claims", () => HttpResponse.json({
        message: "No space could be claimed. The last free space was taken just now.",
        code: "CONFLICT",
      }, { status: 409 })),
    );

    const user = userEvent.setup();
    render(<FreeSpacesContainer />);
    const claimButton = screen.queryByRole("button", { name: "Claim a space" });
    if (claimButton) await user.click(claimButton);

    expect(await screen.findByText("No space could be claimed. The last free space was taken just now.")).toBeVisible();
    expect(screen.queryByText("You have a space on Floor 3")).not.toBeInTheDocument();
    expect(screen.queryByText("AWC-917")).not.toBeInTheDocument();
  });

  it("AC_14_2_ShowsClaimAssignmentWithoutSelfServiceCancellation", async () => {
    at("/dashboard");
    const dashboard: Dashboard = {
      ...getGetParkingDashboardResponseMock(),
      currentClaim: getClaimParkingSpaceResponseMock(),
    };
    server.use(getGetParkingDashboardMockHandler(dashboard));

    render(<DashboardContainer />);

    expect(await screen.findByText("You have a space on Floor 3")).toBeVisible();
    expect(screen.getByText("AWC-917")).toBeVisible();
    expect(screen.getByText("Park anywhere on Floor 3. You don't get a numbered bay.")).toBeVisible();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Claim a space" })).not.toBeInTheDocument();
  });

  it("AC_15_1_ShowsReturnedAvailabilityNoticeAndSpaceCount", async () => {
    at("/dashboard");
    server.use(getGetParkingDashboardMockHandler(getGetParkingDashboardResponseMock()));

    render(<DashboardContainer />);

    expect(await screen.findByText("Parking is free today. 5 spots on Floors 1 and 3.")).toBeVisible();
    expect(screen.getByText("5", { exact: true })).toBeVisible();
    expect(screen.getByText("Parking spots available")).toBeVisible();
  });

  it("AC_15_2_IdentifiesEmailAlertDestination", async () => {
    at("/dashboard");
    server.use(getGetParkingDashboardMockHandler(getGetParkingDashboardResponseMock()));

    render(<DashboardContainer />);

    expect(await screen.findByText("Alerts go to bilal.ahmed@folio3.com")).toBeVisible();
    expect(screen.getByText("bilal.ahmed@folio3.com", { exact: true })).toBeVisible();
  });
});

describe("gate verification", () => {
  it("AC_16_1_ShowsAuthorizedPlateEntryAndGreenIndicator", async () => {
    at("/gate");
    const feed: GateFeed = {
      cameraStatus: "online",
      events: [verification({
        id: 9911,
        plate: "QRT-762",
        driver: "Daniyal Sheikh",
        result: "Authorised",
        entryStatus: "Admitted",
        indicatorState: "green",
        reason: "Valid temporary authorisation today",
      })],
    };
    server.use(getGetLiveGateEventsMockHandler(feed));

    render(<GateTue14OctLiveContainer />);

    expect(await screen.findByText("QRT-762")).toBeVisible();
    expect(screen.getByText("Authorised", { exact: true })).toBeVisible();
    expect(screen.getByText("Admitted", { exact: true })).toBeVisible();
    expect(screen.getByText("green", { exact: true })).toBeVisible();
  });

  it("AC_16_2_ShowsReturnedVerificationFieldsForDetectedPlate", async () => {
    at("/gate");
    const feed: GateFeed = {
      cameraStatus: "online",
      events: [verification({
        id: 9912,
        plate: "MNP-640",
        driver: "Ayesha Malik",
        result: "Denied",
        entryStatus: "Held at gate",
        indicatorState: "off",
        reason: "Verification review required",
      })],
    };
    server.use(getGetLiveGateEventsMockHandler(feed));

    render(<GateTue14OctLiveContainer />);

    expect(await screen.findByText("MNP-640")).toBeVisible();
    expect(screen.getByText("Denied", { exact: true })).toBeVisible();
    expect(screen.getByText("Held at gate", { exact: true })).toBeVisible();
    expect(screen.getByText("off", { exact: true })).toBeVisible();
  });

  it("AC_17_1_ShowsDeniedResultForPlateWithoutValidAuthorization", async () => {
    at("/gate");
    render(<GateTue14OctLiveContainer />);

    expect(await screen.findByText("LXA-093")).toBeVisible();
    expect(screen.getByText("Entry denied")).toBeVisible();
    expect(screen.getByText("No valid authorisation today")).toBeVisible();
    expect(screen.getByText("Indicator off")).toBeVisible();
  });

  it("AC_17_2_ShowsUnavailableAndKeepsEntryDeniedUntilVerificationReturns", async () => {
    at("/gate");
    server.use(
      http.get("*/gate/events/live", () => HttpResponse.json({
        message: "Verification is not available right now.",
        code: "SERVICE_UNAVAILABLE",
      }, { status: 503 })),
    );

    render(<GateTue14OctLiveContainer />);

    expect(await screen.findByText("Verification isn't available right now.")).toBeVisible();
    expect(screen.getByText("Entry denied")).toBeVisible();
    expect(screen.getByText("Indicator off")).toBeVisible();
    await waitFor(() => expect(document.body).toHaveTextContent(/deny entry.*until.*verification.*restored/i));
  });

  it("AC_17_3_BypassesTemporaryAuthorizationChallengeForPermanentSticker", async () => {
    at("/gate");
    const feed: GateFeed = {
      cameraStatus: "online",
      events: [verification({
        id: 9913,
        plate: "KLM-305",
        driver: "Sana Raza",
        result: "Existing process",
        entryStatus: "Existing process",
        indicatorState: "not used",
        reason: "Permanent sticker. Use the existing process.",
        permanentSticker: true,
      })],
    };
    server.use(getGetLiveGateEventsMockHandler(feed));

    render(<GateTue14OctLiveContainer />);

    expect(await screen.findByText("KLM-305")).toBeVisible();
    expect(screen.getByText("Permanent sticker. Use the existing process.")).toBeVisible();
    expect(screen.getByText("Indicator not used")).toBeVisible();
    expect(screen.queryByText(/temporary authori[sz]ation/i)).not.toBeInTheDocument();
  });
});

describe("administrator verification records", () => {
  it("AC_18_1_ShowsEveryReturnedVerificationRecordField", async () => {
    at("/admin/entry-records");
    const records: VerificationList = {
      total: 3,
      records: [
        verification({ id: 9921, plate: "QAZ-381", date: "2025-10-14", time: "08:31:02", result: "Authorised", entryStatus: "Admitted", indicatorState: "green" }),
        verification({ id: 9922, plate: "WER-642", date: "2025-10-13", time: "09:12:45", result: "Existing process", entryStatus: "Existing process", indicatorState: "not used", permanentSticker: true }),
        verification({ id: 9923, plate: "JUT-905", date: "2025-10-12", time: "17:44:10", result: "Denied", entryStatus: "Denied", indicatorState: "off" }),
      ],
    };
    server.use(getListEntryRecordsMockHandler(records));

    render(<EntryRecordsContainer />);

    const rows = [
      { plate: "QAZ-381", date: "2025-10-14", time: "08:31:02", result: "Authorised", entryStatus: "Admitted" },
      { plate: "WER-642", date: "2025-10-13", time: "09:12:45", result: "Existing process", entryStatus: "Existing process" },
      { plate: "JUT-905", date: "2025-10-12", time: "17:44:10", result: "Denied", entryStatus: "Denied" },
    ];
    for (const record of rows) {
      const row = await screen.findByRole("row", { name: new RegExp(record.plate) });
      for (const value of [record.plate, record.date, record.time, record.result, record.entryStatus]) {
        expect(within(row).getByText(value, { exact: true })).toBeVisible();
      }
    }
  });

  it("AC_18_2_RefusesAccessWithoutShowingVerificationDetails", async () => {
    at("/admin/entry-records");
    server.use(
      http.get("*/admin/entry-records", () => HttpResponse.json({
        message: "You do not have access to this page.",
        code: "FORBIDDEN",
      }, { status: 403 })),
    );

    render(<EntryRecordsContainer />);

    expect(await screen.findByText("You do not have access to this page.")).toBeVisible();
    expect(screen.queryByText("KLM-305")).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /2025-10-14|08:31:02/ })).not.toBeInTheDocument();
  });
});

function reportRow(date: string, week: string, spacesReleased: number, temporaryClaims: number, utilizationPercent: number) {
  return { date, week, spacesReleased, temporaryClaims, utilizationPercent };
}

describe("parking reports", () => {
  it("AC_19_1_ShowsDailyAndWeeklyStatisticsAndReportCounts", async () => {
    at("/admin/reports");
    server.use(getGetParkingReportMockHandler(getGetParkingReportResponseMock()));

    render(<ReportsContainer />);

    const dailyRow = await screen.findByRole("row", { name: /2025-10-14/ });
    expect(within(dailyRow).getByText("12", { exact: true })).toBeVisible();
    expect(within(dailyRow).getByText("5", { exact: true })).toBeVisible();
    expect(within(dailyRow).getByText("78.5%", { exact: true })).toBeVisible();
    expect(document.body).toHaveTextContent("54");
    expect(document.body).toHaveTextContent("19");
    expect(document.body).toHaveTextContent("81.2%");
  });

  it("AC_19_2_RefreshesReportRowsAndStatisticsForSelectedFilter", async () => {
    at("/admin/reports");
    const daily: Report = {
      period: "daily",
      rows: [
        reportRow("2025-10-12", "Week of 6 Oct", 14, 4, 65.2),
        reportRow("2025-10-13", "Week of 13 Oct", 18, 6, 72.4),
        reportRow("2025-10-14", "Week of 13 Oct", 23, 8, 79.6),
      ],
      dailyStatistics: { releasedSpaces: 55, temporaryClaims: 18, utilizationPercent: 72.4 },
      weeklyStatistics: { releasedSpaces: 150, temporaryClaims: 49, utilizationPercent: 73.8 },
    };
    const weekly: Report = {
      period: "weekly",
      rows: [
        reportRow("2025-10-06", "Week of 6 Oct", 40, 11, 70.5),
        reportRow("2025-10-13", "Week of 13 Oct", 54, 19, 81.2),
        reportRow("2025-10-20", "Week of 20 Oct", 63, 22, 84.1),
      ],
      dailyStatistics: { releasedSpaces: 23, temporaryClaims: 8, utilizationPercent: 79.6 },
      weeklyStatistics: { releasedSpaces: 157, temporaryClaims: 52, utilizationPercent: 78.6 },
    };
    server.use(getGetParkingReportMockHandler(({ request }) => (
      new URL(request.url).searchParams.get("period") === "weekly" ? weekly : daily
    )));

    const user = userEvent.setup();
    render(<ReportsContainer />);
    await user.click(await screen.findByRole("button", { name: "Weekly" }));

    for (const rowData of weekly.rows) {
      const row = await screen.findByRole("row", { name: new RegExp(rowData.date) });
      for (const value of [rowData.date, rowData.spacesReleased.toString(), rowData.temporaryClaims.toString(), `${rowData.utilizationPercent}%`, rowData.week]) {
        expect(within(row).getByText(value, { exact: true })).toBeVisible();
      }
    }
    expect(document.body).toHaveTextContent("157");
    expect(document.body).toHaveTextContent("52");
    expect(document.body).toHaveTextContent("78.6%");
  });

  it("AC_19_3_DownloadsCsvContainingDisplayedReportRowsAndValues", async () => {
    at("/admin/reports");
    server.use(getGetParkingReportMockHandler(getGetParkingReportResponseMock()));
    const downloadedBlobs: Blob[] = [];
    const downloadedLinks: Array<{ filename: string; href: string }> = [];
    const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: vi.fn((blob: Blob) => {
        downloadedBlobs.push(blob);
        return "blob:report-export";
      }),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadedLinks.push({ filename: this.download, href: this.href });
    });

    try {
      const user = userEvent.setup();
      render(<ReportsContainer />);
      await screen.findByRole("row", { name: /2025-10-14/ });
      await user.click(screen.getByRole("button", { name: "Export CSV" }));

      await waitFor(() => expect(downloadedBlobs).toHaveLength(1));
      expect(downloadedLinks).toHaveLength(1);
      expect(downloadedLinks[0].filename).toMatch(/\.csv$/i);
      const csv = await downloadedBlobs[0].text();
      const row = csv.split(/\r?\n/).find((line) => line.includes("2025-10-14"));
      expect(row).toBeDefined();
      for (const value of ["2025-10-14", "12", "5", "78.5", "Week of 13 Oct"]) {
        expect(row).toContain(value);
      }
    } finally {
      if (originalCreateObjectURL) Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
      else Reflect.deleteProperty(URL, "createObjectURL");
    }
  });
});
