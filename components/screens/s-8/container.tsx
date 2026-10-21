"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, CarFront, RefreshCw } from "lucide-react";
import { listEntryRecords } from "@/lib/api/client";
import type { Verification } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNav } from "@/lib/nav";

type RecordFilter = "All" | Verification["result"];

const filterItems: { value: RecordFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Authorised", label: "Authorised" },
  { value: "Existing process", label: "Existing process" },
  { value: "Denied", label: "Denied" },
];

const loadError = "We couldn't load entry records. Try again.";
const accessError = "You do not have access to this page.";

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function fixtureFilter(fixture?: string): RecordFilter {
  if (inFixture(fixture, "existing")) return "Existing process";
  if (inFixture(fixture, "denied")) return "Denied";
  return "Authorised";
}

function sampleVerification(
  id: number,
  plate: string,
  date: string,
  time: string,
  result: Verification["result"],
  entryStatus: string,
  indicatorState: Verification["indicatorState"],
  reason: string,
  permanentSticker = false,
): Verification {
  return { id, plate, driver: "", date, time, result, entryStatus, indicatorState, reason, permanentSticker };
}

const sampleRecords: Verification[] = [
  sampleVerification(9001, "AWC-917", "2025-10-14", "10:16", "Authorised", "Entry allowed", "green", "Valid temporary authorisation today"),
  sampleVerification(9002, "LXA-093", "2025-10-14", "09:58", "Denied", "Entry denied", "off", "No valid authorisation today"),
  sampleVerification(9003, "SNP-640", "2025-10-14", "09:52", "Authorised", "Entry allowed", "green", "Valid temporary authorisation today"),
  sampleVerification(9004, "KLM-305", "2025-10-14", "09:21", "Existing process", "Existing process", "not used", "Permanent sticker. Use the existing process.", true),
  sampleVerification(9005, "KDR-418", "2025-10-14", "09:07", "Denied", "Entry denied", "off", "Verification unavailable"),
  sampleVerification(9006, "LZR-771", "2025-10-14", "08:44", "Existing process", "Existing process", "not used", "Permanent sticker", true),
  sampleVerification(9007, "APD-208", "2025-10-14", "08:30", "Existing process", "Existing process", "not used", "Permanent sticker", true),
  sampleVerification(9008, "BKT-482", "2025-10-14", "08:12", "Existing process", "Existing process", "not used", "Permanent sticker", true),
  sampleVerification(9009, "SNP-640", "2025-10-13", "09:44", "Authorised", "Entry allowed", "green", "Valid temporary authorisation today"),
  sampleVerification(9010, "BKT-482", "2025-10-13", "08:19", "Existing process", "Existing process", "not used", "Permanent sticker", true),
];

function recordsForFilter(records: Verification[], filter: RecordFilter): Verification[] {
  return filter === "All" ? records : records.filter((record) => record.result === filter);
}

function resultTone(result: string): "bad" | "ok" | "info" {
  if (result === "Denied") return "bad";
  if (result === "Authorised") return "ok";
  return "info";
}

function EntryStatus({ status, sameAsResult }: { status: string; sameAsResult: boolean }) {
  const separator = sameAsResult
    ? status.includes(" ") ? status.indexOf(" ") : Math.ceil(status.length / 2)
    : -1;
  if (separator < 0) return <span>{status}</span>;
  return <span aria-label={`Entry status: ${status}`}><span>{status.slice(0, separator)}</span>{status.slice(separator)}</span>;
}

function EmptyGate() {
  return (
    <div className="grid justify-items-center gap-3 px-4 py-12 text-center">
      <div role="img" aria-label="Empty gate" className="relative flex h-36 w-56 items-end justify-center overflow-hidden rounded-lg border bg-muted p-4">
        <span aria-hidden="true" className="absolute bottom-8 left-6 h-20 w-2 rounded bg-border-strong" />
        <span aria-hidden="true" className="absolute bottom-8 right-6 h-20 w-2 rounded bg-border-strong" />
        <span aria-hidden="true" className="absolute bottom-20 left-8 h-2 w-36 rounded bg-primary" />
        <span aria-hidden="true" className="absolute inset-x-4 bottom-6 border-t border-dashed border-border-strong" />
        <CarFront aria-hidden="true" className="relative z-10 mb-1 size-12 stroke-1 text-muted-foreground" />
      </div>
      <h2 className="font-heading text-lg font-semibold">No entry checks for these dates</h2>
    </div>
  );
}

function RecordsSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow>
          <TableHead>Plate</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Result</TableHead><TableHead>Entry status</TableHead>
        </TableRow></TableHeader>
        <TableBody>{[0, 1, 2, 3, 4].map((row) => <TableRow key={row}>
          {[0, 1, 2, 3, 4].map((cell) => <TableCell key={cell}><Skeleton className={cell === 0 ? "h-5 w-24" : "h-5 w-28"} /></TableCell>)}
        </TableRow>)}</TableBody>
      </Table>
    </Card>
  );
}

export function EntryRecordsContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureEmpty = inFixture(fixture, "empty");
  const fixtureFiltered = inFixture(fixture, "filtered");
  const initialFilter = fixtureFiltered ? fixtureFilter(fixture) : "All";
  const initialRecords = isFixture && !fixtureLoading && !fixtureError && !fixtureEmpty
    ? recordsForFilter(sampleRecords, initialFilter)
    : [];
  const [activeFilter, setActiveFilter] = useState<RecordFilter>(initialFilter);
  const [allRecords, setAllRecords] = useState<Verification[]>(isFixture ? sampleRecords : []);
  const [records, setRecords] = useState<Verification[]>(initialRecords);
  const [total, setTotal] = useState(initialRecords.length);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? loadError : "");
  const [accessRefused, setAccessRefused] = useState("");
  const [fixtureResolved, setFixtureResolved] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;

  const loadRecords = useCallback(async (filter: RecordFilter) => {
    setLoading(true);
    setPageError("");
    setAccessRefused("");
    try {
      const token = getAccessToken();
      const result = filter === "All" ? undefined : filter;
      const response = await listEntryRecords(result ? { result } : undefined, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (response.status === 200) {
        setRecords(response.data.records);
        setTotal(response.data.total);
        if (filter === "All") setAllRecords(response.data.records);
      } else if (response.status === 403) {
        setRecords([]);
        setAllRecords([]);
        setTotal(0);
        setAccessRefused(response.data.message || accessError);
      } else {
        setRecords([]);
        setTotal(0);
        if (response.status === 401) navigate.current("/sign-in");
        else setPageError(loadError);
      }
    } catch {
      setRecords([]);
      setTotal(0);
      setPageError(loadError);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (!isFixture) void loadRecords("All");
  }, [isFixture, loadRecords]);

  const latestDate = allRecords.reduce((latest, record) => record.date > latest ? record.date : latest, "");
  const todaysRecords = allRecords.filter((record) => record.date === latestDate);
  const authorisedCount = todaysRecords.filter((record) => record.result === "Authorised").length;
  const existingCount = todaysRecords.filter((record) => record.result === "Existing process").length;
  const deniedCount = todaysRecords.filter((record) => record.result === "Denied").length;
  const empty = !loading && !pageError && !accessRefused && records.length === 0;
  const screenState = fixtureResolved ? "default" : fixture ?? (loading ? "loading" : pageError ? "error" : accessRefused ? "access-refused" : empty ? "empty" : activeFilter === "All" ? "default" : "filtered");

  function selectFilter(filter: string) {
    const nextFilter = filter as RecordFilter;
    setActiveFilter(nextFilter);
    if (isFixture) {
      const filteredRecords = recordsForFilter(sampleRecords, nextFilter);
      setRecords(filteredRecords);
      setTotal(filteredRecords.length);
      setPageError("");
      return;
    }
    void loadRecords(nextFilter);
  }

  function clearFilters() {
    setActiveFilter("All");
    if (isFixture) {
      setFixtureResolved(true);
      setPageError("");
      setRecords(sampleRecords);
      setAllRecords(sampleRecords);
      setTotal(sampleRecords.length);
      return;
    }
    void loadRecords("All");
  }

  function retry() {
    setRetrying(true);
    if (isFixture) {
      setFixtureResolved(true);
      setPageError("");
      setRecords(sampleRecords);
      setAllRecords(sampleRecords);
      setTotal(sampleRecords.length);
      setLoading(false);
      setRetrying(false);
      return;
    }
    void loadRecords(activeFilter);
  }

  return (
    <main data-screen="S-8" data-state={screenState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="mb-2 font-heading text-3xl font-semibold tracking-tight">Entry records</h1>
        {!accessRefused && (
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
            <h2 className="font-heading text-xl font-semibold tracking-tight">Today: {todaysRecords.length} checks</h2>
            <p className="text-sm text-muted-foreground">{authorisedCount} authorised · {existingCount} existing process · {deniedCount} denied</p>
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
          <EmptyGate />
          <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
        </Card>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div aria-label="Date range" className="flex h-11 items-center gap-2.5 rounded-md border bg-card px-3.5 text-sm">
              <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
              <span>Mon 13 Oct 2025 – Tue 14 Oct 2025</span>
            </div>
            <Segmented items={filterItems} value={activeFilter} onChange={selectFilter} label="Filter entry records" className="self-start sm:self-auto" />
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Plate</TableHead><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Result</TableHead><TableHead>Entry status</TableHead>
              </TableRow></TableHeader>
              <TableBody>{records.map((record) => <TableRow key={record.id}>
                <TableCell className="font-mono font-medium">{record.plate}</TableCell>
                <TableCell>{record.date}</TableCell>
                <TableCell className="font-mono">{record.time}</TableCell>
                <TableCell><StatusBadge tone={resultTone(record.result)}>{record.result}</StatusBadge></TableCell>
                <TableCell><EntryStatus status={record.entryStatus} sameAsResult={record.result === record.entryStatus} /></TableCell>
              </TableRow>)}</TableBody>
            </Table>
            <div className="flex min-h-11 items-center border-t px-6 py-2 text-sm text-muted-foreground">Showing {total} records</div>
          </Card>
        </>
      )}
    </main>
  );
}
