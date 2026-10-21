// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { SignInContainer } from "@/components/screens/s-1/container";
import { CreateAnAccountContainer } from "@/components/screens/s-2/container";
import { DashboardContainer } from "@/components/screens/s-3/container";
import { ProfileContainer } from "@/components/screens/s-6/container";
import {
  getAddMyVehicleResponseMock,
  getAddMyVehicleMockHandler,
  getFolio3ParkingAPIMock,
  getGetMyProfileMockHandler,
  getGetMyProfileResponseMock,
  getGetParkingDashboardMockHandler,
  getGetParkingDashboardResponseMock,
  getLoginMockHandler,
  getLoginResponseMock,
  getRegisterAccountMockHandler,
  getRegisterAccountResponseMock,
  getReleaseTodaysParkingMockHandler,
  getReleaseTodaysParkingResponseMock,
  getRetryMyProfileFieldsMockHandler,
} from "@/lib/api/client.msw";
import { at, nav, TEST_NOW } from "./support/screen";

const sessionState = vi.hoisted(() => ({ accessToken: null as string | null }));

vi.mock("@/lib/auth/session", () => ({
  getAccessToken: () => sessionState.accessToken,
  storeAccessToken: (token: string) => { sessionState.accessToken = token; },
  clearAccessToken: () => { sessionState.accessToken = null; },
}));

const server = setupServer(...getFolio3ParkingAPIMock());
const today = () => TEST_NOW.toISOString().slice(0, 10);

function dashboardFor(
  parkingStatus: "dedicated" | "temporary",
  releases = getGetParkingDashboardResponseMock().releases,
  unavailableFields: string[] = [],
) {
  const example = getGetParkingDashboardResponseMock();
  return {
    ...example,
    employee: { ...example.employee, parkingStatus },
    officeDate: today(),
    availability: { ...example.availability, date: today() },
    releases,
    unavailableFields,
  };
}

const responseConflict = {
  message: "No space could be claimed. The last free space was taken just now.",
  code: "CONFLICT",
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  sessionState.accessToken = null;
  at("/");
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("account access", () => {
  it("AC_1_1_SendsEnteredAccountDetailsAndShowsConfirmation", async () => {
    let submitted: unknown;
    server.use(getRegisterAccountMockHandler(async ({ request }) => {
      submitted = await request.json();
      return getRegisterAccountResponseMock();
    }));

    const user = userEvent.setup();
    render(<CreateAnAccountContainer />);
    await user.type(screen.getByLabelText("Full name"), "Nadia Farooq");
    await user.type(screen.getByLabelText("Work email"), "nadia.farooq@folio3.com");
    await user.type(screen.getByLabelText("Password"), "SecureParking2026");
    await user.click(screen.getByRole("button", { name: "Create my account" }));

    expect(await screen.findByText("Your account is ready.")).toBeTruthy();
    expect(screen.getByText("You can sign in now.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
    expect(submitted).toEqual({
      name: "Nadia Farooq",
      email: "nadia.farooq@folio3.com",
      password: "SecureParking2026",
    });
  });

  it("AC_1_2_ShowsReturnedIneligibleAccountRefusalWithoutSigningIn", async () => {
    const refusal = "This email isn't on the Folio3 staff list, so we couldn't create an account.";
    server.use(http.post("*/auth/register", () => HttpResponse.json({ message: refusal, code: "CONFLICT" }, { status: 409 })));

    const user = userEvent.setup();
    render(<CreateAnAccountContainer />);
    const name = screen.getByLabelText("Full name") as HTMLInputElement;
    const email = screen.getByLabelText("Work email") as HTMLInputElement;
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    await user.type(name, "Nadia Farooq");
    await user.type(email, "nadia.farooq@outside.example");
    await user.type(password, "SecureParking2026");
    await user.click(screen.getByRole("button", { name: "Create my account" }));

    expect(await screen.findByText(refusal)).toBeTruthy();
    expect(name.value).toBe("Nadia Farooq");
    expect(email.value).toBe("nadia.farooq@outside.example");
    expect(password.value).toBe("SecureParking2026");
    expect(nav.went).not.toContain("/dashboard");
    expect(screen.queryByRole("heading", { name: "Dashboard" })).toBeNull();
  });

  it("AC_2_1_OpensDashboardForRecognizedEmployee", async () => {
    let submitted: unknown;
    server.use(getLoginMockHandler(async ({ request }) => {
      submitted = await request.json();
      return getLoginResponseMock();
    }));

    const user = userEvent.setup();
    render(<SignInContainer />);
    await user.type(screen.getByLabelText("Email"), "ayesha.malik@folio3.com");
    await user.type(screen.getByLabelText("Password"), "Parking2025!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(nav.went).toContain("/dashboard"));
    expect(sessionState.accessToken).toBe(getLoginResponseMock().accessToken);
    expect(submitted).toEqual({ email: "ayesha.malik@folio3.com", password: "Parking2025!" });
  });

  it("AC_2_2_ShowsAuthenticationAndAccessRefusalsWithoutEmployeeData", async () => {
    let refusalStatus: 401 | 403 = 401;
    server.use(http.post("*/auth/login", () => {
      if (refusalStatus === 401) {
        return HttpResponse.json({ message: "Sign in to continue.", code: "UNAUTHORIZED" }, { status: 401 });
      }
      return HttpResponse.json({ message: "You do not have access to this page.", code: "FORBIDDEN" }, { status: 403 });
    }));

    const user = userEvent.setup();
    render(<SignInContainer />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");
    await user.type(email, "unknown@folio3.com");
    await user.type(password, "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("That email and password don't match. Try again.")).toBeTruthy();
    expect(screen.queryByText("Ayesha Malik")).toBeNull();
    expect(nav.went).not.toContain("/dashboard");

    refusalStatus = 403;
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("This account can't use Folio3 Parking yet.")).toBeTruthy();
    expect(screen.queryByText("Ayesha Malik")).toBeNull();
    expect(nav.went).not.toContain("/dashboard");
  });
});

describe("protected employee pages", () => {
  it("AC_3_1_RedirectsUnauthenticatedVisitorBeforeEmployeeDataLoads", async () => {
    let dashboardRequests = 0;
    let profileRequests = 0;
    server.use(
      getGetParkingDashboardMockHandler(() => {
        dashboardRequests += 1;
        return getGetParkingDashboardResponseMock();
      }),
      getGetMyProfileMockHandler(() => {
        profileRequests += 1;
        return getGetMyProfileResponseMock();
      }),
    );

    at("/dashboard");
    render(<DashboardContainer />);

    await waitFor(() => {
      expect(nav.went.includes("/sign-in") || screen.queryByRole("heading", { name: "Sign in" }) !== null).toBe(true);
    });
    expect(screen.queryByText("Bilal Ahmed")).toBeNull();
    expect(screen.queryByText("Ayesha Malik")).toBeNull();
    expect(dashboardRequests).toBe(0);
    expect(profileRequests).toBe(0);
  });

  it("AC_3_2_SignsOutAndClearsEmployeeInformation", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(getGetParkingDashboardMockHandler(() => dashboardFor("temporary")));

    const user = userEvent.setup();
    render(<DashboardContainer />);
    expect(await screen.findByText("Bilal Ahmed")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /sign out|log out/i }));

    await waitFor(() => expect(nav.went).toContain("/sign-in"));
    expect(sessionState.accessToken).toBeNull();
    expect(screen.queryByText("Bilal Ahmed")).toBeNull();
    expect(screen.queryByText("bilal.ahmed@folio3.com")).toBeNull();
  });
});

describe("employee profile and vehicle", () => {
  it("AC_4_1_DisplaysReturnedEmployeeParkingAndVehicleDetails", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(getGetMyProfileMockHandler(() => getGetMyProfileResponseMock()));

    render(<ProfileContainer />);

    for (const value of [
      "EMP-1042",
      "Ayesha Malik",
      "ayesha.malik@folio3.com",
      "Engineering",
      "Senior Engineer",
      "Dedicated",
      "Floor 2",
      "BRD-139",
      "Suzuki",
      "Cultus",
      "Red",
    ]) {
      expect(await screen.findByText(value)).toBeTruthy();
    }
  });

  it("AC_5_1_IdentifiesMissingProfileFieldAndDisablesOnlyDependentControl", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(getGetParkingDashboardMockHandler(() => dashboardFor("dedicated", [], ["assignedFloor"])));

    render(<DashboardContainer />);

    expect(await screen.findByText("We couldn't load your assigned floor.")).toBeTruthy();
    expect(screen.getByText("Ayesha Malik")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Release today's parking" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Retry" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Add your vehicle" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Parking spots available")).toBeTruthy();
  });

  it("AC_5_2_RetriesUnavailableDirectoryFieldAndDisplaysReturnedValue", async () => {
    sessionState.accessToken = "employee-session-token";
    const example = getGetMyProfileResponseMock();
    let retryBody: unknown;
    server.use(
      getGetMyProfileMockHandler(() => ({
        ...example,
        employee: { ...example.employee, department: null },
        unavailableFields: ["department"],
        retryableFields: ["department"],
      })),
      getRetryMyProfileFieldsMockHandler(async ({ request }) => {
        retryBody = await request.json();
        return {
          ...example,
          employee: { ...example.employee, department: "Operations" },
          unavailableFields: [],
          retryableFields: [],
        };
      }),
    );

    const user = userEvent.setup();
    render(<ProfileContainer />);
    expect(await screen.findByText("Department and Assigned floor aren't available right now.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Operations")).toBeTruthy();
    expect(retryBody).toEqual({ fields: ["department"] });
  });

  it("AC_6_1_PromptsEmployeeWithoutPlateBeforeClaimingTemporaryParking", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(getGetMyProfileMockHandler(() => ({ ...getGetMyProfileResponseMock(), vehicles: [] })));

    render(<ProfileContainer />);

    expect(await screen.findByText("You need one plate before you can claim a space.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a vehicle" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Claim a space" })).toBeNull();
  });

  it("AC_6_2_ShowsRequiredPlateAndOptionalVehicleFields", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(getGetMyProfileMockHandler(() => ({ ...getGetMyProfileResponseMock(), vehicles: [] })));

    const user = userEvent.setup();
    render(<ProfileContainer />);
    await user.click(screen.getByRole("button", { name: "Add a vehicle" }));

    const plate = screen.getByLabelText(/license plate/i) as HTMLInputElement;
    const make = screen.getByLabelText(/make/i) as HTMLInputElement;
    const model = screen.getByLabelText(/model/i) as HTMLInputElement;
    const color = screen.getByLabelText(/color/i) as HTMLInputElement;
    expect(plate.required).toBe(true);
    expect(make.required).toBe(false);
    expect(model.required).toBe(false);
    expect(color.required).toBe(false);
  });

  it("AC_6_3_DisplaysVehicleFieldsReturnedAfterSaving", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(
      getGetMyProfileMockHandler(() => ({ ...getGetMyProfileResponseMock(), vehicles: [] })),
      getAddMyVehicleMockHandler(() => getAddMyVehicleResponseMock()),
    );

    const user = userEvent.setup();
    render(<ProfileContainer />);
    await user.click(screen.getByRole("button", { name: "Add a vehicle" }));
    await user.type(screen.getByLabelText(/license plate/i), "ZXQ-482");
    await user.type(screen.getByLabelText(/make/i), "Acme");
    await user.type(screen.getByLabelText(/model/i), "Roadster");
    await user.type(screen.getByLabelText(/color/i), "Purple");
    await user.click(screen.getByRole("button", { name: /save|add vehicle/i }));

    expect(await screen.findByText("Red Suzuki Cultus (BRD-139) added.")).toBeTruthy();
    expect(screen.getByText("BRD-139")).toBeTruthy();
    expect(screen.getByText("Suzuki")).toBeTruthy();
    expect(screen.getByText("Cultus")).toBeTruthy();
    expect(screen.getByText("Red")).toBeTruthy();
  });

  it("AC_4_2_DisplaysTemporaryParkingStatusAndClaimControls", async () => {
    sessionState.accessToken = "employee-session-token";
    server.use(getGetParkingDashboardMockHandler(() => dashboardFor("temporary")));

    render(<DashboardContainer />);

    expect(await screen.findByText("Bilal Ahmed")).toBeTruthy();
    expect(screen.getByText(/temporary/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Claim a space" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add your vehicle" })).toBeTruthy();
  });
});

describe("dedicated parking release", () => {
  it("AC_7_1_SendsSingleReleaseRequestAndShowsReleasedStatus", async () => {
    sessionState.accessToken = "employee-session-token";
    let submitted: unknown;
    let calls = 0;
    server.use(
      getGetParkingDashboardMockHandler(() => dashboardFor("dedicated")),
      getReleaseTodaysParkingMockHandler(async ({ request }) => {
        calls += 1;
        submitted = await request.json();
        return { ...getReleaseTodaysParkingResponseMock(), date: today() };
      }),
    );

    const user = userEvent.setup();
    render(<DashboardContainer />);
    await user.click(screen.getByRole("button", { name: "Release today's parking" }));

    expect(await screen.findByText("Your space is free for colleagues today")).toBeTruthy();
    expect(screen.getByText("Released")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Release today's parking" })).toBeNull();
    expect(submitted).toEqual({ officeDate: today() });
    expect(calls).toBe(1);
  });

  it("AC_7_2_ShowsClaimedStatusWithoutAReleaseOrReclaimControl", async () => {
    sessionState.accessToken = "employee-session-token";
    const claimed = { ...getReleaseTodaysParkingResponseMock(), status: "Claimed" as const, createdBy: "Another employee" };
    server.use(getGetParkingDashboardMockHandler(() => dashboardFor("dedicated", [claimed])));

    render(<DashboardContainer />);

    expect(await screen.findByText("Claimed")).toBeTruthy();
    expect(screen.getByText("Another employee is parked in your space today")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Release today's parking" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Claim a space" })).toBeNull();
  });

  it("AC_7_3_ShowsRepeatedReleaseRefusalWithoutSuccessConfirmation", async () => {
    sessionState.accessToken = "employee-session-token";
    let calls = 0;
    server.use(
      getGetParkingDashboardMockHandler(() => dashboardFor("dedicated")),
      http.post("*/parking/releases/today", () => {
        calls += 1;
        return HttpResponse.json(responseConflict, { status: 409 });
      }),
    );

    const user = userEvent.setup();
    render(<DashboardContainer />);
    await user.click(screen.getByRole("button", { name: "Release today's parking" }));

    expect(await screen.findByText(responseConflict.message)).toBeTruthy();
    expect(screen.queryByText("Your space is free for colleagues today")).toBeNull();
    expect(screen.getByRole("button", { name: "Release today's parking" })).toBeTruthy();
    expect(calls).toBe(1);
  });
});
