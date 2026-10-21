"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { Building2, CarFront, RefreshCw } from "lucide-react";
import { addMyVehicle, claimParkingSpace, getMyProfile, getParkingAvailability } from "@/lib/api/client";
import type { Availability, EmployeeProfile, ParkingClaim, Vehicle } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

const fixtureDate = "2025-10-14";
const refusedClaim = "No space could be claimed. The last free space was taken just now.";

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function sessionOptions(token: string | null): RequestInit | undefined {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

function sampleAvailability(fixture?: string): Availability {
  const empty = inFixture(fixture, "nothing-free");
  return {
    date: fixtureDate,
    count: empty ? 0 : 5,
    areas: empty ? [] : [{ name: "Floor 1", count: 2 }, { name: "Floor 3", count: 3 }],
    notYetClaimable: empty ? [] : [{ area: "Floor 2", count: 2, claimableAt: "2025-10-15T09:30:00+05:00" }],
  };
}

function sampleProfile(fixture?: string): EmployeeProfile {
  const noVehicles = inFixture(fixture, "no-plate-registered");
  return {
    employee: { id: 1042, employeeId: "EMP-1042", name: "Bilal Ahmed", email: "bilal.ahmed@folio3.com", department: "Engineering", role: "Accountant" },
    parking: { status: "temporary", assignedFloor: null },
    vehicles: noVehicles ? [] : [
      { id: 1, plate: "AWC-917", make: "Toyota", model: "Corolla", color: "Grey" },
      { id: 2, plate: "LEB-554", make: "Suzuki", model: "Alto", color: "Blue" },
    ],
    unavailableFields: [],
    retryableFields: [],
  };
}

function sampleClaim(): ParkingClaim {
  return {
    id: 801,
    date: fixtureDate,
    plate: "AWC-917",
    area: "Floor 3",
    status: "Claimed",
    createdBy: "Bilal Ahmed",
    createdAt: `${fixtureDate}T08:03:00+05:00`,
    lastChangedBy: "Bilal Ahmed",
    lastChangedAt: `${fixtureDate}T08:03:00+05:00`,
  };
}

function formatDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(value);
}

function formatClaimableAt(timestamp: string): string {
  const value = new Date(timestamp);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(value);
  const date = new Date(`${timestamp.slice(0, 10)}T12:00:00Z`);
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "UTC" }).format(date);
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(date);
  return `${time} on ${weekday} ${day} ${month}`;
}

function GarageIllustration({ full = false }: { full?: boolean }) {
  return (
    <div role="img" aria-label={full ? "Full car park" : "Car park level with empty painted bays"} className="relative flex min-h-52 items-end overflow-hidden bg-secondary p-5 sm:min-h-60">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-muted" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-1/2 items-center justify-around border-b border-border px-6">
        <div className="h-8 w-1/4 border-x border-t border-border-strong" />
        <div className="h-8 w-1/4 border-x border-t border-border-strong" />
        <div className="h-8 w-1/4 border-x border-t border-border-strong" />
      </div>
      <div aria-hidden="true" className="relative z-10 grid w-full grid-cols-3 gap-3">
        {[0, 1, 2].map((bay) => (
          <div key={bay} className="flex h-20 items-center justify-center rounded-t-md border-x-2 border-t-2 border-dashed border-primary/40 bg-card/50 sm:h-24">
            {full ? <CarFront className="size-12 stroke-1 text-secondary-foreground" /> : <span className="text-xs font-medium text-muted-foreground">PARKING</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function VehicleIllustration({ vehicle }: { vehicle?: Vehicle }) {
  return (
    <div role="img" aria-label={vehicle ? `${vehicle.color ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? "car"}`.trim() : "Car and empty license plate"} className="flex h-36 items-center justify-center rounded-md bg-muted">
      <div aria-hidden="true" className="flex h-24 w-4/5 items-center justify-center gap-3 rounded-3xl border border-border-strong bg-card shadow-sm">
        <CarFront className="size-14 stroke-1 text-secondary-foreground" />
        <span className="flex h-7 min-w-16 items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium">{vehicle?.plate ?? "PLATE"}</span>
      </div>
    </div>
  );
}

function FreeSpacesSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <Card className="grid overflow-hidden md:grid-cols-2">
        <Skeleton className="h-52 w-full rounded-none sm:h-60" />
        <div className="grid content-center gap-4 p-6"><Skeleton className="h-12 w-24" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-10 w-full" /></div>
      </Card>
      <div className="grid gap-6 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      <Skeleton className="h-40" />
    </div>
  );
}

function ChartPanel({ availability }: { availability: Availability }) {
  const floors = [...new Set([
    ...availability.areas.map((area) => area.name),
    ...availability.notYetClaimable.map((area) => area.area),
  ])].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const highest = Math.max(1, ...availability.areas.map((area) => area.count));

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-5 font-heading text-base font-semibold">Free to claim now, by floor</h2>
      {floors.length ? <div className="grid gap-4">
        {floors.map((floor) => {
          const count = availability.areas.find((area) => area.name === floor)?.count ?? 0;
          const barWidth = count === 0 ? "w-0" : count / highest >= 0.75 ? "w-full" : count / highest >= 0.5 ? "w-3/4" : count / highest >= 0.25 ? "w-1/2" : "w-1/4";
          return <div key={floor} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0">{floor}</span>
            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full bg-primary ${barWidth}`} /></div>
            <span className="w-8 text-right font-mono tabular-nums">{count}</span>
          </div>;
        })}
      </div> : <p className="text-sm text-muted-foreground">No spaces are free right now</p>}
    </Card>
  );
}

export function FreeSpacesContainer({ fixture }: { fixture?: string }) {
  const plateId = useId();
  const addPlateId = useId();
  const addMakeId = useId();
  const addModelId = useId();
  const addColorId = useId();
  const isFixture = fixture !== undefined;
  const fixtureError = inFixture(fixture, "error");
  const fixtureLoading = inFixture(fixture, "loading");
  const [availability, setAvailability] = useState<Availability | null>(() => isFixture ? sampleAvailability(fixture) : null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(() => isFixture ? sampleProfile(fixture) : null);
  const [claim, setClaim] = useState<ParkingClaim | null>(() => inFixture(fixture, "claim-accepted") ? sampleClaim() : null);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? "We couldn't load free spaces. Try again." : "");
  const [claimMessage, setClaimMessage] = useState(inFixture(fixture, "claim-refused") ? refusedClaim : "");
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(inFixture(fixture, "sheet-choose-your-car"));
  const [dialogOpen, setDialogOpen] = useState(inFixture(fixture, "dialog-add-your-vehicle"));
  const [selectedPlate, setSelectedPlate] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  useEffect(() => {
    if (isFixture) return;
    let active = true;
    const options = sessionOptions(getAccessToken());
    setLoading(true);
    Promise.all([getParkingAvailability(undefined, options), getMyProfile(options)]).then(([availabilityResult, profileResult]) => {
      if (!active) return;
      if (availabilityResult.status !== 200 || profileResult.status !== 200) {
        setPageError("We couldn't load free spaces. Try again.");
        return;
      }
      setAvailability(availabilityResult.data);
      setProfile(profileResult.data);
    }).catch(() => {
      if (active) setPageError("We couldn't load free spaces. Try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isFixture]);

  const vehicles = profile?.vehicles ?? [];
  const hasVehicle = vehicles.length > 0;
  const count = availability?.count ?? 0;
  const canClaim = count > 0 && hasVehicle && !claim;

  async function retry() {
    if (isFixture) {
      setPageError("");
      setLoading(false);
      return;
    }
    if (retrying) return;
    const options = sessionOptions(getAccessToken());
    setRetrying(true);
    setPageError("");
    setLoading(true);
    try {
      const [availabilityResult, profileResult] = await Promise.all([getParkingAvailability(undefined, options), getMyProfile(options)]);
      if (availabilityResult.status === 200 && profileResult.status === 200) {
        setAvailability(availabilityResult.data);
        setProfile(profileResult.data);
      } else setPageError("We couldn't load free spaces. Try again.");
    } catch {
      setPageError("We couldn't load free spaces. Try again.");
    } finally {
      setRetrying(false);
      setLoading(false);
    }
  }

  async function submitClaim(plateToClaim = selectedPlate) {
    if (!availability || !plateToClaim || !canClaim || pending) return;
    if (isFixture) {
      setClaim({ ...sampleClaim(), date: availability.date, plate: plateToClaim });
      setSheetOpen(false);
      return;
    }
    const options = sessionOptions(getAccessToken());
    setPending(true);
    setClaimMessage("");
    try {
      const result = await claimParkingSpace({ date: availability.date, plate: plateToClaim }, options);
      if (result.status === 201) {
        setClaim(result.data);
        setSheetOpen(false);
      } else {
        setClaimMessage(result.data.message || refusedClaim);
        const refreshed = await getParkingAvailability(undefined, options);
        if (refreshed.status === 200) setAvailability(refreshed.data);
      }
    } catch {
      setClaimMessage("We couldn't claim a space. Try again.");
      try {
        const refreshed = await getParkingAvailability(undefined, options);
        if (refreshed.status === 200) setAvailability(refreshed.data);
      } catch {
        // Keep the current availability count if refreshing also fails.
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
      setDialogOpen(false);
      setPlate(""); setMake(""); setModel(""); setColor("");
      return;
    }
    const options = sessionOptions(getAccessToken());
    setPending(true);
    setVehicleError("");
    try {
      const result = await addMyVehicle({ plate: plate.trim().toUpperCase(), make: make.trim() || null, model: model.trim() || null, color: color.trim() || null }, options);
      if (result.status === 201) {
        setProfile((current) => current ? { ...current, vehicles: [...current.vehicles, result.data] } : current);
        setDialogOpen(false);
        setPlate(""); setMake(""); setModel(""); setColor("");
      } else setVehicleError(result.data.message);
    } catch {
      setVehicleError("We couldn't add your vehicle. Try again.");
    } finally {
      setPending(false);
    }
  }

  function openClaim() {
    if (!hasVehicle) { setDialogOpen(true); return; }
    setSelectedPlate("");
    setSheetOpen(true);
  }

  const screenState = fixture ?? (loading ? "loading" : pageError ? "error" : claim ? "claim-accepted" : count === 0 ? "nothing-free" : !hasVehicle ? "no-plate-registered" : "default");

  return (
    <main data-screen="S-5" data-state={screenState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 font-heading text-3xl font-semibold leading-tight tracking-tight">Free spaces</h1>

      {loading ? <FreeSpacesSkeleton /> : pageError ? <Notice tone="bad" className="max-w-2xl">
        <RefreshCw />
        <NoticeTitle>{pageError}</NoticeTitle>
        <NoticeDescription><Button variant="outline" size="sm" className="mt-3" disabled={retrying} onClick={() => { void retry(); }}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
      </Notice> : availability && profile && <>
        {claimMessage && <p role="alert" className="mb-4 max-w-3xl text-sm text-destructive">{claimMessage}</p>}
        <Card className="mb-6 grid overflow-hidden md:grid-cols-2">
          {claim ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 bg-muted p-6 text-center sm:min-h-60">
            <div className="relative flex size-20 items-center justify-center rounded-full border bg-card text-primary"><Building2 className="size-10 stroke-1" /><span className="absolute inset-x-0 top-7 text-center text-sm font-semibold">{claim.area.match(/\d+/)?.[0]}</span></div>
            <span className="text-sm font-medium text-muted-foreground">Parking assigned</span>
          </div> : <GarageIllustration full={count === 0} />}
          <div className="flex flex-col justify-center p-6 sm:p-8">
            {claim ? <>
              <p className="mb-3 text-sm text-muted-foreground">{formatDate(claim.date)}</p>
              <h2 className="mb-3 font-heading text-2xl font-semibold leading-tight tracking-tight">You have a space on {claim.area}</h2>
              <span className="mb-3 inline-flex w-fit rounded-md border bg-muted px-2.5 py-1 font-mono text-sm font-medium tracking-wide">{claim.plate}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">No numbered bay. Park anywhere on {claim.area}.</p>
            </> : <>
              <p className="mb-2 flex items-end gap-3"><span className="font-mono text-7xl font-semibold leading-none tabular-nums tracking-tight">{count}</span><span className="pb-2 text-sm font-medium">Parking spots available today</span></p>
              {count > 0 ? <>
                <div className="mb-5 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {availability.areas.map((area, index) => <span key={area.name}>{index > 0 && <span aria-hidden="true">· </span>}{area.name}: <span className="font-mono">{area.count}</span></span>)}
                </div>
                <Button className="h-12" disabled={!hasVehicle || pending} onClick={openClaim}>Claim a space</Button>
                <p className="mt-2 text-sm text-muted-foreground">You get a floor, not a numbered bay.</p>
              </> : <p className="text-base font-medium">No spaces are free right now</p>}
            </>}
          </div>
        </Card>

        {!claim && count > 0 && <div className="mb-6 grid gap-6 md:grid-cols-2">
          <ChartPanel availability={availability} />
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 font-heading text-base font-semibold">Not yet claimable</h2>
            {availability.notYetClaimable.length ? <div className="grid gap-3">
              {availability.notYetClaimable.map((space) => <div key={`${space.area}-${space.claimableAt}`} className="rounded-md border bg-muted p-4">
                <p className="font-medium">{space.area}: <span className="font-mono">{space.count}</span> spaces</p>
                <p className="mt-1 text-sm text-muted-foreground">Claimable from <span className="font-mono">{formatClaimableAt(space.claimableAt)}</span></p>
              </div>)}
            </div> : <p className="text-sm text-muted-foreground">No upcoming spaces</p>}
          </Card>
        </div>}
        {!claim && (count > 0 || hasVehicle) && <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold">Your cars</h2>
            {hasVehicle && count > 0 && <Button variant="outline" onClick={() => { setVehicleError(""); setDialogOpen(true); }}>Add a vehicle</Button>}
          </div>
          {hasVehicle ? <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map((vehicle) => <div key={vehicle.id} className="flex items-center gap-4 rounded-md border p-3">
              <div className="w-28 shrink-0"><VehicleIllustration vehicle={vehicle} /></div>
              <div className="min-w-0">
                <span className="mb-2 inline-flex rounded-md border bg-muted px-2.5 py-1 font-mono text-sm font-medium tracking-wide">{vehicle.plate}</span>
                <p className="text-sm text-muted-foreground">{[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(" ")}</p>
              </div>
            </div>)}
          </div> : <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
            <VehicleIllustration />
            <div className="grid justify-items-start gap-3">
              <p className="font-medium">Add your vehicle to claim a space</p>
              <Button onClick={() => { setVehicleError(""); setDialogOpen(true); }}>Add a vehicle</Button>
            </div>
          </div>}
        </Card>}
      </>}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetTitle>Choose your car</SheetTitle>
          <p className="text-sm text-muted-foreground">Select the registered plate you'll use today.</p>
          <div className="grid gap-2"><Label htmlFor={plateId}>License plate</Label>
            <Select value={selectedPlate} onValueChange={setSelectedPlate} required>
              <SelectTrigger id={plateId} aria-required="true"><SelectValue placeholder="Choose a plate" /></SelectTrigger>
              <SelectContent>{vehicles.map((vehicle) => <SelectItem key={vehicle.id} value={vehicle.plate}>{[vehicle.make, vehicle.model].filter(Boolean).join(" ")} · <span className="font-mono">{vehicle.plate}</span></SelectItem>)}</SelectContent>
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
