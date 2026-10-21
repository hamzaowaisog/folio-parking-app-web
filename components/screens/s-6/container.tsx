"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CarFront, LogOut, RefreshCw } from "lucide-react";
import { addMyVehicle, getMyProfile, retryMyProfileFields } from "@/lib/api/client";
import type { EmployeeProfile, Vehicle } from "@/lib/api/client.schemas";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNav } from "@/lib/nav";

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function sampleProfile(fixture?: string): EmployeeProfile {
  const noVehicle = inFixture(fixture, "first-sign-in-no-vehicle-yet");
  const unavailable = inFixture(fixture, "some-details-unavailable");
  return {
    employee: {
      id: 1042,
      employeeId: "EMP-1042",
      name: "Ayesha Malik",
      email: "ayesha.malik@folio3.com",
      department: unavailable ? null : "Engineering",
      role: "Senior Engineer",
    },
    parking: { status: "dedicated", assignedFloor: unavailable ? null : "Floor 2" },
    vehicles: noVehicle ? [] : [
      { id: 1, plate: "BKT-482", make: "Honda", model: "City", color: "White" },
      { id: 2, plate: "BRD-139", make: "Suzuki", model: "Cultus", color: "Red" },
    ],
    unavailableFields: unavailable ? ["department", "assignedFloor"] : [],
    retryableFields: unavailable ? ["department", "assignedFloor"] : [],
  };
}

function fieldName(field: string): string {
  if (field === "assignedFloor") return "Assigned floor";
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}

function unavailableMessage(fields: string[]): string {
  if (fields.includes("department") || fields.includes("assignedFloor")) return "Department and Assigned floor aren't available right now.";
  const names = fields.map(fieldName);
  if (names.length < 2) return `${names[0] ?? "Profile details"} aren't available right now.`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} aren't available right now.`;
}

function vehicleAddedMessage(vehicle: Vehicle): string {
  const details = [vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  return `${details ? `${details} ` : ""}(${vehicle.plate}) added.`;
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-10">
      <Card className="grid gap-8 p-5 sm:p-6 lg:grid-cols-12 lg:items-center">
        <div className="flex items-center gap-5 lg:col-span-5 lg:border-r lg:pr-6">
          <Skeleton className="size-24 shrink-0 rounded-full sm:size-28" />
          <div className="grid w-full gap-3"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-48" /></div>
        </div>
        <div className="grid divide-y lg:col-span-7">
          {[0, 1, 2, 3, 4].map((row) => <div key={row} className="flex h-11 items-center justify-between px-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-32" /></div>)}
        </div>
      </Card>
    </div>
  );
}

function EmptyVehicleIllustration() {
  return (
    <div role="img" aria-label="A car with an empty plate" className="flex min-h-52 items-center justify-center rounded-lg bg-muted p-6">
      <div aria-hidden="true" className="flex w-full max-w-xs flex-col items-center gap-3 rounded-xl border bg-card p-6">
        <CarFront className="size-20 stroke-1 text-secondary-foreground" />
        <span className="flex h-8 min-w-24 items-center justify-center rounded-md border bg-background px-3 font-mono text-sm text-muted-foreground">&nbsp;</span>
      </div>
    </div>
  );
}

function VehicleCard({ vehicle, index }: { vehicle: Vehicle; index: number }) {
  const values = [vehicle.make, vehicle.model, vehicle.color].filter((value): value is string => Boolean(value));
  return (
    <Card className="overflow-hidden">
      <div role="img" aria-label={`${vehicle.color ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() || "Registered vehicle"} className="relative aspect-video overflow-hidden bg-muted">
        <img src="/images/car.jpg" alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
      </div>
      <div className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-x-2 font-heading text-base font-semibold">
            {values.map((value, valueIndex) => <span key={`${value}-${valueIndex}`} className="contents"><span>{value}</span>{valueIndex < values.length - 1 && <span aria-hidden="true" className="mx-2 font-normal text-muted-foreground">·</span>}</span>)}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{index === 0 ? "Primary registered vehicle" : "Secondary vehicle"}</p>
        </div>
        <span className="shrink-0 rounded-md border bg-card px-2.5 py-1 font-mono text-xs font-medium tracking-wide">{vehicle.plate}</span>
      </div>
    </Card>
  );
}

export function ProfileContainer({ fixture }: { fixture?: string }) {
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;
  const plateId = useId();
  const makeId = useId();
  const modelId = useId();
  const colorId = useId();
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureSaved = inFixture(fixture, "vehicle-saved");
  const initialProfile = isFixture ? sampleProfile(fixture) : null;
  const [profile, setProfile] = useState<EmployeeProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? "We couldn't load your profile. Try again." : "");
  const [retrying, setRetrying] = useState(false);
  const [pending, setPending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(inFixture(fixture, "dialog-add-your-vehicle"));
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [vehicleError, setVehicleError] = useState("");
  const [vehicleMessage, setVehicleMessage] = useState(() => fixtureSaved ? "Red Suzuki Cultus (BRD-139) added." : "");

  useEffect(() => {
    if (isFixture) return;
    const token = getAccessToken();
    if (!token) {
      navigate.current("/sign-in");
      setLoading(false);
      return;
    }
    let active = true;
    getMyProfile({ headers: { Authorization: `Bearer ${token}` } }).then((result) => {
      if (!active) return;
      if (result.status === 200) setProfile(result.data);
      else setPageError("We couldn't load your profile. Try again.");
    }).catch(() => {
      if (active) setPageError("We couldn't load your profile. Try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isFixture]);

  const unavailableFields = profile?.unavailableFields ?? [];
  const unavailableDepartment = unavailableFields.includes("department");
  const unavailableFloor = unavailableFields.includes("assignedFloor");
  const vehicles = profile?.vehicles ?? [];
  const displayState = fixture ?? (loading ? "loading" : pageError ? "error" : vehicles.length === 0 ? "first-sign-in-no-vehicle-yet" : "default");

  async function retry() {
    if (retrying) return;
    if (isFixture) {
      if (unavailableFields.length) setProfile(sampleProfile());
      else if (pageError) setPageError("");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      navigate.current("/sign-in");
      return;
    }
    const retryableFields = profile?.retryableFields.length ? profile.retryableFields : unavailableFields;
    if (retryableFields.length) {
      setRetrying(true);
      try {
        const result = await retryMyProfileFields({ fields: retryableFields }, { headers: { Authorization: `Bearer ${token}` } });
        if (result.status === 200) setProfile(result.data);
        else setPageError("We couldn't load your profile. Try again.");
      } catch {
        setPageError("We couldn't load your profile. Try again.");
      } finally {
        setRetrying(false);
      }
      return;
    }
    setPageError("");
    setLoading(true);
    try {
      const result = await getMyProfile({ headers: { Authorization: `Bearer ${token}` } });
      if (result.status === 200) setProfile(result.data);
      else setPageError("We couldn't load your profile. Try again.");
    } catch {
      setPageError("We couldn't load your profile. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPlate = plate.trim().toUpperCase();
    if (!normalizedPlate) {
      setVehicleError("Enter a license plate");
      return;
    }
    if (isFixture) {
      const added: Vehicle = { id: vehicles.length + 1, plate: normalizedPlate, make: make.trim() || null, model: model.trim() || null, color: color.trim() || null };
      setProfile((current) => current ? { ...current, vehicles: [...current.vehicles, added] } : current);
      setVehicleMessage(vehicleAddedMessage(added));
      setDialogOpen(false);
      setPlate(""); setMake(""); setModel(""); setColor("");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      navigate.current("/sign-in");
      return;
    }
    setPending(true);
    setVehicleError("");
    try {
      const result = await addMyVehicle({
        plate: normalizedPlate,
        make: make.trim() || null,
        model: model.trim() || null,
        color: color.trim() || null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (result.status === 201) {
        setProfile((current) => current ? { ...current, vehicles: [...current.vehicles, result.data] } : current);
        setVehicleMessage(vehicleAddedMessage(result.data));
        setDialogOpen(false);
        setPlate(""); setMake(""); setModel(""); setColor("");
      } else {
        setVehicleError(result.data.message);
      }
    } catch {
      setVehicleError("We couldn't add your vehicle. Try again.");
    } finally {
      setPending(false);
    }
  }

  function openVehicleDialog() {
    setVehicleError("");
    setDialogOpen(true);
  }

  return (
    <main data-screen="S-6" data-state={displayState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight">Profile</h1>
        {!loading && !pageError && profile && <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full border bg-muted text-sm font-medium">{profile.employee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
          <Button variant="ghost" size="sm" onClick={() => { clearAccessToken(); setProfile(null); navigate.current("/sign-in"); }}><LogOut /> Sign out</Button>
        </div>}
      </header>

      {loading ? <ProfileSkeleton /> : pageError ? <Notice tone="bad" className="max-w-2xl">
        <RefreshCw />
        <NoticeTitle>{pageError}</NoticeTitle>
        <NoticeDescription><Button variant="outline" size="sm" className="mt-3" disabled={retrying} onClick={() => { void retry(); }}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
      </Notice> : profile && <>
        {unavailableFields.length > 0 && <Notice tone="warn" className="mb-5 max-w-3xl">
          <RefreshCw />
          <NoticeTitle>{unavailableMessage(unavailableFields)}</NoticeTitle>
          <NoticeDescription><Button variant="outline" size="sm" className="mt-3" disabled={retrying} onClick={() => { void retry(); }}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
        </Notice>}

        <Card className="mb-12 p-5 sm:p-6">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="flex items-center gap-5 lg:col-span-5 lg:border-r lg:pr-6">
              <span aria-hidden="true" className="flex size-24 shrink-0 items-center justify-center rounded-full border bg-muted text-2xl font-medium sm:size-28">{profile.employee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <div className="min-w-0">
                <h2 className="font-heading text-2xl font-semibold leading-snug tracking-tight">{profile.employee.name}</h2>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  {profile.employee.department && <span>{profile.employee.department}</span>}
                  {profile.employee.department && profile.employee.role && <span aria-hidden="true">·</span>}
                  {profile.employee.role && <span>{profile.employee.role}</span>}
                </p>
              </div>
            </div>
            <div className="grid divide-y lg:col-span-7">
              <div className="flex min-h-11 items-center justify-between gap-4 px-1 text-sm"><span className="text-muted-foreground">Employee ID</span><span className="font-mono font-medium tracking-wide">{profile.employee.employeeId}</span></div>
              <div className="flex min-h-11 items-center justify-between gap-4 px-1 text-sm"><span className="text-muted-foreground">Email</span><span className="font-medium">{profile.employee.email}</span></div>
              {unavailableDepartment && <div className="flex min-h-11 items-center justify-between gap-4 px-1 text-sm"><span className="text-muted-foreground">Department</span><span className="font-medium">Not available</span></div>}
              <div className="flex min-h-11 items-center justify-between gap-4 px-1 text-sm"><span className="text-muted-foreground">Parking status</span><StatusBadge tone={profile.parking.status === "dedicated" ? "ok" : "neutral"}><span>{profile.parking.status === "dedicated" ? "Dedicated" : "Temporary"}</span><span>parking</span></StatusBadge></div>
              <div className="flex min-h-11 items-center justify-between gap-4 px-1 text-sm"><span className="text-muted-foreground">Assigned floor</span><span className="font-medium">{unavailableFloor || !profile.parking.assignedFloor ? "Not available" : profile.parking.assignedFloor}</span></div>
            </div>
          </div>
        </Card>

      </>}

      {!pageError && !loading && profile && vehicleMessage && <p role="status" className="mb-4 text-sm font-medium text-success">{vehicleMessage}</p>}
      {!pageError && <section aria-label="Your cars" className="mt-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Your cars</h2>
          <Button className="h-11" disabled={pending} onClick={openVehicleDialog}><span aria-hidden="true">+</span> Add a vehicle</Button>
        </div>
        {loading ? <div className="grid gap-6 sm:grid-cols-2"><Skeleton className="h-72 w-full" /><Skeleton className="h-72 w-full" /></div>
          : profile && vehicles.length === 0 ? <Card className="grid gap-5 p-5 sm:grid-cols-2 sm:items-center sm:p-6">
            <EmptyVehicleIllustration />
            <div className="grid justify-items-start gap-3">
              <h3 className="font-heading text-xl font-semibold">Add your vehicle</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">You need one plate before you can claim a space.</p>
            </div>
          </Card>
            : profile && <div className="grid gap-6 md:grid-cols-2">{vehicles.map((vehicle, index) => <VehicleCard key={vehicle.id} vehicle={vehicle} index={index} />)}</div>}
      </section>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add your vehicle</DialogTitle><DialogDescription>Enter a license plate and any available vehicle details.</DialogDescription></DialogHeader>
          <form className="grid gap-4" onSubmit={(event) => { void saveVehicle(event); }}>
            <div className="grid gap-2"><Label htmlFor={plateId}>License plate</Label><Input id={plateId} required value={plate} onChange={(event) => setPlate(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={makeId}>Make</Label><Input id={makeId} value={make} onChange={(event) => setMake(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={modelId}>Model</Label><Input id={modelId} value={model} onChange={(event) => setModel(event.target.value)} /></div>
            <div className="grid gap-2"><Label htmlFor={colorId}>Color</Label><Input id={colorId} value={color} onChange={(event) => setColor(event.target.value)} /></div>
            {vehicleError && <p role="alert" className="text-sm text-destructive">{vehicleError}</p>}
            <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save vehicle"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
