"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { getParkingReport } from "@/lib/api/client";
import type { GetParkingReportPeriod, Report, ReportRow, ReportStatistics } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNav } from "@/lib/nav";

type ReportsByPeriod = Record<GetParkingReportPeriod, Report>;

// The last nine days, ending today.
const defaultDateTo = toDateValue(new Date())!;
const defaultDateFrom = toDateValue(new Date(Date.now() - 8 * 86_400_000))!;
const loadError = "We couldn't load the report. Try again.";
const accessError = "You do not have access to this page.";
const periods = ["daily", "weekly"] as const;

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function reportRow(date: string, week: string, spacesReleased: number, temporaryClaims: number, utilizationPercent: number): ReportRow {
  return { date, week, spacesReleased, temporaryClaims, utilizationPercent };
}

function sampleReports(): ReportsByPeriod {
  const dailyRows = [
    reportRow("2025-10-06", "Week of 6 Oct", 8, 6, 81.7),
    reportRow("2025-10-07", "Week of 6 Oct", 10, 8, 85.0),
    reportRow("2025-10-08", "Week of 6 Oct", 7, 7, 88.3),
    reportRow("2025-10-09", "Week of 6 Oct", 9, 7, 83.3),
    reportRow("2025-10-10", "Week of 6 Oct", 11, 7, 75.0),
    reportRow("2025-10-13", "Week of 13 Oct", 9, 7, 83.3),
    reportRow("2025-10-14", "Week of 13 Oct", 8, 4, 78.3),
  ];
  const weeklyRows = [
    reportRow("2025-10-06", "Week of 6 Oct", 45, 35, 83.0),
    reportRow("2025-10-13", "Week of 13 Oct", 17, 11, 80.8),
  ];
  const dailyStatistics: ReportStatistics = { releasedSpaces: 8, temporaryClaims: 4, utilizationPercent: 78.3 };
  const weeklyStatistics: ReportStatistics = { releasedSpaces: 62, temporaryClaims: 46, utilizationPercent: 82.4 };
  return {
    daily: { period: "daily", rows: dailyRows, dailyStatistics, weeklyStatistics },
    weekly: { period: "weekly", rows: weeklyRows, dailyStatistics, weeklyStatistics },
  };
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

function displayDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

function displayRange(from: string, to: string): string {
  const endYear = to.slice(0, 4);
  return `${displayDate(from)} – ${displayDate(to)} ${endYear}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function barHeight(value: number): string {
  if (value >= 87) return "h-40";
  if (value >= 83) return "h-36";
  if (value >= 79) return "h-32";
  if (value >= 75) return "h-28";
  return "h-24";
}

function Chart({ rows, period }: { rows: ReportRow[]; period: GetParkingReportPeriod }) {
  return (
    <div className="pt-6">
      <div className={`grid ${period === "weekly" ? "grid-cols-2" : "grid-cols-7"} items-end gap-2 border-b pb-2 sm:gap-4`}>
        {rows.map((row, index) => (
          <div key={`${row.date}-${index}`} className="flex min-w-0 flex-col items-center justify-end">
            <span className="mb-2 font-mono text-xs font-medium">{formatPercent(row.utilizationPercent)}</span>
            <div aria-hidden="true" className={`w-full max-w-10 rounded-t-md ${barHeight(row.utilizationPercent)} ${index === rows.length - 1 ? "bg-primary" : "bg-secondary"}`} />
          </div>
        ))}
      </div>
      <div className={`grid ${period === "weekly" ? "grid-cols-2" : "grid-cols-7"} gap-2 pt-2 text-center text-xs text-muted-foreground sm:gap-4`}>
        {rows.map((row, index) => (
          <span key={`${row.date}-label-${index}`} className="truncate">{period === "weekly" ? row.week : displayDate(row.date)}</span>
        ))}
      </div>
    </div>
  );
}

function StatisticsTable({ title, description, rows, rawDates }: { title: string; description: string; rows: ReportRow[]; rawDates: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Spaces released</TableHead>
              <TableHead>Temporary claims</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
              <TableHead>Week</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${row.date}-${index}`}>
                <TableCell className={`whitespace-nowrap font-medium ${rawDates ? "font-mono" : ""}`}>{rawDates ? row.date : displayDate(row.date)}</TableCell>
                <TableCell className="font-mono">{row.spacesReleased}</TableCell>
                <TableCell className="font-mono">{row.temporaryClaims}</TableCell>
                <TableCell className="whitespace-nowrap text-right font-mono font-medium">{formatPercent(row.utilizationPercent)}</TableCell>
                <TableCell className="whitespace-nowrap">{row.week}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function ReportsSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="grid gap-5 p-6 lg:col-span-5"><Skeleton className="h-6 w-36" /><Skeleton className="h-40 w-full" /></Card>
        <Card className="grid gap-5 p-6 lg:col-span-7"><Skeleton className="h-6 w-44" /><Skeleton className="h-48 w-full" /></Card>
      </div>
      <Card className="grid gap-3 p-6"><Skeleton className="h-6 w-40" />{[0, 1, 2, 3, 4].map((row) => <Skeleton key={row} className="h-10 w-full" />)}</Card>
    </div>
  );
}

function EmptyReport() {
  return (
    <div className="grid justify-items-center gap-3 px-4 py-12 text-center">
      <div role="img" aria-label="Empty chart" className="flex h-36 w-56 items-end justify-center gap-3 rounded-lg border bg-muted px-6 pb-5">
        <span aria-hidden="true" className="h-8 w-8 rounded-t bg-border-strong" />
        <span aria-hidden="true" className="h-14 w-8 rounded-t bg-border-strong" />
        <span aria-hidden="true" className="h-10 w-8 rounded-t bg-border-strong" />
      </div>
      <h2 className="font-heading text-lg font-semibold">No report data for these dates</h2>
    </div>
  );
}

export function ReportsContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureEmpty = inFixture(fixture, "empty");
  const fixtureWeekly = inFixture(fixture, "weekly");
  const [activePeriod, setActivePeriod] = useState<GetParkingReportPeriod>(fixtureWeekly ? "weekly" : "daily");
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({ from: parseDate(defaultDateFrom), to: parseDate(defaultDateTo) });
  const [reports, setReports] = useState<ReportsByPeriod | null>(() => isFixture && !fixtureLoading && !fixtureError && !fixtureEmpty ? sampleReports() : null);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? loadError : "");
  const [accessRefused, setAccessRefused] = useState("");
  const [exportMessage, setExportMessage] = useState(inFixture(fixture, "export-done") ? `report-${defaultDateFrom}-to-${defaultDateTo}.csv downloaded` : "");
  const [fixtureResolved, setFixtureResolved] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const requestId = useRef(0);
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;

  const loadReports = useCallback(async (period?: GetParkingReportPeriod, from = dateFrom, to = dateTo) => {
    const request = ++requestId.current;
    setLoading(true);
    setPageError("");
    setAccessRefused("");
    setExportMessage("");
    try {
      const token = getAccessToken();
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const requestedPeriods = period ? [period] : periods;
      const responses = await Promise.all(requestedPeriods.map((reportPeriod) => getParkingReport({ period: reportPeriod, dateFrom: from, dateTo: to }, options)));
      if (request !== requestId.current) return;
      const refused = responses.find((response) => response.status === 403);
      if (refused && refused.status === 403) {
        setReports(null);
        setAccessRefused(refused.data.message || accessError);
        return;
      }
      const unauthorized = responses.find((response) => response.status === 401);
      if (unauthorized && unauthorized.status === 401) {
        setReports(null);
        navigate.current("/sign-in");
        return;
      }
      if (responses.some((response) => response.status !== 200)) {
        setReports(null);
        setPageError(loadError);
        return;
      }
      setReports((previous) => {
        const next = { ...(previous ?? {}) } as ReportsByPeriod;
        responses.forEach((response, index) => {
          const reportPeriod = requestedPeriods[index];
          if (response.status === 200) next[reportPeriod] = response.data;
        });
        return next;
      });
    } catch {
      if (request === requestId.current) {
        setReports(null);
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
    if (!isFixture) void loadReports(undefined, defaultDateFrom, defaultDateTo);
  }, [isFixture, loadReports]);

  const daily = reports?.daily;
  const weekly = reports?.weekly;
  const currentReport = reports?.[activePeriod];
  const summaryReport = currentReport ?? daily;
  const currentRows = currentReport?.rows ?? [];
  const empty = !loading && !pageError && !accessRefused && (fixtureEmpty && !fixtureResolved || currentRows.length === 0);
  const screenState = fixtureResolved ? "default" : fixture ?? (loading ? "loading" : pageError ? "error" : accessRefused ? "access-refused" : empty ? "empty" : activePeriod === "weekly" ? "weekly" : "default");

  function changePeriod(value: string) {
    const nextPeriod = value as GetParkingReportPeriod;
    setActivePeriod(nextPeriod);
    setFixtureResolved(isFixture);
    if (!isFixture) void loadReports(nextPeriod, dateFrom, dateTo);
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
    setFixtureResolved(isFixture);
    if (isFixture) {
      setReports(sampleReports());
      setActivePeriod("daily");
      return;
    }
    void loadReports(undefined, from, to);
  }

  function clearFilters() {
    setDateFrom(defaultDateFrom);
    setDateTo(defaultDateTo);
    setCalendarRange({ from: parseDate(defaultDateFrom), to: parseDate(defaultDateTo) });
    setActivePeriod("daily");
    setExportMessage("");
    setFixtureResolved(true);
    setPageError("");
    setAccessRefused("");
    if (isFixture) {
      setReports(sampleReports());
      setLoading(false);
      return;
    }
    void loadReports(undefined, defaultDateFrom, defaultDateTo);
  }

  function retry() {
    setRetrying(true);
    setFixtureResolved(true);
    setActivePeriod("daily");
    if (isFixture) {
      setReports(sampleReports());
      setPageError("");
      setLoading(false);
      setRetrying(false);
      return;
    }
    void loadReports(undefined, dateFrom, dateTo);
  }

  function exportCsv() {
    if (!currentReport) return;
    const filename = `report-${dateFrom}-to-${dateTo}.csv`;
    const lines = [
      ["Date", "Spaces released", "Temporary claims", "Utilization", "Week"],
      ...currentRows.map((row) => [row.date, row.spacesReleased, row.temporaryClaims, row.utilizationPercent, row.week]),
    ];
    const csv = lines.map((line) => line.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExportMessage(`${filename} downloaded`);
  }

  return (
    <main data-screen="S-9" data-state={screenState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Reports</h1>
        {!empty && !pageError && !accessRefused && !loading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-sm text-muted-foreground">Exports what is shown</span>
            <Button onClick={exportCsv}>Export CSV</Button>
          </div>
        )}
      </header>

      {loading ? <ReportsSkeleton /> : pageError ? (
        <Notice tone="bad">
          <RefreshCw />
          <NoticeTitle>{pageError}</NoticeTitle>
          <NoticeDescription><Button variant="outline" size="sm" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
        </Notice>
      ) : accessRefused ? (
        <Notice tone="bad"><NoticeTitle>{accessRefused}</NoticeTitle></Notice>
      ) : empty ? (
        <Card className="grid justify-items-center gap-4 p-5 sm:p-8">
          <EmptyReport />
          <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
        </Card>
      ) : (
        <>
          <div className="mb-8 flex flex-col gap-4 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between font-mono">
                  {displayRange(dateFrom, dateTo)}
                  <CalendarDays aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={calendarRange} onSelect={changeDateRange} defaultMonth={calendarRange?.from} />
              </PopoverContent>
            </Popover>
            <Segmented
              label="Report period"
              items={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }]}
              value={activePeriod}
              onChange={changePeriod}
            />
          </div>

          {exportMessage && <p role="status" className="mb-6 text-sm font-medium text-success">{exportMessage}</p>}

          <div className="mb-8 grid gap-6 lg:grid-cols-12">
            <Card className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-5">
              <div className="border-b pb-4">
                <h2 className="text-sm font-medium text-muted-foreground">Today's Summary</h2>
              </div>
              <div className="flex flex-col items-center justify-around gap-6 py-5 sm:flex-row">
                <div className="flex flex-col items-center text-center">
                  <div className="flex size-36 items-center justify-center rounded-full border-8 border-primary/20 border-t-primary border-r-primary border-b-primary">
                    <span className="font-mono text-2xl font-semibold">{summaryReport ? formatPercent(summaryReport.dailyStatistics.utilizationPercent) : "—"}</span>
                  </div>
                  <div className="mt-3 text-sm font-medium">Utilization today, {displayDate(toDateValue(new Date())!)}</div>
                  <div className="mt-1 font-mono text-sm text-muted-foreground">{summaryReport?.dailyStatistics.releasedSpaces ?? "—"} spaces released</div>
                </div>
                <div className="grid gap-5">
                  <div className="grid gap-1">
                    <span className="text-sm text-muted-foreground">Spaces released today</span>
                    <span className="font-mono text-2xl font-medium leading-none">{summaryReport?.dailyStatistics.releasedSpaces ?? "—"}</span>
                  </div>
                  <div className="grid gap-1">
                    <span className="text-sm text-muted-foreground">Temporary claims today</span>
                    <span className="font-mono text-2xl font-medium leading-none">{summaryReport?.dailyStatistics.temporaryClaims ?? "—"}</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-2 border-t pt-4 text-sm">
                <span className="text-muted-foreground">Weekly statistics</span>
                <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono font-medium text-foreground">
                  <span>{summaryReport?.weeklyStatistics.releasedSpaces ?? "—"} spaces released</span>
                  <span>{summaryReport?.weeklyStatistics.temporaryClaims ?? "—"} temporary claims</span>
                  <span>{summaryReport ? formatPercent(summaryReport.weeklyStatistics.utilizationPercent) : "—"} utilization</span>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col justify-between p-5 sm:p-6 lg:col-span-7">
              <div className="flex flex-col gap-1 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-heading text-base font-semibold">Utilization by {activePeriod === "weekly" ? "week" : "day"}</h2>
                <span className="text-sm text-muted-foreground">Percentage of total capacity</span>
              </div>
              <Chart rows={currentRows} period={activePeriod} />
              <div className="flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
                <span>Peak utilization</span>
                <span className="font-mono font-medium text-foreground">{currentRows.length ? formatPercent(Math.max(...currentRows.map((row) => row.utilizationPercent))) : "—"}</span>
              </div>
            </Card>
          </div>

          <div className="grid gap-8">
            <StatisticsTable title="Daily statistics" description={`${daily?.rows.length ?? 0} recorded working days`} rows={daily?.rows ?? []} rawDates={activePeriod === "daily"} />
            <StatisticsTable title="Weekly statistics" description={`${weekly?.rows.length ?? 0} weekly periods`} rows={weekly?.rows ?? []} rawDates={activePeriod === "weekly"} />
          </div>
        </>
      )}
    </main>
  );
}
