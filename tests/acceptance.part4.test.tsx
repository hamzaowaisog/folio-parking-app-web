// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import {
  getFolio3ParkingAPIMock,
  getGetEmployeeResponseMock,
  getGetParkingSettingsResponseMock,
  getListAdministratorsResponseMock,
  getListEmployeesResponseMock,
  getListUnusedParkingResponseMock,
  getRevokeAdministratorAccessResponseMock,
  getUpdateParkingSettingsResponseMock,
  getGetParkingSettingsMockHandler,
  getGetEmployeeMockHandler,
  getListAdministratorsMockHandler,
  getListEmployeesMockHandler,
  getListUnusedParkingMockHandler,
  getRevokeAdministratorAccessMockHandler,
  getUpdateEmployeeMockHandler,
  getUpdateParkingSettingsMockHandler,
} from "@/lib/api/client.msw";
import { UnusedSpacesContainer } from "@/components/screens/s-10/container";
import { EmployeesContainer } from "@/components/screens/s-11/container";
import { SettingsContainer } from "@/components/screens/s-12/container";
import { AdminsContainer } from "@/components/screens/s-13/container";
import { at } from "./support/screen";

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: () => "test-access-token",
  storeAccessToken: vi.fn(),
  clearAccessToken: vi.fn(),
}));

const server = setupServer(...getFolio3ParkingAPIMock());
const requests: Array<{ method: string; url: string }> = [];
server.events.on("request:start", ({ request }) => {
  requests.push({ method: request.method, url: request.url });
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  server.resetHandlers();
  requests.length = 0;
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("parking administration acceptance", () => {
  it("AC_20_1_IdentifiesEachUnusedParkingRecordAndDisplaysItsFields", async () => {
    const returned = getListUnusedParkingResponseMock();
    const records = [
      {
        ...returned.records[0],
        id: 7101,
        vehicle: "Red Suzuki Swift BRD-451",
        date: "2025-10-11",
      },
      {
        ...returned.records[1],
        id: 7102,
        vehicle: "White Honda City AWC-672",
        date: "2025-10-12",
      },
      {
        id: 7003,
        category: "Unused Dedicated Parking" as const,
        employee: "Samira Noor",
        vehicle: "Blue Honda Civic SAM-308",
        date: "2025-10-14",
      },
    ];
    server.use(getListUnusedParkingMockHandler({ records, total: records.length }));
    at("/admin/unused-spaces");
    render(<UnusedSpacesContainer />);

    const expected = [
      { employee: "Ayesha Malik", category: "Unused Dedicated Parking", vehicle: "Red Suzuki Swift BRD-451", date: "2025-10-11" },
      { employee: "Bilal Ahmed", category: "Unused Temporary Parking", vehicle: "White Honda City AWC-672", date: "2025-10-12" },
      { employee: "Samira Noor", category: "Unused Dedicated Parking", vehicle: "Blue Honda Civic SAM-308", date: "2025-10-14" },
    ];

    for (const item of expected) {
      const row = await screen.findByRole("row", { name: new RegExp(item.employee) });
      expect(within(row).getByText(item.category)).toBeTruthy();
      expect(within(row).getByText(item.employee)).toBeTruthy();
      expect(within(row).getByText(item.vehicle)).toBeTruthy();
      expect(within(row).getByText(item.date)).toBeTruthy();
    }
  });

  it("AC_21_1_DisplaysEmployeeAssignmentsAndEmployeeVehicleAssignmentForms", async () => {
    const returned = getListEmployeesResponseMock();
    const first = returned.employees[0];
    const employees = [
      {
        ...first,
        id: 2042,
        employeeId: "EMP-2042",
        name: "Bilal Ahmed",
        email: "bilal.ahmed@example.com",
        department: "Operations and Safety",
        role: "Site Manager",
        parkingStatus: "Temporary" as const,
        assignedFloor: null,
        vehicles: [{ id: 2, plate: "BIL-204", make: "Toyota", model: "Corolla Cross", color: "Grey" }],
      },
      {
        ...first,
        id: 2043,
        employeeId: "EMP-2043",
        name: "Samira Noor",
        email: "samira.noor@example.com",
        department: "Finance",
        role: "Accountant",
        parkingStatus: "Dedicated" as const,
        assignedFloor: "West Deck",
        vehicles: [{ id: 3, plate: "SAM-308", make: "Honda", model: "Civic", color: "Blue" }],
      },
      {
        ...first,
        id: 2044,
        employeeId: "EMP-2044",
        name: "Ayesha Malik",
        email: "ayesha.malik@example.com",
        department: "Product Design",
        role: "Design Lead",
        assignedFloor: "East Deck",
        vehicles: [{ id: 4, plate: "AYM-144", make: "Suzuki", model: "Swift", color: "Red" }],
      },
    ];
    server.use(getListEmployeesMockHandler({ employees, total: employees.length }));
    at("/admin/employees");
    render(<EmployeesContainer />);

    const user = userEvent.setup();
    for (const employee of employees) {
      const row = await screen.findByRole("row", { name: new RegExp(employee.name) });
      expect(within(row).getByText(employee.name)).toBeTruthy();
      expect(within(row).getByText(employee.department)).toBeTruthy();
      expect(within(row).getByText(employee.role)).toBeTruthy();
      expect(within(row).getByText(employee.parkingStatus)).toBeTruthy();
      for (const vehicle of employee.vehicles) {
        expect(within(row).getByText(vehicle.plate)).toBeTruthy();
      }
      if (employee.assignedFloor) expect(within(row).getByText(employee.assignedFloor)).toBeTruthy();
    }

    await user.click(screen.getByRole("button", { name: "Add employee" }));
    const dialog = await screen.findByRole("dialog");
    for (const label of ["Employee ID", "Name", "Email", "Department", "Role", "Parking status", "Assigned floor", "Plate", "Make", "Model", "Color"]) {
      expect(within(dialog).queryByLabelText(new RegExp(`^${label}$`, "i"))).not.toBeNull();
    }
  });

  it("AC_21_2_ShowsTheReturnedUpdatedEmployeeAfterAChangeIsAccepted", async () => {
    const returned = getListEmployeesResponseMock();
    const original = returned.employees[0];
    const employees = [original];
    const updated = { ...original, role: "Engineering Lead" };
    let currentEmployees = employees;
    server.use(
      getListEmployeesMockHandler(() => ({ employees: currentEmployees, total: currentEmployees.length })),
      getUpdateEmployeeMockHandler(() => {
        currentEmployees = [updated];
        return { employee: updated };
      }),
    );
    at("/admin/employees");
    render(<EmployeesContainer />);

    const row = await screen.findByRole("row", { name: /Ayesha Malik/ });
    const user = userEvent.setup();
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const roleField = await screen.findByLabelText(/^Role$/i);
    await user.clear(roleField);
    await user.type(roleField, "Requested role");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Changes saved for Ayesha Malik.")).toBeTruthy();
    const updatedRow = await screen.findByRole("row", { name: /Ayesha Malik/ });
    expect(within(updatedRow).getByText("Engineering Lead")).toBeTruthy();
    expect(screen.queryByText("Requested role")).toBeNull();
  });

  it("AC_21_3_KeepsReturnedDatedClaimsAndReleasesUnchangedAfterAnEmployeeChange", async () => {
    const listed = getListEmployeesResponseMock().employees[0];
    const detailed = {
      ...getGetEmployeeResponseMock().employee,
      datedActivity: [
        { date: "2025-10-13", kind: "Claim" as const, status: "Claimed" as const },
        { date: "2025-10-17", kind: "Release" as const, status: "Released" as const },
        { date: "2025-10-20", kind: "Release" as const, status: "Reserved" as const },
      ],
    };
    const changed = { ...detailed, role: "Engineering Lead" };
    server.use(
      getListEmployeesMockHandler({ employees: [listed], total: 1 }),
      getGetEmployeeMockHandler({ employee: detailed }),
      getUpdateEmployeeMockHandler({ employee: changed }),
    );
    at("/admin/employees");
    render(<EmployeesContainer />);

    const row = await screen.findByRole("row", { name: /Ayesha Malik/ });
    const user = userEvent.setup();
    await user.click(within(row).getByRole("button", { name: "Edit" }));
    const roleField = await screen.findByLabelText(/^Role$/i);
    await user.clear(roleField);
    await user.type(roleField, "Requested role");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Changes saved for Ayesha Malik.")).toBeTruthy();
    expect(await screen.findByText("Engineering Lead")).toBeTruthy();
    expect(await screen.findByText("Claimed")).toBeTruthy();
    expect(await screen.findByText("Released")).toBeTruthy();
    expect(screen.getByText("2025-10-13")).toBeTruthy();
    expect(screen.getByText("2025-10-17")).toBeTruthy();
    expect(screen.getByText("2025-10-20")).toBeTruthy();
  });

  it("AC_22_1_DisplaysTheReturnedReleaseTimeAreasAndReportRecipients", async () => {
    const settings = {
      ...getGetParkingSettingsResponseMock(),
      dailyReleaseTime: "07:45",
      areas: [{ name: "North Deck" }, { name: "South Deck" }, { name: "Visitor Bay" }],
      reportRecipients: ["ops-reports@example.com", "facilities@example.com", "audit@example.com"],
    };
    server.use(getGetParkingSettingsMockHandler(settings));
    at("/admin/settings");
    render(<SettingsContainer />);

    expect(await screen.findByDisplayValue(settings.dailyReleaseTime)).toBeTruthy();
    for (const area of settings.areas) expect(screen.getByDisplayValue(area.name)).toBeTruthy();
    for (const recipient of settings.reportRecipients) expect(screen.getByDisplayValue(recipient)).toBeTruthy();
  });

  it("AC_22_2_DisplaysTheConfigurationReturnedAfterAnAcceptedChange", async () => {
    const initial = getGetParkingSettingsResponseMock();
    const returned = getUpdateParkingSettingsResponseMock();
    server.use(getGetParkingSettingsMockHandler(initial), getUpdateParkingSettingsMockHandler(returned));
    at("/admin/settings");
    render(<SettingsContainer />);

    const releaseTime = await screen.findByLabelText(/daily release time/i);
    const user = userEvent.setup();
    await user.clear(releaseTime);
    await user.type(releaseTime, "09:30");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Settings saved.")).toBeTruthy();
    expect(screen.getByDisplayValue(returned.dailyReleaseTime)).toBeTruthy();
    expect(screen.queryByDisplayValue("09:30")).toBeNull();
  });

  it("AC_23_1_DisplaysTheReturnedAdministratorListAndGrantAndRevokeControls", async () => {
    const returned = getListAdministratorsResponseMock();
    const administrators = [
      { ...returned.administrators[0], id: 2107, email: "mariam.farooq@example.com" },
      { id: 2108, name: "Daniyal Sheikh", email: "daniyal.sheikh@example.com", accessStatus: "active" as const },
      { id: 2109, name: "Samira Noor", email: "samira.noor@example.com", accessStatus: "active" as const },
    ];
    server.use(getListAdministratorsMockHandler({ administrators, total: administrators.length }));
    at("/admin/admins");
    render(<AdminsContainer />);

    for (const administrator of administrators) {
      expect(await screen.findByText(administrator.name)).toBeTruthy();
      expect(screen.getByText(administrator.email)).toBeTruthy();
      expect(screen.getByText(administrator.accessStatus)).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Give access" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Remove access" }).length).toBeGreaterThan(0);
  });

  it("AC_23_2_DisplaysTheReturnedAccessStatusAfterAdministratorAccessIsRevoked", async () => {
    const administrators = getListAdministratorsResponseMock();
    const result = getRevokeAdministratorAccessResponseMock();
    server.use(
      getListAdministratorsMockHandler(administrators),
      getRevokeAdministratorAccessMockHandler(result),
    );
    at("/admin/admins");
    render(<AdminsContainer />);

    expect(await screen.findByText("Mariam Farooq")).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Remove access" }));
    expect(await screen.findByText("Remove admin access?")).toBeTruthy();
    const confirmation = await screen.findByRole("alertdialog");
    await user.click(within(confirmation).getByRole("button", { name: "Remove access" }));

    expect(await screen.findByText("Access removed for Mariam Farooq.")).toBeTruthy();
  });

  it("AC_23_3_ShowsAccessRefusedAndNoAdministratorControlsForANonAdministrator", async () => {
    server.use(
      http.get("*/admin/admins", () => HttpResponse.json(
        { message: "You do not have access to this page.", code: "FORBIDDEN" },
        { status: 403 },
      )),
    );
    at("/admin/admins");
    render(<AdminsContainer />);

    expect(await screen.findByRole("heading", { name: "Admins" })).toBeTruthy();
    expect(await screen.findByText("You don't have access to this page. Ask a parking administrator.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Give access" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove access" })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    for (const administrator of getListAdministratorsResponseMock().administrators) {
      expect(screen.queryByText(administrator.name)).toBeNull();
      expect(screen.queryByText(administrator.email)).toBeNull();
    }
  });

  it("AC_24_1_ShowsUnusedAllocationWithoutWarningPenaltyOrSuspensionActionsOrRequests", async () => {
    const allocation = {
      ...getListUnusedParkingResponseMock().records[0],
      id: 7104,
      category: "Unused Temporary Parking" as const,
      employee: "Rashid Iqbal",
      vehicle: "Silver Kia Sportage RAI-811",
      date: "2025-10-16",
    };
    server.use(getListUnusedParkingMockHandler({ records: [allocation], total: 1 }));
    at("/admin/unused-spaces");
    render(<UnusedSpacesContainer />);

    const row = await screen.findByRole("row", { name: /Rashid Iqbal/ });
    expect(within(row).getByText(allocation.category)).toBeTruthy();
    expect(within(row).getByText(allocation.vehicle)).toBeTruthy();
    expect(within(row).getByText(allocation.date)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /warn|warning|suspend|penalt/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /warn|warning|suspend|penalt/i })).toBeNull();
    expect(requests.every(({ method, url }) => method === "GET" && !/warn|suspend|penalt/i.test(url))).toBe(true);
  });
});
