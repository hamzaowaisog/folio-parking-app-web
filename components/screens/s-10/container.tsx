"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, CarFront, RefreshCw, UserRound } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { listUnusedParking } from "@/lib/api/client";
import type { ListUnusedParkingCategory, UnusedParkingRecord } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNav } from "@/lib/nav";

type CategoryFilter = "All" | ListUnusedParkingCategory;

// The last nine days, ending today.
const defaultDateTo = toDateValue(new Date())!;
const defaultDateFrom = toDateValue(new Date(Date.now() - 8 * 86_400_000))!;
const loadError = "We couldn't load unused spaces. Try again.";
const accessError = "You do not have access to this page.";
const filterItems = [
  { value: "All", label: "All" },
  { value: "Dedicated", label: "Dedicated" },
  { value: "Temporary", label: "Temporary" },
];

const sampleRecords: UnusedParkingRecord[] = [
  { id: 7001, category: "Unused Dedicated Parking", employee: "Daniyal Sheikh", vehicle: "Black Honda Civic APD-208", date: "2025-10-13" },
  { id: 7002, category: "Unused Temporary Parking", employee: "Bilal Ahmed", vehicle: "Blue Suzuki Alto LEB-554", date: "2025-10-13" },
  { id: 7003, category: "Unused Dedicated Parking", employee: "Mariam Farooq", vehicle: "Blue Toyota Yaris LZR-771", date: "2025-10-10" },
  { id: 7004, category: "Unused Dedicated Parking", employee: "Sana Raza", vehicle: "Silver Suzuki Swift KLM-305", date: "2025-10-09" },
  { id: 7005, category: "Unused Temporary Parking", employee: "Hamza Qureshi", vehicle: "Red Kia Sportage SNP-640", date: "2025-10-08" },
  { id: 7006, category: "Unused Temporary Parking", employee: "Bilal Ahmed", vehicle: "Grey Toyota Corolla AWC-917", date: "2025-10-07" },
  { id: 7007, category: "Unused Dedicated Parking", employee: "Ayesha Malik", vehicle: "White Honda City BKT-482", date: "2025-10-06" },
];

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function fixtureCategory(fixture?: string): CategoryFilter {
  return inFixture(fixture, "temporary") ? "Temporary" : inFixture(fixture, "dedicated") ? "Dedicated" : "All";
}

function filterRecords(records: UnusedParkingRecord[], category: CategoryFilter): UnusedParkingRecord[] {
  if (category === "All") return records;
  const label = category === "Dedicated" ? "Unused Dedicated Parking" : "Unused Temporary Parking";
  return records.filter((record) => record.category === label);
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateValue(value?: Date): string | undefined {
  if (!value) return undefined;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string, includeYear = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`)).replace(",", "");
}

function displayRange(from: string, to: string): string {
  return `${displayDate(from)} – ${displayDate(to)} ${to.slice(0, 4)}`;
}

function recordsForCategory(fixture: string | undefined, category: CategoryFilter): UnusedParkingRecord[] {
  const records = fixture && inFixture(fixture, "filtered")
    ? filterRecords(sampleRecords, fixtureCategory(fixture))
    : sampleRecords;
  return filterRecords(records, category);
}

function RecordsSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Employee</TableHead><TableHead>Vehicle</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
        <TableBody>{[0, 1, 2, 3, 4].map((row) => <TableRow key={row}>
          {[0, 1, 2, 3].map((cell) => <TableCell key={cell}><Skeleton className={cell === 0 ? "h-5 w-36" : "h-5 w-32"} /></TableCell>)}
        </TableRow>)}</TableBody>
      </Table>
    </Card>
  );
}

function EmptyBay() {
  return (
    <div className="grid justify-items-center gap-3 px-4 py-8 text-center">
      <div role="img" aria-label="Empty bay" className="relative flex h-36 w-56 items-end justify-center overflow-hidden rounded-lg border bg-muted p-4">
        <span aria-hidden="true" className="absolute inset-x-5 bottom-6 border-t border-dashed border-border-strong" />
        <span aria-hidden="true" className="absolute bottom-8 left-8 h-16 w-2 rotate-12 rounded bg-border-strong" />
        <span aria-hidden="true" className="absolute bottom-8 right-8 h-16 w-2 -rotate-12 rounded bg-border-strong" />
        <CarFront aria-hidden="true" className="relative z-10 mb-1 size-12 stroke-1 text-muted-foreground" />
      </div>
      <h2 className="font-heading text-lg font-semibold">No unused spaces in these dates</h2>
    </div>
  );
}

export function UnusedSpacesContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureEmpty = inFixture(fixture, "empty");
  const fixtureFiltered = inFixture(fixture, "filtered");
  const initialFilter = fixtureFiltered ? fixtureCategory(fixture) : "All";
  const initialRecords = isFixture && !fixtureLoading && !fixtureError && !fixtureEmpty
    ? recordsForCategory(fixture, initialFilter)
    : [];
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(initialFilter);
  const [records, setRecords] = useState<UnusedParkingRecord[]>(initialRecords);
  const [allRecords, setAllRecords] = useState<UnusedParkingRecord[]>(isFixture ? sampleRecords : []);
  const [total, setTotal] = useState(initialRecords.length);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({ from: parseDate(defaultDateFrom), to: parseDate(defaultDateTo) });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? loadError : "");
  const [accessRefused, setAccessRefused] = useState("");
  const [fixtureResolved, setFixtureResolved] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const requestId = useRef(0);
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;

  const loadRecords = useCallback(async (category: CategoryFilter, from: string, to: string) => {
    const request = ++requestId.current;
    setLoading(true);
    setPageError("");
    setAccessRefused("");
    try {
      const token = getAccessToken();
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const params = { ...(category === "All" ? {} : { category }), dateFrom: from, dateTo: to };
      const response = await listUnusedParking(params, options);
      if (request !== requestId.current) return;
      if (response.status === 200) {
        setRecords(response.data.records);
        setTotal(response.data.total);
        if (category === "All") setAllRecords(response.data.records);
      } else if (response.status === 403) {
        setRecords([]);
        setTotal(0);
        setAccessRefused(response.data.message || accessError);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else {
        setRecords([]);
        setTotal(0);
        setPageError(loadError);
      }
    } catch {
      if (request === requestId.current) {
        setRecords([]);
        setTotal(0);
        setPageError(loadError);
      }
    } finally {
      if (request === requestId.current) {
        setLoading(false);
        setRetrying(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isFixture) void loadRecords("All", defaultDateFrom, defaultDateTo);
  }, [isFixture, loadRecords]);

  const dedicatedCount = allRecords.filter((record) => record.category === "Unused Dedicated Parking").length;
  const temporaryCount = allRecords.filter((record) => record.category === "Unused Temporary Parking").length;
  const empty = !loading && !pageError && !accessRefused && (fixtureEmpty && !fixtureResolved || records.length === 0);
  const screenState = fixtureResolved ? "default" : fixture ?? (loading ? "loading" : pageError ? "error" : accessRefused ? "access-refused" : empty ? "empty" : activeFilter === "All" ? "default" : "filtered");

  function selectFilter(value: string) {
    const category = value as CategoryFilter;
    setActiveFilter(category);
    if (isFixture) {
      const nextRecords = filterRecords(allRecords, category);
      setRecords(nextRecords);
      setTotal(nextRecords.length);
      setPageError("");
      setFixtureResolved(true);
      return;
    }
    void loadRecords(category, dateFrom, dateTo);
  }

  function changeDateRange(range?: DateRange) {
    setCalendarRange(range);
    if (!range?.from || !range.to) return;
    const from = toDateValue(range.from);
    const to = toDateValue(range.to);
    if (!from || !to) return;
    setDateFrom(from);
    setDateTo(to);
    setCalendarOpen(false);
    if (isFixture) {
      const nextRecords = filterRecords(sampleRecords, activeFilter);
      setRecords(nextRecords);
      setTotal(nextRecords.length);
      setFixtureResolved(true);
      return;
    }
    void loadRecords(activeFilter, from, to);
  }

  function clearFilters() {
    setActiveFilter("All");
    setDateFrom(defaultDateFrom);
    setDateTo(defaultDateTo);
    setCalendarRange({ from: parseDate(defaultDateFrom), to: parseDate(defaultDateTo) });
    setPageError("");
    setAccessRefused("");
    setFixtureResolved(true);
    if (isFixture) {
      setRecords(sampleRecords);
      setAllRecords(sampleRecords);
      setTotal(sampleRecords.length);
      setLoading(false);
      return;
    }
    void loadRecords("All", defaultDateFrom, defaultDateTo);
  }

  function retry() {
    setRetrying(true);
    setFixtureResolved(true);
    if (isFixture) {
      setRecords(sampleRecords);
      setAllRecords(sampleRecords);
      setTotal(sampleRecords.length);
      setPageError("");
      setLoading(false);
      setRetrying(false);
      return;
    }
    void loadRecords(activeFilter, dateFrom, dateTo);
  }

  return (
    <main data-screen="S-10" data-state={screenState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="mb-2 font-heading text-3xl font-semibold tracking-tight">Unused spaces</h1>
        {!accessRefused && !pageError && !fixtureEmpty && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className="font-heading text-xl font-semibold tracking-tight">{total} unused spaces since {displayDate(dateFrom)}</h2>
            <p className="text-sm text-muted-foreground">
              {activeFilter === "All" ? `${dedicatedCount} dedicated · ${temporaryCount} temporary` : `${total} ${activeFilter.toLowerCase()}`}
            </p>
          </div>
        )}
      </header>

      {loading ? <RecordsSkeleton /> : pageError ? (
        <Notice tone="bad">
          <RefreshCw />
          <NoticeTitle>{pageError}</NoticeTitle>
          <NoticeDescription><Button variant="outline" size="sm" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
        </Notice>
      ) : accessRefused ? (
        <Notice tone="bad"><NoticeTitle>{accessRefused}</NoticeTitle></Notice>
      ) : empty ? (
        <Card className="grid justify-items-center gap-3 p-4 sm:p-6">
          <EmptyBay />
          <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between font-mono">
                  <CalendarDays aria-hidden="true" />
                  {displayRange(dateFrom, dateTo)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={calendarRange} onSelect={changeDateRange} defaultMonth={calendarRange?.from} />
              </PopoverContent>
            </Popover>
            <Segmented items={filterItems} value={activeFilter} onChange={selectFilter} label="Filter unused spaces" className="self-start sm:self-auto" />
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead>Employee</TableHead><TableHead>Vehicle</TableHead><TableHead>Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>{records.map((record) => {
                const vehicleParts = record.vehicle.split(" ");
                const plate = vehicleParts.pop() ?? record.vehicle;
                const vehicleName = vehicleParts.join(" ");
                const initials = record.employee.split(" ").map((part) => part[0]).join("").slice(0, 2);
                return (
                  <TableRow key={record.id}>
                    <TableCell><StatusBadge tone={record.category === "Unused Dedicated Parking" ? "brand" : "info"}>{record.category}</StatusBadge></TableCell>
                    <TableCell>
                      <span className="flex items-center gap-3 font-medium">
                        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{initials || <UserRound className="size-4" />}</span>
                        {record.employee}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-3" aria-label={record.vehicle}>
                        <CarFront aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                        <span>{vehicleName} <span className="font-mono">{plate}</span><span aria-hidden="true" className="sr-only">{record.vehicle}</span></span>
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">{record.date}</TableCell>
                  </TableRow>
                );
              })}</TableBody>
            </Table>
            <div className="flex min-h-11 flex-col items-start justify-between gap-1 border-t px-4 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
              <span>{activeFilter === "All" ? "Showing records across all categories" : `Showing ${activeFilter.toLowerCase()} records`}</span>
              <span className="font-mono font-medium text-foreground">{total} records</span>
            </div>
          </Card>
        </>
      )}
    </main>
  );
}
