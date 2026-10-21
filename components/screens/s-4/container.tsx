"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cancelRelease, getMyProfile, listMyReleases, scheduleReleases } from "@/lib/api/client";
import type { EmployeeProfile, ReleaseRecord } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Link } from "@/lib/nav";

const fixtureOfficeDate = "2025-10-14";
const refusalMessage = "No space could be claimed. The last free space was taken just now.";

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function officeDateNow(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "0";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function shiftMonth(date: string, amount: number): string {
  const value = new Date(`${monthStart(date)}T12:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + amount);
  return value.toISOString().slice(0, 10);
}

function formatDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en", { ...options, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function formatLongDate(date: string): string {
  return formatDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(date: string): string {
  return formatDate(date, { weekday: "short", day: "numeric", month: "short" });
}

function formatMonth(date: string): string {
  return formatDate(date, { month: "long", year: "numeric" });
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "—";
  const value = new Date(timestamp);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "Asia/Karachi" }).format(value);
  const day = new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Asia/Karachi" }).format(value);
  const month = new Intl.DateTimeFormat("en", { month: "short", timeZone: "Asia/Karachi" }).format(value);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Karachi" }).format(value);
  return `${weekday} ${day} ${month} ${time}`;
}

function makeRelease(id: number, date: string, status: ReleaseRecord["status"], time: string): ReleaseRecord {
  const createdDate = date === "2025-10-24" ? "2025-10-14" : "2025-10-13";
  return {
    id,
    date,
    status,
    area: "Floor 2",
    createdBy: status === "Reserved" ? "—" : "Ayesha Malik",
    createdAt: status === "Reserved" ? "" : `${createdDate}T${time}:00+05:00`,
    lastChangedBy: status === "Reserved" ? "—" : "Ayesha Malik",
    lastChangedAt: status === "Reserved" ? "" : `${createdDate}T${time}:00+05:00`,
    claimableAt: `${date}T08:00:00+05:00`,
  };
}

function sampleProfile(dedicated = true): EmployeeProfile {
  return {
    employee: { id: 1042, employeeId: "EMP-1042", name: "Ayesha Malik", email: "ayesha.malik@folio3.com", department: "Engineering", role: "Senior Engineer" },
    parking: { status: dedicated ? "dedicated" : "temporary", assignedFloor: dedicated ? "Floor 2" : null },
    vehicles: [{ id: 1, plate: "BRD-139", make: "Suzuki", model: "Cultus", color: "Red" }],
    unavailableFields: [],
    retryableFields: [],
  };
}

function sampleReleases(fixture?: string): ReleaseRecord[] {
  const releases = [
    makeRelease(501, "2025-10-14", "Reserved", "08:12"),
    makeRelease(502, "2025-10-17", "Released", "17:42"),
    makeRelease(503, "2025-10-20", "Released", "17:44"),
    makeRelease(504, "2025-10-21", "Released", "17:44"),
    makeRelease(505, "2025-10-24", "Released", "08:55"),
    makeRelease(506, "2025-10-13", "Claimed", "16:20"),
  ];
  if (inFixture(fixture, "release-scheduled")) {
    releases.push(makeRelease(507, "2025-10-22", "Reserved", "08:12"), makeRelease(508, "2025-10-23", "Reserved", "08:12"));
  }
  if (inFixture(fixture, "cancellation-result") && (inFixture(fixture, "refusal") || inFixture(fixture, "claimed"))) {
    const claimed = makeRelease(502, "2025-10-17", "Claimed", "17:42");
    return releases.map((release) => release.id === claimed.id ? claimed : release);
  }
  return releases;
}

function MonthCalendar({
  month,
  officeDate,
  lastDate,
  selectedDates,
  releases,
  onToggle,
}: {
  month: string;
  officeDate: string;
  lastDate: string;
  selectedDates: string[];
  releases: ReleaseRecord[];
  onToggle: (date: string) => void;
}) {
  const monthDate = new Date(`${monthStart(month)}T12:00:00Z`);
  const year = monthDate.getUTCFullYear();
  const monthIndex = monthDate.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingDays = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: leadingDays }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const recordByDate = new Map(releases.map((release) => [release.date, release]));

  return (
    <div>
      <h3 className="mb-4 font-heading text-base font-semibold">{formatMonth(month)}</h3>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-sm">
        {cells.map((date, index) => {
          if (!date) return <div key={`${month}-blank-${index}`} aria-hidden="true" className="h-11" />;
          const selected = selectedDates.includes(date);
          const today = date === officeDate;
          const release = recordByDate.get(date);
          const inRange = date > officeDate && date <= lastDate;
          const released = release?.status === "Released";
          const claimed = release?.status === "Claimed";
          const className = selected
            ? "border-2 border-primary bg-primary/10 text-primary"
            : today
              ? "border-2 border-primary bg-card text-primary"
              : released
                ? "border border-success bg-success/10 text-success"
                : claimed
                  ? "border border-dashed border-border-strong bg-muted text-muted-foreground"
                  : "border border-border bg-card text-foreground hover:border-primary";
          const marker = selected ? "✓" : today ? "Today" : released ? "Rel" : claimed ? "Locked" : release?.status === "Reserved" ? "Reserved" : "";
          return (
            <button
              key={date}
              type="button"
              aria-label={`${formatLongDate(date)}${selected ? ", selected" : release ? `, ${release.status}` : today ? ", today" : ""}`}
              aria-pressed={selected}
              disabled={!inRange}
              onClick={() => onToggle(date)}
              className={`flex h-11 min-w-0 flex-col items-center justify-center rounded-md text-xs disabled:cursor-not-allowed disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground ${className}`}
            >
              <span className="font-mono font-medium">{Number(date.slice(8, 10))}</span>
              {marker && <span className="text-xs font-medium leading-none">{marker}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap gap-4 border-b pb-5">
        {["Released", "Reserved", "Claimed", "Today", "Selected"].map((label) => <div key={label} className="flex items-center gap-2"><Skeleton className="size-4" /><Skeleton className="h-4 w-16" /></div>)}
      </div>
      <div className="grid gap-8">
        {[0, 1].map((month) => <div key={month} className="grid gap-3"><Skeleton className="h-5 w-32" /><div className="grid grid-cols-7 gap-1.5">{Array.from({ length: 35 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}</div></div>)}
      </div>
    </Card>
  );
}

function EmptyBayIllustration() {
  return (
    <div role="img" aria-label="An empty parking bay" className="relative flex min-h-52 items-end overflow-hidden bg-muted p-5 sm:min-h-60">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 border-b border-border bg-secondary" />
      <div aria-hidden="true" className="relative z-10 mx-auto flex h-24 w-2/3 items-center justify-center rounded-t-md border-x-2 border-t-2 border-dashed border-primary/40 bg-card/50">
        <span className="text-sm font-medium text-muted-foreground">PARKING</span>
      </div>
    </div>
  );
}

export function MySpaceContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureNoParking = inFixture(fixture, "employee-without-dedicated-parking") || inFixture(fixture, "no-dedicated");
  const fixtureDaysSelected = inFixture(fixture, "days-selected");
  const fixtureScheduled = inFixture(fixture, "release-scheduled");
  const fixtureCancellation = inFixture(fixture, "cancellation-result");
  const fixtureConfirm = inFixture(fixture, "confirm");
  const [officeDate, setOfficeDate] = useState(isFixture ? fixtureOfficeDate : "");
  const [calendarMonth, setCalendarMonth] = useState(isFixture ? monthStart(fixtureOfficeDate) : "");
  const [profile, setProfile] = useState<EmployeeProfile | null>(() => isFixture ? sampleProfile(!fixtureNoParking) : null);
  const [releases, setReleases] = useState<ReleaseRecord[]>(() => isFixture ? sampleReleases(fixture) : []);
  const [selectedDates, setSelectedDates] = useState<string[]>(() => fixtureDaysSelected ? ["2025-10-22", "2025-10-23"] : []);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? "We couldn't load your space. Try again." : "");
  const [resultMessage, setResultMessage] = useState(() => fixtureScheduled
    ? "Released for Wed 22 Oct and Thu 23 Oct."
    : fixtureCancellation
      ? inFixture(fixture, "refusal") || inFixture(fixture, "claimed") ? refusalMessage : "Release for Fri 17 Oct cancelled."
      : "");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const initialConfirmRelease = fixtureConfirm ? sampleReleases(fixture).find((release) => release.date === "2025-10-17") ?? null : null;
  const [confirmRelease, setConfirmRelease] = useState<ReleaseRecord | null>(initialConfirmRelease);
  const lastDate = officeDate ? addDays(officeDate, 30) : "";
  const dedicated = profile?.parking.status === "dedicated";

  async function loadData() {
    const token = getAccessToken();
    const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const [releaseResult, profileResult] = await Promise.all([listMyReleases(undefined, options), getMyProfile(options)]);
    if (releaseResult.status !== 200) throw new Error(releaseResult.data.message || "We couldn't load your space. Try again.");
    if (profileResult.status !== 200) throw new Error(profileResult.data.message || "We couldn't load your space. Try again.");
    const currentOfficeDate = officeDateNow();
    setOfficeDate(currentOfficeDate);
    setCalendarMonth(monthStart(currentOfficeDate));
    setReleases(releaseResult.data.releases);
    setProfile(profileResult.data);
  }

  useEffect(() => {
    if (isFixture) return;
    let active = true;
    setLoading(true);
    loadData().catch(() => {
      if (active) setPageError("We couldn't load your space. Try again.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isFixture]);

  async function retry() {
    if (isFixture) {
      setPageError("");
      return;
    }
    setRetrying(true);
    setPageError("");
    try {
      await loadData();
    } catch {
      setPageError("We couldn't load your space. Try again.");
    } finally {
      setRetrying(false);
    }
  }

  function toggleDate(date: string) {
    if (!officeDate || date <= officeDate || date > lastDate || pending) return;
    setSelectedDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort());
  }

  async function submitReleaseDates() {
    if (selectedDates.length === 0 || pending) return;
    if (isFixture) {
      const scheduled = selectedDates.map((date, index) => makeRelease(800 + index, date, "Reserved", "08:12"));
      setReleases((current) => [...current.filter((record) => !scheduled.some((item) => item.date === record.date)), ...scheduled]);
      setResultMessage(`Released for ${scheduled.map((release) => formatShortDate(release.date)).join(" and ")}.`);
      setSelectedDates([]);
      return;
    }
    const token = getAccessToken();
    const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const dates = [...selectedDates];
    setPending(true);
    setActionError("");
    setResultMessage("");
    try {
      const result = await scheduleReleases({ dates }, options);
      if (result.status === 201) {
        setReleases((current) => [...current.filter((record) => !result.data.releases.some((item) => item.date === record.date)), ...result.data.releases]);
        setResultMessage(`Released for ${result.data.releases.map((release) => formatShortDate(release.date)).join(" and ")}.`);
        setSelectedDates([]);
      } else setActionError(result.data.message);
    } catch {
      setActionError("We couldn't schedule these releases. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function confirmCancellation() {
    if (!confirmRelease || pending) return;
    if (isFixture) {
      if (!inFixture(fixture, "refusal") && !inFixture(fixture, "claimed")) {
        const updated = { ...confirmRelease, status: "Released" as const };
        setReleases((current) => current.map((release) => release.id === updated.id ? updated : release));
        setResultMessage(`Release for ${formatShortDate(updated.date)} cancelled.`);
      } else setResultMessage(refusalMessage);
      setConfirmRelease(null);
      return;
    }
    const token = getAccessToken();
    const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    setPending(true);
    setActionError("");
    setResultMessage("");
    try {
      const result = await cancelRelease(confirmRelease.id, { reason: "Employee requested cancellation" }, options);
      if (result.status === 200) {
        setReleases((current) => current.map((release) => release.id === result.data.release.id ? result.data.release : release));
        setResultMessage(result.data.message);
      } else setResultMessage(result.data.message);
      setConfirmRelease(null);
    } catch {
      setActionError("We couldn't cancel this release. Try again.");
    } finally {
      setPending(false);
    }
  }

  const selectedReleases = selectedDates.map((date) => releases.find((release) => release.date === date));
  const releaseForConfirmation = confirmRelease;
  const state = fixture ?? (loading ? "loading" : pageError ? "error" : !dedicated ? "employee-without-dedicated-parking" : "default");

  return (
    <main data-screen="S-4" data-state={state} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight">My space</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dates are in Karachi time (PKT). You can release up to {lastDate ? formatShortDate(lastDate) : "…"}.</p>
      </header>

      {loading ? <CalendarSkeleton /> : pageError ? <Notice tone="bad" className="max-w-2xl">
        <RefreshCw />
        <NoticeTitle>{pageError}</NoticeTitle>
        <NoticeDescription><Button variant="outline" size="sm" className="mt-3" disabled={retrying} onClick={() => { void retry(); }}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
      </Notice> : !dedicated ? <Card className="max-w-2xl overflow-hidden">
        <EmptyBayIllustration />
        <div className="p-5 sm:p-6">
          <p className="mb-4 text-sm leading-relaxed">You don&apos;t have a dedicated space. You can claim a free one for today.</p>
          <Button variant="link" asChild className="h-auto p-0"><Link to="/free-spaces">Free spaces</Link></Button>
        </div>
      </Card> : <>
        {resultMessage && <p role="status" className="mb-5 max-w-4xl text-sm text-success">{resultMessage}</p>}
        {actionError && <p role="alert" className="mb-5 max-w-4xl text-sm text-destructive">{actionError}</p>}
        <div className="mb-12 grid items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <Card className="p-5 sm:p-6 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b pb-5 text-sm">
              <div className="flex items-center gap-2"><span className="size-3.5 rounded border border-success bg-success/10" /><span className="text-muted-foreground">Released</span></div>
              <div className="flex items-center gap-2"><span className="size-3.5 rounded border border-border bg-card" /><span className="text-muted-foreground">Reserved</span></div>
              <div className="flex items-center gap-2"><span className="size-3.5 rounded border border-dashed border-border-strong bg-muted" /><span className="text-muted-foreground">Claimed (locked)</span></div>
              <div className="flex items-center gap-2"><span className="size-3.5 rounded-full border-2 border-primary bg-card" /><span className="text-muted-foreground">Today</span></div>
              <div className="flex items-center gap-2"><span className="flex size-3.5 items-center justify-center rounded border border-primary bg-primary/10 text-xs text-primary">✓</span><span className="text-muted-foreground">Selected</span></div>
            </div>
            <div className="grid gap-8 pt-6">
              {[calendarMonth, shiftMonth(calendarMonth, 1)].map((month) => <MonthCalendar
                key={month}
                month={month}
                officeDate={officeDate}
                lastDate={lastDate}
                selectedDates={selectedDates}
                releases={releases}
                onToggle={toggleDate}
              />)}
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" size="sm" aria-label="Previous month" onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}><ChevronLeft /></Button>
              <Button type="button" variant="outline" size="sm" aria-label="Next month" onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}><ChevronRight /></Button>
            </div>
          </Card>

          <aside className="lg:col-span-5">
            <Card className="flex flex-col p-5 sm:p-6">
              <h2 className="font-heading text-xl font-semibold leading-snug">Selected days</h2>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">Choose dates you want to release to colleagues.</p>
              {selectedDates.length > 0 ? <div className="mb-6 grid gap-3">
                {selectedDates.map((date, index) => <div key={date} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted p-3.5">
                  <div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">✓</span><span className="text-sm font-medium">{formatLongDate(date)}</span></div>
                  <span className="font-mono text-xs text-muted-foreground">{selectedReleases[index]?.area ?? profile?.parking.assignedFloor ?? "Floor 2"}</span>
                </div>)}
              </div> : <p className="mb-6 text-sm text-muted-foreground">No days selected.</p>}
              <Button className="w-full" disabled={selectedDates.length === 0 || pending} onClick={() => { void submitReleaseDates(); }}>
                {pending ? "Saving…" : selectedDates.length === 2 ? "Release 2 selected days" : selectedDates.length > 0 ? `Release ${selectedDates.length} selected days` : "Release selected days"}
              </Button>
            </Card>
          </aside>
        </div>

        <Card className="p-5 sm:p-6">
          <div className="mb-4"><h2 className="font-heading text-xl font-semibold">Your releases</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead><tr className="h-11 border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">DATE</th><th className="px-3 py-2">STATUS</th><th className="px-3 py-2">CREATED BY</th><th className="px-3 py-2">LAST CHANGED</th><th className="px-3 py-2 text-right">ACTION</th>
              </tr></thead>
              <tbody className="text-foreground">
                {releases.map((release) => <tr key={release.id} className="h-11 border-b last:border-b-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-3 py-2 font-mono font-medium">{formatShortDate(release.date)}</td>
                  <td className="px-3 py-2"><StatusBadge tone={release.status === "Released" ? "ok" : release.status === "Claimed" ? "warn" : "neutral"}>{release.status}</StatusBadge></td>
                  <td className="min-w-40 px-3 py-2">{release.createdBy}<span className="ml-2 whitespace-nowrap font-mono text-xs text-muted-foreground">{formatTimestamp(release.createdAt)}</span></td>
                  <td className="min-w-40 px-3 py-2">{release.lastChangedBy}<span className="ml-2 whitespace-nowrap font-mono text-xs text-muted-foreground">{formatTimestamp(release.lastChangedAt)}</span></td>
                  <td className="px-3 py-2 text-right"><Button variant="link" className="h-auto whitespace-nowrap p-0 text-sm" onClick={() => { setConfirmRelease(release); }}>Cancel release</Button></td>
                </tr>)}
                {releases.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No releases scheduled.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </>}

      <Dialog open={Boolean(confirmRelease)} onOpenChange={(open) => { if (!open && !pending) setConfirmRelease(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cancel this release?</DialogTitle><DialogDescription>{releaseForConfirmation ? `Cancel the release for ${formatLongDate(releaseForConfirmation.date)}?` : "This will return the release to your space."}</DialogDescription></DialogHeader>
          {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirmRelease(null)}>Keep release</Button>
            <Button type="button" disabled={pending} onClick={() => { void confirmCancellation(); }}>{pending ? "Cancelling…" : "Cancel release"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
