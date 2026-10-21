"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Building2, CarFront, LogOut, RefreshCw } from "lucide-react";
import { addMyVehicle, claimParkingSpace, getMyProfile, getParkingAvailability, getParkingDashboard, releaseTodaysParking, retryMyProfileFields } from "@/lib/api/client";
import type { Dashboard, EmployeeProfile, ParkingClaim, ReleaseRecord, Vehicle } from "@/lib/api/client.schemas";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNav } from "@/lib/nav";

const today = "2025-10-14";
const refusedClaim = "No space could be claimed. The last free space was taken just now.";

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function sampleDashboard(fixture?: string): Dashboard {
  const claim = inFixture(fixture, "after-a-claim") || inFixture(fixture, "claim-accepted");
  const released = inFixture(fixture, "holder-space-released");
  const claimedByOther = inFixture(fixture, "holder-space-claimed");
  const dedicated = released || claimedByOther || inFixture(fixture, "release-refused") || inFixture(fixture, "some-profile-details-unavailable");
  const status: ReleaseRecord["status"] = released ? "Released" : "Claimed";
  return {
    employee: { id: 1042, name: "Bilal Ahmed", email: "bilal.ahmed@folio3.com", parkingStatus: dedicated ? "dedicated" : "temporary" },
    officeDate: today,
    releases: released || claimedByOther ? [{
      id: 501,
      date: today,
      status,
      area: "Floor 3",
      createdBy: claimedByOther ? "Another employee" : "Bilal Ahmed",
      createdAt: `${today}T08:01:00+05:00`,
      lastChangedBy: claimedByOther ? "Another employee" : "Bilal Ahmed",
      lastChangedAt: `${today}T08:01:00+05:00`,
      claimableAt: `${today}T08:00:00+05:00`,
    }] : [],
    availability: {
      date: today,
      count: 5,
      areas: [{ name: "Floor 1", count: 2 }, { name: "Floor 3", count: 3 }],
      notYetClaimable: [{ area: "Floor 2", count: 2, claimableAt: "2025-10-15T09:30:00+05:00" }],
    },
    currentClaim: claim ? {
      id: 801,
      date: today,
      plate: "AWC-917",
      area: "Floor 3",
      status: "Claimed",
      createdBy: "Bilal Ahmed",
      createdAt: `${today}T08:03:00+05:00`,
      lastChangedBy: "Bilal Ahmed",
      lastChangedAt: `${today}T08:03:00+05:00`,
    } : null,
    notice: { message: "Parking is free today. 5 spots on Floors 1 and 3.", email: "bilal.ahmed@folio3.com" },
    unavailableFields: inFixture(fixture, "some-profile-details-unavailable") ? ["assignedFloor"] : [],
  };
}

function sampleProfile(): EmployeeProfile {
  return {
    employee: { id: 1042, employeeId: "EMP-1042", name: "Bilal Ahmed", email: "bilal.ahmed@folio3.com", department: "Engineering", role: "Employee" },
    parking: { status: "temporary", assignedFloor: null },
    vehicles: [
      { id: 1, plate: "AWC-917", make: "Toyota", model: "Corolla", color: "Grey" },
      { id: 2, plate: "LEB-554", make: "Suzuki", model: "Alto", color: "Blue" },
    ],
    unavailableFields: [],
    retryableFields: [],
  };
}

function formatDashboardDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(value);
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" }).format(value);
  const month = new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(value);
  return `${weekday} ${day} ${month}`;
}

function formatShortDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(value);
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" }).format(value);
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(value);
  return `${weekday} ${day} ${month}`;
}

function formatClaimableAt(timestamp: string): string {
  const value = new Date(timestamp);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(value);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "Asia/Karachi" }).format(value);
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Asia/Karachi" }).format(value);
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Karachi" }).format(value);
  const date = `${weekday} ${day} ${month}`;
  return `${time} on ${date}`;
}

function fieldLabel(field: string): string {
  return field === "assignedFloor" ? "assigned floor" : field.replace(/([A-Z])/g, " $1").toLowerCase();
}

function GarageIllustration() {
  return (
    <div role="img" aria-label="Parking garage level with empty painted spaces" className="relative flex min-h-52 items-end overflow-hidden bg-secondary p-5 sm:min-h-60">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-muted" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1/2 items-center justify-around border-b border-border px-6">
        <div className="h-8 w-1/4 border-x border-t border-border-strong" />
        <div className="h-8 w-1/4 border-x border-t border-border-strong" />
        <div className="h-8 w-1/4 border-x border-t border-border-strong" />
      </div>
      <div aria-hidden="true" className="relative z-10 grid w-full grid-cols-3 gap-3">
        {[0, 1, 2].map((bay) => <div key={bay} className="flex h-20 items-center justify-center rounded-t-md border-x-2 border-t-2 border-dashed border-primary/40 bg-card/50 sm:h-24"><span className="text-xs font-medium text-muted-foreground">PARKING</span></div>)}
      </div>
    </div>
  );
}

function VehicleIllustration({ vehicle }: { vehicle?: Vehicle }) {
  return (
    <div role="img" aria-label={`${vehicle?.color ?? "Grey"} ${vehicle?.make ?? "Toyota"} ${vehicle?.model ?? "Corolla"}`} className="flex h-44 items-center justify-center bg-muted sm:h-48">
      <div aria-hidden="true" className="flex h-32 w-4/5 items-center justify-center rounded-3xl border border-border-strong bg-card shadow-sm">
        <CarFront className="size-20 stroke-1 text-secondary-foreground" />
      </div>
    </div>
  );
}

function GarageSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <Card className="overflow-hidden lg:col-span-8">
        <Skeleton className="h-52 w-full rounded-none sm:h-60" />
        <div className="grid gap-4 p-6"><Skeleton className="h-6 w-28" /><Skeleton className="h-12 w-40" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-12 w-full" /></div>
      </Card>
      <div className="grid content-start gap-4 lg:col-span-4"><Skeleton className="h-28 w-full" /><Card className="overflow-hidden"><Skeleton className="h-44 w-full rounded-none" /><div className="grid gap-3 p-6"><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-40" /></div></Card></div>
    </div>
  );
}

export function DashboardContainer({ fixture }: { fixture?: string }) {
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;
  const plateId = useId();
  const addPlateId = useId();
  const addMakeId = useId();
  const addModelId = useId();
  const addColorId = useId();
  const isFixture = fixture !== undefined;
  const fixtureError = inFixture(fixture, "error");
  const fixtureLoading = inFixture(fixture, "loading");
  const [dashboard, setDashboard] = useState<Dashboard | null>(() => isFixture ? sampleDashboard(fixture) : null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(() => isFixture ? sampleProfile() : null);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? "We couldn't load your parking. Try again." : "");
  const [releaseMessage, setReleaseMessage] = useState(inFixture(fixture, "release-refused") ? "Today's parking could not be released. Try again." : "");
  const [claimMessage, setClaimMessage] = useState(inFixture(fixture, "claim-refused") ? refusedClaim : "");
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(inFixture(fixture, "sheet-choose-your-car"));
  const [dialogOpen, setDialogOpen] = useState(inFixture(fixture, "dialog-add-your-vehicle"));
  const [selectedPlate, setSelectedPlate] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleMessage, setVehicleMessage] = useState("");
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (isFixture) return;
    const token = getAccessToken();
    if (!token) {
      navigate.current("/sign-in");
      setLoading(false);
      return;
    }
    const options = { headers: { Authorization: `Bearer ${token}` } };
    let active = true;
    setLoading(true);
    Promise.all([getParkingDashboard(options), getMyProfile(options)]).then(([dashboardResult, profileResult]) => {
      if (!active) return;
      if (dashboardResult.status !== 200 || profileResult.status !== 200) {
        setPageError("We couldn't load your parking. Try again.");
        return;
      }
      setDashboard(dashboardResult.data);
      setProfile(profileResult.data);
    }).catch(() => {
      if (active) setPageError("We couldn't load your parking. Try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isFixture]);

  const unavailableFields = [...new Set([...(dashboard?.unavailableFields ?? []), ...(profile?.unavailableFields ?? [])])];
  const floorUnavailable = unavailableFields.includes("assignedFloor");
  const employee = dashboard?.employee;
  const displayEmployee = unavailableFields.length > 0 && profile ? profile.employee : employee;
  const vehicles = profile?.vehicles ?? [];
  const todayRelease = dashboard?.releases.find((release) => release.date === dashboard.officeDate);
  const isDedicated = employee?.parkingStatus === "dedicated";
  const currentClaim = dashboard?.currentClaim;
  const hasVehicle = vehicles.length > 0;
  const canClaim = !isDedicated && !currentClaim && (dashboard?.availability.count ?? 0) > 0 && hasVehicle;
  const displayedError = pageError;

  async function retry() {
    if (isFixture || retrying) {
      if (isFixture) setPageError("");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      navigate.current("/sign-in");
      setLoading(false);
      return;
    }
    const fields = profile?.retryableFields.length ? profile.retryableFields : unavailableFields;
    if (fields.length) {
      setRetrying(true);
      try {
        const result = await retryMyProfileFields({ fields }, { headers: { Authorization: `Bearer ${token}` } });
        if (result.status === 200) {
          setProfile(result.data);
          if (fields.includes("assignedFloor") && result.data.parking.assignedFloor) {
            setDashboard((current) => current ? { ...current, unavailableFields: current.unavailableFields.filter((field) => field !== "assignedFloor") } : current);
          }
        }
        else setPageError(result.data.message || "We couldn't load your assigned floor.");
      } catch {
        setPageError("We couldn't load your assigned floor.");
      } finally {
        setRetrying(false);
      }
      return;
    }
    setPageError("");
    setLoading(true);
    try {
      const result = await getParkingDashboard({ headers: { Authorization: `Bearer ${token}` } });
      if (result.status === 200) setDashboard(result.data);
      else setPageError("We couldn't load your parking. Try again.");
    } catch {
      setPageError("We couldn't load your parking. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function releaseToday() {
    if (!dashboard || pending || floorUnavailable) return;
    if (isFixture) {
      if (inFixture(fixture, "release-refused")) return;
      const released: ReleaseRecord = {
        id: 501, date: dashboard.officeDate, status: "Released", area: "Floor 2", createdBy: employee?.name ?? "Bilal Ahmed",
        createdAt: `${dashboard.officeDate}T08:01:00+05:00`, lastChangedBy: employee?.name ?? "Bilal Ahmed",
        lastChangedAt: `${dashboard.officeDate}T08:01:00+05:00`, claimableAt: `${dashboard.officeDate}T08:00:00+05:00`,
      };
      setDashboard({ ...dashboard, releases: [...dashboard.releases.filter((record) => record.date !== dashboard.officeDate), released] });
      return;
    }
    const token = getAccessToken();
    if (!token) { navigate.current("/sign-in"); return; }
    setPending(true);
    setReleaseMessage("");
    try {
      const result = await releaseTodaysParking({ officeDate: dashboard.officeDate }, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status === 200) {
        setDashboard({ ...dashboard, releases: [...dashboard.releases.filter((record) => record.date !== result.data.date), result.data] });
      } else {
        setReleaseMessage(result.data.message);
      }
    } catch {
      setReleaseMessage("We couldn't release today's parking. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function submitClaim() {
    if (!dashboard || !selectedPlate || !canClaim || pending) return;
    if (isFixture) {
      const claimed: ParkingClaim = {
        id: 801, date: dashboard.officeDate, plate: selectedPlate, area: "Floor 3", status: "Claimed", createdBy: employee?.name ?? "Bilal Ahmed",
        createdAt: `${dashboard.officeDate}T08:03:00+05:00`, lastChangedBy: employee?.name ?? "Bilal Ahmed", lastChangedAt: `${dashboard.officeDate}T08:03:00+05:00`,
      };
      setDashboard({ ...dashboard, currentClaim: claimed });
      setSheetOpen(false);
      return;
    }
    const token = getAccessToken();
    if (!token) { navigate.current("/sign-in"); return; }
    setPending(true);
    setClaimMessage("");
    try {
      const result = await claimParkingSpace({ date: dashboard.officeDate, plate: selectedPlate }, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status === 201) {
        setDashboard({ ...dashboard, currentClaim: result.data });
        setSheetOpen(false);
      } else {
        setClaimMessage(result.data.message || refusedClaim);
        const availability = await getParkingAvailability(undefined, { headers: { Authorization: `Bearer ${token}` } });
        if (availability.status === 200) setDashboard((current) => current ? { ...current, availability: availability.data } : current);
      }
    } catch {
      setClaimMessage("We couldn't claim a space. Try again.");
      try {
        const availability = await getParkingAvailability(undefined, { headers: { Authorization: `Bearer ${token}` } });
        if (availability.status === 200) setDashboard((current) => current ? { ...current, availability: availability.data } : current);
      } catch {
        // Keep the last availability count when the refresh itself is unavailable.
      }
    } finally {
      setPending(false);
    }
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plate.trim()) { setVehicleError("Enter a license plate"); return; }
    if (isFixture) {
      const added: Vehicle = { id: vehicles.length + 1, plate: plate.trim().toUpperCase(), make: make.trim() || null, model: model.trim() || null, color: color.trim() || null };
      setProfile((current) => current ? { ...current, vehicles: [...current.vehicles, added] } : current);
      setVehicleMessage(`${added.plate} added.`);
      setDialogOpen(false);
      setPlate(""); setMake(""); setModel(""); setColor("");
      return;
    }
    const token = getAccessToken();
    if (!token) { navigate.current("/sign-in"); return; }
    setPending(true);
    setVehicleError("");
    try {
      const result = await addMyVehicle({ plate: plate.trim().toUpperCase(), make: make.trim() || null, model: model.trim() || null, color: color.trim() || null }, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status === 201) {
        setProfile((current) => current ? { ...current, vehicles: [...current.vehicles, result.data] } : current);
        setVehicleMessage(`${result.data.plate} added.`);
        setDialogOpen(false);
        setPlate(""); setMake(""); setModel(""); setColor("");
      } else setVehicleError(result.data.message);
    } catch {
      setVehicleError("We couldn't add your vehicle. Try again.");
    } finally {
      setPending(false);
    }
  }

  const openClaim = () => {
    if (!hasVehicle) { setDialogOpen(true); return; }
    setSelectedPlate("");
    setSheetOpen(true);
  };

  const statusRecord = todayRelease?.status;
  const successClaim = currentClaim;
  const primaryVehicle = vehicles[0];
  const secondaryVehicles = vehicles.slice(1);
  const nextReleases = dashboard?.releases.filter((record) => record.id !== todayRelease?.id) ?? [];

  return (
    <main data-screen="S-3" data-state={fixture ?? (loading ? "loading" : pageError ? "error" : currentClaim ? "claim-accepted" : "default")} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight">Dashboard</h1>
          {dashboard && <p className="mt-1 text-sm text-muted-foreground">{formatDashboardDate(dashboard.officeDate)}</p>}
        </div>
        {!loading && !displayedError && displayEmployee && <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full border bg-muted text-sm font-medium" aria-hidden="true">{displayEmployee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <div className="hidden text-sm sm:block"><p className="font-medium">{displayEmployee.name}</p><p className="text-muted-foreground">{displayEmployee.email}</p></div>
          <Button variant="ghost" size="sm" onClick={() => { clearAccessToken(); setDashboard(null); setProfile(null); navigate.current("/sign-in"); }}><LogOut /> Sign out</Button>
        </div>}
      </header>

      {loading ? <GarageSkeleton /> : displayedError ? <Notice tone="bad" className="max-w-2xl">
        <RefreshCw />
        <NoticeTitle>{displayedError}</NoticeTitle>
        <NoticeDescription><Button variant="outline" size="sm" className="mt-3" onClick={() => { void retry(); }}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
      </Notice> : dashboard && employee && <>
        {unavailableFields.length > 0 && <Notice tone="warn" className="mb-5 max-w-3xl">
          <RefreshCw />
          <NoticeTitle>{floorUnavailable ? "We couldn't load your assigned floor." : `We couldn't load your ${unavailableFields.map(fieldLabel).join(" and ")}.`}</NoticeTitle>
          <NoticeDescription><Button variant="outline" size="sm" className="mt-3" disabled={retrying} onClick={() => { void retry(); }}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
        </Notice>}

        {releaseMessage && <p role="alert" className="mb-4 max-w-3xl text-sm text-destructive">{releaseMessage}</p>}

        <section className="grid items-start gap-6 lg:grid-cols-12 lg:gap-8" aria-label="Today's parking">
          <Card className="overflow-hidden lg:col-span-8">
            <div className="grid md:grid-cols-2">
              {successClaim ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 bg-muted p-6 text-center sm:min-h-60">
                <div className="relative flex size-20 items-center justify-center rounded-full border bg-card text-primary"><Building2 className="size-10 stroke-1" /><span className="absolute inset-x-0 top-7 text-center text-sm font-semibold">{successClaim.area.match(/\d+/)?.[0] ?? "3"}</span></div>
                <span className="text-sm font-medium text-muted-foreground">Parking assigned</span>
              </div> : <GarageIllustration />}
              <div className="flex flex-col justify-center p-6 sm:p-8">
                {successClaim ? <>
                  <p className="mb-3 flex items-center gap-2"><StatusBadge tone="ok">Claimed</StatusBadge><span className="text-sm text-muted-foreground">{formatShortDate(successClaim.date)}</span></p>
                  <h2 className="mb-3 font-heading text-2xl font-semibold leading-tight tracking-tight">You have a space on {successClaim.area}</h2>
                  <span className="mb-3 inline-flex w-fit rounded-md border bg-muted px-2.5 py-1 font-mono text-sm font-medium tracking-wide">{successClaim.plate}</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">Park anywhere on {successClaim.area}. You don't get a numbered bay.</p>
                </> : isDedicated ? <>
                  <p className="mb-3 flex items-center gap-2"><StatusBadge tone={statusRecord === "Claimed" ? "warn" : statusRecord === "Released" ? "ok" : "brand"}>{statusRecord ?? "Reserved"}</StatusBadge><span className="font-mono text-xs text-muted-foreground">{todayRelease ? formatShortDate(todayRelease.date) : profile?.parking.assignedFloor ?? ""}</span></p>
                  <h2 className="mb-2 font-heading text-2xl font-semibold leading-tight tracking-tight">{profile?.parking.assignedFloor ?? todayRelease?.area ?? "Your dedicated space"}</h2>
                  <p className="mb-6 text-sm text-muted-foreground">{statusRecord === "Claimed" ? "Another employee is parked in your space today" : statusRecord === "Released" ? "Your space is free for colleagues today" : "Your dedicated space is yours today"}</p>
                  {(!todayRelease || statusRecord === "Reserved") && <div className="grid gap-2">
                    <Button className="h-12" disabled={floorUnavailable || pending} onClick={() => { void releaseToday(); }}>{pending ? "Releasing…" : "Release today's parking"}</Button>
                    <p className="text-xs text-muted-foreground">Frees your space for colleagues today.</p>
                  </div>}
                </> : <>
                  <p className="mb-3"><StatusBadge tone="brand">Temporary parking</StatusBadge></p>
                  <p className="mb-2 flex items-end gap-3"><span className="font-heading text-7xl font-semibold leading-none tabular-nums tracking-tight">{dashboard.availability.count}</span><span className="pb-2 text-sm font-medium">Parking spots available</span></p>
                  <div className="mb-5 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    {dashboard.availability.areas.map((area, index) => <span key={area.name}>{index > 0 && <span aria-hidden="true">· </span>}{area.name}: {area.count}</span>)}
                  </div>
                  {dashboard.availability.count > 0 && <Button className="h-12" disabled={!hasVehicle || pending} onClick={openClaim}>{hasVehicle ? "Claim a space" : "Claim a space"}</Button>}
                  {claimMessage && <p role="alert" className="mt-3 text-sm text-destructive">{claimMessage}</p>}
                  {!hasVehicle && dashboard.availability.count > 0 && <p className="mt-2 text-sm text-muted-foreground">Add a vehicle before claiming a space.</p>}
                </>}
              </div>
            </div>
            {!successClaim && !isDedicated && dashboard.availability.notYetClaimable.length > 0 && <div className="border-t px-6 py-4 text-sm text-muted-foreground">
              {dashboard.availability.notYetClaimable.map((space, index) => <p key={`${space.area}-${space.claimableAt}`}>
                {index === 0 ? "Not yet claimable: " : "Also not yet claimable: "}{space.count} on {space.area}, from {formatClaimableAt(space.claimableAt)}
              </p>)}
            </div>}
          </Card>

          <aside className="grid content-start gap-4 lg:col-span-4">
            {dashboard.notice && <Card className="border-primary bg-primary p-4 text-primary-foreground sm:p-5">
              <div className="flex gap-3"><CarFront className="mt-0.5 size-5 shrink-0" /><div><p className="font-medium">{dashboard.notice.message}</p><p className="mt-2 text-sm">Alerts go to {dashboard.notice.email}</p></div></div>
            </Card>}
            <Card className="overflow-hidden">
              <VehicleIllustration vehicle={primaryVehicle} />
              <div className="p-5 sm:p-6">
                <div className="mb-4">
                  {primaryVehicle ? <>
                    <span className="mb-2 inline-flex rounded-md border bg-muted px-2.5 py-1 font-mono text-sm font-medium tracking-wide">{primaryVehicle.plate}</span>
                    <h2 className="font-heading text-base font-semibold">{[primaryVehicle.color, primaryVehicle.make, primaryVehicle.model].filter(Boolean).join(" ")}</h2>
                  </> : <h2 className="font-heading text-base font-semibold">Your vehicles</h2>}
                </div>
                {secondaryVehicles.length > 0 && <div className="space-y-2 border-t pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Secondary vehicle</p>
                  {secondaryVehicles.map((vehicle) => <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(" ")} · <span className="font-mono text-xs font-medium text-foreground">{vehicle.plate}</span></span>
                  </div>)}
                </div>}
                <Button variant="link" className="mt-3 h-auto p-0" disabled={pending} onClick={() => { setVehicleError(""); setDialogOpen(true); }}>Add your vehicle</Button>
                {vehicleMessage && <p role="status" className="mt-2 text-sm text-success">{vehicleMessage}</p>}
              </div>
            </Card>
          </aside>
        </section>

        {floorUnavailable && <p className="mt-4 text-sm text-muted-foreground"><span className="font-semibold tabular-nums text-foreground">{dashboard.availability.count}</span> Parking spots available</p>}

        {nextReleases.length > 0 && <Card className="mt-10 max-w-3xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4"><h2 className="font-heading text-base font-semibold">Your next releases</h2><span className="text-xs text-muted-foreground">{nextReleases.length} scheduled</span></div>
          <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
            <thead><tr className="border-b text-xs font-medium uppercase tracking-wide text-muted-foreground"><th className="pb-2.5 pl-1">Date</th><th className="pb-2.5 pr-1 text-right">Status</th></tr></thead>
            <tbody className="divide-y">{nextReleases.map((release) => <tr key={release.id} className="h-11">
              <td className="pl-1 font-mono align-middle">{formatShortDate(release.date)}</td><td className="pr-1 text-right align-middle"><StatusBadge tone={release.status === "Released" ? "ok" : release.status === "Claimed" ? "warn" : "brand"}>{release.status}</StatusBadge></td>
            </tr>)}</tbody>
          </table></div>
        </Card>}
      </>}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetTitle>Choose your car</SheetTitle>
          <p className="text-sm text-muted-foreground">Select the registered plate you'll use today.</p>
          <div className="grid gap-2"><Label htmlFor={plateId}>License plate</Label>
            <Select value={selectedPlate} onValueChange={setSelectedPlate} required>
              <SelectTrigger id={plateId} aria-required="true"><SelectValue placeholder="Choose a plate" /></SelectTrigger>
              <SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.plate}>{[vehicle.make, vehicle.model].filter(Boolean).join(" ")} · {vehicle.plate}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="mt-auto" disabled={!selectedPlate || pending} onClick={() => { void submitClaim(); }}>{pending ? "Claiming…" : "Claim a space"}</Button>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add your vehicle</DialogTitle><DialogDescription>Add a license plate before claiming temporary parking.</DialogDescription></DialogHeader>
          <form className="grid gap-4" onSubmit={(event) => { void saveVehicle(event); }}>
            <div className="grid gap-2"><Label htmlFor={addPlateId}>License plate</Label><Input id={addPlateId} required value={plate} onChange={(event) => setPlate(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={addMakeId}>Make</Label><Input id={addMakeId} value={make} onChange={(event) => setMake(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={addModelId}>Model</Label><Input id={addModelId} value={model} onChange={(event) => setModel(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={addColorId}>Color</Label><Input id={addColorId} value={color} onChange={(event) => setColor(event.target.value)} /></div>
            {vehicleError && <p role="alert" className="text-sm text-destructive">{vehicleError}</p>}
            <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add a vehicle"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
