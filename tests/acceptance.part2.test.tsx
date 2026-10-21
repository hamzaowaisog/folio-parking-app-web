// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi, waitFor } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { DashboardContainer } from "@/components/screens/s-3/container";
import { MySpaceContainer } from "@/components/screens/s-4/container";
import { FreeSpacesContainer } from "@/components/screens/s-5/container";
import {
  getGetMyProfileResponseMock,
  getGetParkingAvailabilityResponseMock,
  getGetParkingDashboardResponseMock,
  getListMyReleasesResponseMock,
  getScheduleReleasesResponseMock,
  getCancelReleaseResponseMock,
  getClaimParkingSpaceResponseMock,
  getGetMyProfileMockHandler,
  getGetParkingAvailabilityMockHandler,
  getGetParkingDashboardMockHandler,
  getListMyReleasesMockHandler,
  getScheduleReleasesMockHandler,
  getCancelReleaseMockHandler,
  getClaimParkingSpaceMockHandler,
} from "@/lib/api/client.msw";
import { at, TEST_NOW } from "./support/screen";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type ReleaseFixture = ReturnType<typeof getListMyReleasesResponseMock>["releases"][number];
type AvailabilityFixture = ReturnType<typeof getGetParkingAvailabilityResponseMock>;
type DashboardFixture = ReturnType<typeof getGetParkingDashboardResponseMock>;

function officeDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(TEST_NOW);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "0";
  return new Date(Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day")) + offsetDays))
    .toISOString()
    .slice(0, 10);
}

function localTimestamp(date: string, hour: number, minute: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`;
}

function dateParts(date: string) {
  const value = new Date(`${date}T12:00:00+05:00`);
  const longMonth = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", month: "long" }).format(value);
  const shortMonth = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", month: "short" }).format(value);
  const weekday = new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", weekday: "short" }).format(value);
  const day = String(Number(date.slice(8, 10)));
  const year = date.slice(0, 4);
  return { value, longMonth, shortMonth, weekday, day, year };
}

function dateButtonName(date: string): RegExp {
  const { longMonth, day, year } = dateParts(date);
  return new RegExp(`${longMonth}\\s+${day}(?:st|nd|rd|th)?,?\\s+${year}`, "i");
}

function dateTextPattern(date: string): RegExp {
  const { longMonth, shortMonth, day } = dateParts(date);
  return new RegExp(`${date}|${day}\\s+${shortMonth}\\w*|${shortMonth}\\w*\\s+${day}|${day}\\s+${longMonth}|${longMonth}\\s+${day}`, "i");
}

function releaseRecord(
  id: number,
  date: string,
  status: ReleaseFixture["status"],
  createdBy = "Ayesha Malik",
  lastChangedBy = "Ayesha Malik",
  createdAt = localTimestamp(officeDate(-2), 8, 12),
  lastChangedAt = localTimestamp(officeDate(-1), 9, 24),
): ReleaseFixture {
  const example = getListMyReleasesResponseMock().releases[0]!;
  return { ...example, id, date, status, createdBy, lastChangedBy, createdAt, lastChangedAt, claimableAt: localTimestamp(date, 8, 0) };
}

function availability(overrides: Partial<AvailabilityFixture> = {}): AvailabilityFixture {
  return { ...getGetParkingAvailabilityResponseMock(), date: officeDate(), ...overrides };
}

function dashboard(overrides: Partial<DashboardFixture> = {}): DashboardFixture {
  const base = getGetParkingDashboardResponseMock();
  return { ...base, officeDate: officeDate(), availability: { ...base.availability, date: officeDate() }, ...overrides };
}

function temporaryProfile() {
  const profile = getGetMyProfileResponseMock();
  return {
    ...profile,
    employee: { ...profile.employee, name: "Bilal Ahmed", email: "bilal.ahmed@folio3.com" },
    parking: { ...profile.parking, status: "temporary" as const },
  };
}

function profileWithPlates(plates: string[]) {
  const profile = temporaryProfile();
  const vehicle = profile.vehicles[0]!;
  return {
    ...profile,
    vehicles: plates.map((plate, index) => ({ ...vehicle, id: index + 1, plate, make: `Make ${index + 1}`, model: `Model ${index + 1}` })),
  };
}

async function makeUser() {
  return userEvent.setup({ advanceTimers: (milliseconds) => vi.advanceTimersByTime(milliseconds) });
}

async function calendarDayIfVisible(user: Awaited<ReturnType<typeof makeUser>>, date: string) {
  let day = screen.queryByRole("button", { name: dateButtonName(date) });
  for (let attempt = 0; !day && attempt < 3; attempt += 1) {
    const nextMonth = screen.queryByRole("button", { name: /next month/i });
    if (!nextMonth) break;
    await user.click(nextMonth);
    day = screen.queryByRole("button", { name: dateButtonName(date) });
  }
  return day;
}

async function findCalendarDay(user: Awaited<ReturnType<typeof makeUser>>, date: string) {
  const day = await calendarDayIfVisible(user, date);
  expect(day, `calendar day ${date} should be displayed`).toBeTruthy();
  return day;
}

function rowForDate(date: string) {
  return screen.queryAllByRole("row").find((row) => dateTextPattern(date).test(row.textContent ?? ""));
}

function shortDate(date: string): string {
  const { weekday, shortMonth, day } = dateParts(date);
  return `${weekday} ${day} ${shortMonth}`;
}

function timestampTimePattern(timestamp: string): RegExp {
  const [, time] = timestamp.match(/T(\d{2}:\d{2})/) ?? [];
  if (!time) return /$a/;
  const [hour, minute] = time.split(":");
  return new RegExp(`0?${Number(hour)}:${minute}`, "i");
}

function expectText(element: Element | null, expected: string | RegExp): void {
  expect(element).not.toBeNull();
  const text = element?.textContent ?? "";
  expect(typeof expected === "string" ? text.includes(expected) : expected.test(text)).toBe(true);
}

describe("parking release and availability acceptance", () => {
  it("AC_8_1_AllowsDatesOnlyWithinTheNextThirtyOfficeDays", async () => {
    at("/my-space");
    server.use(getListMyReleasesMockHandler({ releases: [] }), getGetMyProfileMockHandler());
    render(<MySpaceContainer />);

    const user = await makeUser();
    await screen.findByRole("button", { name: dateButtonName(officeDate(1)) });
    const priorDay = screen.queryByRole("button", { name: dateButtonName(officeDate(-1)) });
    expect(priorDay === null || (priorDay as HTMLButtonElement).disabled).toBe(true);
    for (let offset = 1; offset <= 30; offset += 1) {
      const day = await findCalendarDay(user, officeDate(offset));
      expect((day as HTMLButtonElement | null)?.disabled).toBe(false);
    }
    const outside = await calendarDayIfVisible(user, officeDate(31));
    expect(outside === null || (outside as HTMLButtonElement).disabled).toBe(true);
  });

  it("AC_8_2_SendsEverySelectedDateAndDisplaysReturnedDatesAndStatuses", async () => {
    at("/my-space");
    const selectedDates = [officeDate(2), officeDate(3), officeDate(4)];
    const returned = [
      releaseRecord(610, officeDate(10), "Reserved"),
      releaseRecord(611, officeDate(12), "Released"),
      releaseRecord(612, officeDate(14), "Claimed"),
    ];
    const requests: unknown[] = [];
    server.use(
      getListMyReleasesMockHandler({ releases: [] }),
      getGetMyProfileMockHandler(),
      getScheduleReleasesMockHandler(async ({ request }) => {
        requests.push(await request.json());
        return { releases: returned };
      }),
    );
    render(<MySpaceContainer />);

    const user = await makeUser();
    await screen.findByRole("button", { name: dateButtonName(selectedDates[0]!) });
    for (const date of selectedDates) {
      const day = await findCalendarDay(user, date);
      if (day) await user.click(day);
    }
    const submit = screen.getByRole("button", { name: /release 3 selected days/i });
    await user.click(submit);

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toEqual({ dates: selectedDates });
    for (const record of returned) {
      const row = rowForDate(record.date);
      expect(row, `returned release for ${record.date} should be listed`).toBeTruthy();
      if (!row) continue;
      expectText(row, record.status);
      expectText(row, dateTextPattern(record.date));
    }
  });

  it("AC_9_1_ShowsCancellationConfirmationAndReturnedCanceledStatus", async () => {
    at("/my-space");
    const date = officeDate(3);
    const reserved = releaseRecord(620, date, "Reserved");
    const canceled = { ...reserved, status: "Released" as const, lastChangedBy: "Ayesha Malik", lastChangedAt: localTimestamp(date, 10, 5) };
    const responseMessage = `Release for ${shortDate(date)} cancelled.`;
    server.use(
      getListMyReleasesMockHandler({ releases: [reserved] }),
      getGetMyProfileMockHandler(),
      getCancelReleaseMockHandler({ ...getCancelReleaseResponseMock(), message: responseMessage, release: canceled }),
    );
    render(<MySpaceContainer />);

    const user = await makeUser();
    const initialRow = await screen.findByRole("row", { name: dateTextPattern(date) });
    await user.click(within(initialRow).getByRole("button", { name: "Cancel release" }));
    expect(await screen.findByText("Cancel this release?")).toBeTruthy();
    const confirmation = screen.getByRole("dialog");
    await user.click(within(confirmation).getByRole("button", { name: "Cancel release" }));

    expect(await screen.findByText(responseMessage)).toBeTruthy();
    const updatedRow = rowForDate(date);
    expect(updatedRow).toBeTruthy();
    if (updatedRow) expectText(updatedRow, "Released");
  });

  it("AC_9_2_ShowsRefusalAndKeepsClaimedReleaseDisplayed", async () => {
    at("/my-space");
    const date = officeDate(3);
    const claimed = releaseRecord(621, date, "Claimed", "Bilal Ahmed", "Ayesha Malik");
    const refusal = "No space could be claimed. The last free space was taken just now.";
    let cancelCalls = 0;
    server.use(
      getListMyReleasesMockHandler({ releases: [claimed] }),
      getGetMyProfileMockHandler(),
      http.post("*/parking/releases/:releaseId/cancel", async () => {
        cancelCalls += 1;
        return HttpResponse.json({ message: refusal, code: "CONFLICT" }, { status: 409 });
      }),
    );
    render(<MySpaceContainer />);

    const user = await makeUser();
    const row = await screen.findByRole("row", { name: dateTextPattern(date) });
    await user.click(within(row).getByRole("button", { name: "Cancel release" }));
    const dialog = screen.queryByRole("dialog");
    if (dialog) {
      const confirm = within(dialog).queryByRole("button", { name: "Cancel release" });
      if (confirm) await user.click(confirm);
    }

    expect(await screen.findByText(refusal)).toBeTruthy();
    await waitFor(() => expect(cancelCalls).toBe(1));
    const stillClaimed = rowForDate(date);
    expect(stillClaimed).toBeTruthy();
    if (stillClaimed) expectText(stillClaimed, "Claimed");
  });

  it("AC_10_1_DisplaysReturnedDatesAndEachDefinedReleaseStatus", async () => {
    at("/my-space");
    const records = [
      releaseRecord(630, officeDate(2), "Reserved"),
      releaseRecord(631, officeDate(4), "Released"),
      releaseRecord(632, officeDate(6), "Claimed"),
    ];
    server.use(getListMyReleasesMockHandler({ releases: records }), getGetMyProfileMockHandler());
    render(<MySpaceContainer />);

    for (const record of records) {
      const row = await screen.findByRole("row", { name: dateTextPattern(record.date) });
      expect(row, `release date ${record.date} should be shown`).toBeTruthy();
      if (!row) continue;
      expectText(row, dateTextPattern(record.date));
      expectText(row, record.status);
    }
  });

  it("AC_11_1_DisplaysCreatorAndLastChangedMetadataWithTheirTimestamps", async () => {
    at("/my-space");
    const records = [
      releaseRecord(640, officeDate(2), "Reserved", "Creator One", "Editor One", localTimestamp(officeDate(-2), 8, 11), localTimestamp(officeDate(-1), 9, 21)),
      releaseRecord(641, officeDate(3), "Released", "Creator Two", "Editor Two", localTimestamp(officeDate(-3), 10, 13), localTimestamp(officeDate(-2), 11, 22)),
      releaseRecord(642, officeDate(4), "Claimed", "Creator Three", "Editor Three", localTimestamp(officeDate(-4), 12, 14), localTimestamp(officeDate(-3), 13, 23)),
    ];
    server.use(getListMyReleasesMockHandler({ releases: records }), getGetMyProfileMockHandler());
    render(<MySpaceContainer />);

    for (const record of records) {
      const row = await screen.findByRole("row", { name: dateTextPattern(record.date) });
      expect(row, `release ${record.date} should have one history row`).toBeTruthy();
      if (!row) continue;
      expectText(row, record.createdBy);
      expectText(row, record.lastChangedBy);
      expectText(row, dateTextPattern(record.createdAt.slice(0, 10)));
      expectText(row, timestampTimePattern(record.createdAt));
      expectText(row, dateTextPattern(record.lastChangedAt.slice(0, 10)));
      expectText(row, timestampTimePattern(record.lastChangedAt));
    }
  });

  it("AC_12_1_DisplaysAvailabilityCountAndEveryClaimableArea", async () => {
    at("/dashboard");
    const response = dashboard({
      availability: availability({
        count: 7,
        areas: [{ name: "Floor 1", count: 2 }, { name: "Floor 3", count: 3 }, { name: "South Garage", count: 2 }],
        notYetClaimable: [],
      }),
    });
    server.use(getGetParkingDashboardMockHandler(response), getGetMyProfileMockHandler(temporaryProfile()));
    render(<DashboardContainer />);

    expect(await screen.findByText("Parking spots available")).toBeTruthy();
    expect(screen.getByText("7", { exact: true })).toBeTruthy();
    expect(screen.getByText("Floor 1: 2")).toBeTruthy();
    expect(screen.getByText("Floor 3: 3")).toBeTruthy();
    expect(screen.getByText("South Garage: 2")).toBeTruthy();
  });

  it("AC_12_2_KeepsFutureReleaseOutOfClaimableAreasAndShowsItsClaimableTime", async () => {
    at("/dashboard");
    const claimableDate = officeDate(1);
    const response = dashboard({
      availability: availability({
        count: 3,
        areas: [{ name: "Floor 1", count: 1 }, { name: "Floor 3", count: 2 }],
        notYetClaimable: [{ area: "Floor 2", count: 4, claimableAt: localTimestamp(claimableDate, 9, 30) }],
      }),
    });
    server.use(getGetParkingDashboardMockHandler(response), getGetMyProfileMockHandler(temporaryProfile()));
    render(<DashboardContainer />);

    expect(await screen.findByText("3", { exact: true })).toBeTruthy();
    expect(screen.getByText("Floor 1: 1")).toBeTruthy();
    expect(screen.getByText("Floor 3: 2")).toBeTruthy();
    expect(screen.queryByText("Floor 2: 4")).toBeNull();
    const scheduledLine = screen.getByText((_, element) => {
      const text = element?.textContent ?? "";
      return text.includes("Not yet claimable") && text.includes("Floor 2") && text.includes("4") && text.includes("09:30") && text.includes(shortDate(claimableDate));
    });
    expect(scheduledLine).toBeTruthy();
  });

  it("AC_12_3_IncludesAnArrivedReleaseInDisplayedClaimableAvailability", async () => {
    at("/dashboard");
    const date = officeDate(0);
    const claimableAt = new Date(TEST_NOW.getTime() - 60_000).toISOString();
    const response = dashboard({
      releases: [releaseRecord(650, date, "Released", "Ayesha Malik", "Ayesha Malik", localTimestamp(officeDate(-1), 8, 0), claimableAt)],
      availability: availability({ count: 4, areas: [{ name: "Floor 2", count: 4 }], notYetClaimable: [] }),
    });
    server.use(getGetParkingDashboardMockHandler(response), getGetMyProfileMockHandler(temporaryProfile()));
    render(<DashboardContainer />);

    expect(await screen.findByText("4", { exact: true })).toBeTruthy();
    expect(screen.getByText("Floor 2: 4")).toBeTruthy();
    expect(screen.getByText("Parking spots available")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Claim a space" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("AC_12_4_ShowsZeroAvailabilityWithoutAnEnabledClaimAction", async () => {
    at("/free-spaces");
    server.use(
      getGetParkingAvailabilityMockHandler(availability({ count: 0, areas: [], notYetClaimable: [] })),
      getGetMyProfileMockHandler(profileWithPlates(["AWC-917"])),
    );
    render(<FreeSpacesContainer />);

    expect(await screen.findByText("0", { exact: true })).toBeTruthy();
    expect(screen.getByText("No spaces are free right now")).toBeTruthy();
    const claimButtons = screen.queryAllByRole("button", { name: /claim a space/i });
    expect(claimButtons.every((button) => (button as HTMLButtonElement).disabled || button.getAttribute("aria-disabled") === "true")).toBe(true);
  });

  it("AC_13_1_RequiresARegisteredPlateAndOffersNoSpecificStall", async () => {
    at("/free-spaces");
    server.use(
      getGetParkingAvailabilityMockHandler(availability({ count: 3, areas: [{ name: "Floor 3", count: 3 }], notYetClaimable: [] })),
      getGetMyProfileMockHandler(profileWithPlates(["AWC-917", "LEB-554", "XYZ-208"])),
    );
    render(<FreeSpacesContainer />);

    const user = await makeUser();
    await user.click(await screen.findByRole("button", { name: "Claim a space" }));
    expect(await screen.findByText("Choose your car")).toBeTruthy();
    const selector = screen.getByRole("combobox");
    expect(selector.hasAttribute("required") || selector.getAttribute("aria-required") === "true").toBe(true);
    if (!(selector instanceof HTMLSelectElement)) await user.click(selector);
    for (const plate of ["AWC-917", "LEB-554", "XYZ-208"]) {
      expect(screen.getByRole("option", { name: new RegExp(plate) })).toBeTruthy();
    }
    expect(screen.queryByLabelText(/stall|bay number/i)).toBeNull();
    expect(screen.queryByText(/\b(?:stall|bay)\s*(?:number\s*)?#?\d+\b/i)).toBeNull();
  });

  it("AC_13_2_PromptsForAPlateAndSendsNoClaimWithoutSelection", async () => {
    at("/free-spaces");
    const claimRequests: unknown[] = [];
    server.use(
      getGetParkingAvailabilityMockHandler(availability({ count: 2, areas: [{ name: "Floor 1", count: 2 }], notYetClaimable: [] })),
      getGetMyProfileMockHandler(profileWithPlates(["AWC-917", "LEB-554", "XYZ-208"])),
      getClaimParkingSpaceMockHandler(async ({ request }) => {
        claimRequests.push(await request.json());
        return getClaimParkingSpaceResponseMock();
      }),
    );
    render(<FreeSpacesContainer />);

    const user = await makeUser();
    await user.click(await screen.findByRole("button", { name: "Claim a space" }));
    const claimButtons = screen.getAllByRole("button", { name: /claim/i });
    const submit = claimButtons[claimButtons.length - 1]!;
    await user.click(submit);

    expect(await screen.findByText("Choose your car")).toBeTruthy();
    expect(claimRequests).toHaveLength(0);
  });

  it("AC_13_3_SendsSelectedPlateAndDisplaysReturnedClaimDetails", async () => {
    at("/free-spaces");
    const selectedPlate = "LEB-554";
    const returnedDate = officeDate(6);
    const claimRequests: unknown[] = [];
    const claimResponse = {
      ...getClaimParkingSpaceResponseMock(),
      date: returnedDate,
      plate: selectedPlate,
      area: "North Garage",
    };
    server.use(
      getGetParkingAvailabilityMockHandler(availability({ count: 2, areas: [{ name: "Floor 1", count: 2 }], notYetClaimable: [] })),
      getGetMyProfileMockHandler(profileWithPlates(["AWC-917", selectedPlate, "XYZ-208"])),
      getClaimParkingSpaceMockHandler(async ({ request }) => {
        claimRequests.push(await request.json());
        return claimResponse;
      }),
    );
    render(<FreeSpacesContainer />);

    const user = await makeUser();
    await user.click(await screen.findByRole("button", { name: "Claim a space" }));
    const selector = screen.getByRole("combobox");
    if (selector instanceof HTMLSelectElement) {
      await user.selectOptions(selector, selectedPlate);
    } else {
      await user.click(selector);
      await user.click(await screen.findByRole("option", { name: new RegExp(selectedPlate) }));
    }
    const claimButtons = screen.getAllByRole("button", { name: /claim/i });
    await user.click(claimButtons[claimButtons.length - 1]!);

    await waitFor(() => expect(claimRequests).toHaveLength(1));
    expect(claimRequests[0]).toEqual({ date: officeDate(), plate: selectedPlate });
    expect(await screen.findByText("You have a space on North Garage")).toBeTruthy();
    expect(screen.getByText(selectedPlate)).toBeTruthy();
    expectText(screen.getByText(dateTextPattern(returnedDate)), dateTextPattern(returnedDate));
    expect(screen.queryByText(/stall\s*\d+|bay\s*\d+/i)).toBeNull();
  });
});
