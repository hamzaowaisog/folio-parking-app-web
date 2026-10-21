"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, CarFront, RefreshCw } from "lucide-react";
import { getLiveGateEvents } from "@/lib/api/client";
import type { GateFeed, Verification } from "@/lib/api/client.schemas";
import { clearAccessToken, getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, toneOf } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/lib/nav";

const unavailableMessage = "Verification isn't available right now.";
const cameraError = "The camera feed isn't available.";

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function sampleVerification(
  id: number,
  plate: string,
  driver: string,
  time: string,
  result: Verification["result"],
  entryStatus: string,
  indicatorState: Verification["indicatorState"],
  reason: string,
  permanentSticker = false,
): Verification {
  return {
    id,
    plate,
    driver,
    date: "2025-10-14",
    time,
    result,
    entryStatus,
    indicatorState,
    reason,
    permanentSticker,
  };
}

function fixtureFeed(fixture?: string): GateFeed | null {
  if (inFixture(fixture, "loading") || inFixture(fixture, "error")) return null;
  if (inFixture(fixture, "waiting")) return { cameraStatus: "online", events: [] };

  const authorized = sampleVerification(9001, "AWC-917", "Bilal Ahmed", "10:16", "Authorised", "Entry allowed", "green", "Valid temporary authorisation today");
  const noAuthorization = sampleVerification(9002, "LXA-093", "Not registered", "09:58", "Denied", "Denied", "off", "No valid authorisation today");
  const hamza = sampleVerification(9003, "SNP-640", "Hamza Qureshi", "09:52", "Authorised", "Entry allowed", "green", "Valid temporary authorisation today");
  const permanentSticker = sampleVerification(9004, "KLM-305", "Sana Raza", "09:21", "Existing process", "Existing process", "not used", "Permanent sticker. Use the existing process.", true);
  const unavailable = sampleVerification(9005, "KDR-418", "Not registered", "09:07", "Denied", "Entry denied", "off", unavailableMessage);
  const mariam = sampleVerification(9006, "LZR-771", "Mariam Farooq", "08:44", "Existing process", "Existing process", "not used", "Permanent sticker. Use the existing process.", true);

  if (inFixture(fixture, "permanent-sticker")) return { cameraStatus: "online", events: [permanentSticker, authorized, noAuthorization, hamza, unavailable, mariam] };
  if (inFixture(fixture, "verification-unavailable")) return { cameraStatus: "online", events: [unavailable, authorized, noAuthorization, hamza, permanentSticker, mariam] };
  if (inFixture(fixture, "no-valid-authorisation") || inFixture(fixture, "no-valid-authorization")) return { cameraStatus: "online", events: [noAuthorization, authorized, hamza, permanentSticker, unavailable, mariam] };
  return { cameraStatus: "online", events: [authorized, noAuthorization, hamza, permanentSticker, unavailable, mariam] };
}

function resultTone(result: string): "bad" | "ok" | "info" {
  if (result === "Denied") return "bad";
  if (result === "Authorised") return "ok";
  return "info";
}

function Indicator({ state }: { state: Verification["indicatorState"] }) {
  const isGreen = state === "green";
  const label = isGreen ? "Indicator on" : state === "off" ? "Indicator off" : "Indicator not used";
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-3 rounded-full ${isGreen ? "bg-success" : "bg-muted-foreground"}`} />
      <span className="text-sm font-medium">{label}</span>
      <StatusBadge tone={isGreen ? "ok" : "neutral"} className="font-mono">{state}</StatusBadge>
    </div>
  );
}

function GateSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="overflow-hidden"><Skeleton className="aspect-video w-full rounded-none" /><div className="p-4"><Skeleton className="h-5 w-36" /></div></Card>
        <Card className="grid content-start gap-5 p-6"><Skeleton className="h-8 w-32" /><Skeleton className="h-7 w-48" /><Skeleton className="h-20 w-full" /></Card>
      </div>
      <Card className="p-5"><Skeleton className="mb-5 h-6 w-40" /><div className="grid gap-3">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-10 w-full" />)}</div></Card>
    </div>
  );
}

export function GateTue14OctLiveContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureIsError = inFixture(fixture, "loading") || inFixture(fixture, "error");
  const [feed, setFeed] = useState<GateFeed | null>(() => isFixture ? fixtureFeed(fixture) : null);
  const [loading, setLoading] = useState(!isFixture);
  const [pageError, setPageError] = useState(fixtureIsError ? cameraError : "");
  const [verificationUnavailable, setVerificationUnavailable] = useState(inFixture(fixture, "verification-unavailable"));
  const [retrying, setRetrying] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setPageError("");
    setVerificationUnavailable(false);
    try {
      const token = getAccessToken();
      const response = await getLiveGateEvents(undefined, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (response.status === 200) {
        setFeed(response.data);
        if (response.data.cameraStatus === "unavailable") {
          setVerificationUnavailable(true);
          setPageError(cameraError);
        }
      } else if (response.status === 503) {
        setFeed(null);
        setVerificationUnavailable(true);
        setPageError(unavailableMessage);
      } else {
        setFeed(null);
        setPageError(cameraError);
      }
    } catch {
      setFeed(null);
      setPageError(cameraError);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    if (!isFixture) void loadFeed();
  }, [isFixture, loadFeed]);

  const unavailableEvent = sampleVerification(9100, "KDR-418", "Not registered", "Now", "Denied", "Denied", "off", unavailableMessage);
  const unavailable = verificationUnavailable || pageError === unavailableMessage || feed?.cameraStatus === "unavailable";
  // while the camera is unavailable an earlier event is stale: its green light must not show as if it were live (review R-3)
  const currentEvent = unavailable ? unavailableEvent : feed?.events[0] ?? null;
  const waiting = !currentEvent && !pageError && !loading;

  function retry() {
    if (isFixture) return;
    setRetrying(true);
    void loadFeed();
  }

  return (
    <>
      <main data-screen="S-7" data-state={fixture ?? (loading ? "loading" : pageError ? "error" : waiting ? "waiting" : "default")} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="flex flex-wrap items-center gap-x-4 gap-y-2 font-heading text-3xl font-semibold tracking-tight">
            Gate
            <span className="inline-flex items-center gap-2 text-base font-normal text-muted-foreground">
              <span aria-hidden="true" className="size-2 rounded-full bg-success" />{new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · live
            </span>
          </h1>
          <Link to="/sign-in" onClick={() => clearAccessToken()} className="text-sm font-medium text-primary hover:underline">Sign out</Link>
        </div>

        {loading ? <GateSkeleton /> : (
          <div className="grid gap-6">
            <div className="grid items-stretch gap-5 md:grid-cols-2">
              <Card className="overflow-hidden">
                <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted">
                  {currentEvent ? (
                    <div className="grid justify-items-center gap-3 text-muted-foreground">
                      <Camera className="size-14" strokeWidth={1.25} />
                      <span className="text-xs font-medium tracking-widest">LIVE CAMERA</span>
                    </div>
                  ) : (
                    <div className="grid justify-items-center gap-3 text-muted-foreground">
                      <CarFront className="size-16" strokeWidth={1.25} />
                      <span className="text-sm">Waiting for the next vehicle</span>
                    </div>
                  )}
                  {currentEvent && <span aria-label={`Detected plate ${currentEvent.plate}`} className="absolute bottom-4 left-4 h-8 w-28 rounded border-2 border-primary" />}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                  <span className="text-sm text-muted-foreground">{currentEvent ? `Camera 1 · ${currentEvent.time}` : "Camera 1"}</span>
                  <StatusBadge tone={pageError || feed?.cameraStatus === "unavailable" ? "bad" : "brand"}>
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${pageError || feed?.cameraStatus === "unavailable" ? "bg-destructive" : "bg-primary"}`} />
                    {pageError || feed?.cameraStatus === "unavailable" ? "FEED UNAVAILABLE" : "LIVE FEED"}
                  </StatusBadge>
                </div>
                {pageError && <div className="border-t p-4">
                  {pageError !== currentEvent?.reason && <Notice tone="bad">
                    <RefreshCw />
                    <NoticeTitle>{pageError}</NoticeTitle>
                    {unavailable && <NoticeDescription>Deny entry until verification is restored.</NoticeDescription>}
                  </Notice>}
                  <Button variant="outline" size="sm" className="mt-3" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry"}</Button>
                </div>}
              </Card>

              <Card className="grid content-start gap-5 p-5 sm:p-6">
                {currentEvent ? <>
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-md border bg-muted px-3 py-1.5 font-mono text-lg font-semibold tracking-wide">{currentEvent.plate}</span>
                      <Indicator state={currentEvent.indicatorState} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={resultTone(currentEvent.result)}>{currentEvent.result}</StatusBadge>
                    </div>
                    <h2 className="font-heading text-2xl font-semibold tracking-tight">
                      {currentEvent.permanentSticker ? "Permanent sticker" : currentEvent.result === "Denied" ? "Entry denied" : currentEvent.result === "Authorised" ? "Authorised for today" : currentEvent.result}
                    </h2>
                    <p className="text-sm text-text-secondary">{currentEvent.reason}</p>
                    {unavailable && <Notice tone="warn"><NoticeDescription>Deny entry until verification is restored.</NoticeDescription></Notice>}
                  </div>
                  <div className="grid gap-3 border-t pt-4 text-sm">
                    <div className="flex flex-wrap gap-2"><span className="text-muted-foreground">Entry status:</span><span className="font-medium">{currentEvent.entryStatus}</span></div>
                    <div className="flex flex-wrap gap-2"><span className="text-muted-foreground">Driver:</span><span className="font-medium">{currentEvent.driver}</span></div>
                    <div className="flex flex-wrap gap-2"><span className="text-muted-foreground">Time:</span><span className="font-mono">{currentEvent.time}</span></div>
                  </div>
                </> : <div className="grid min-h-52 content-center justify-items-start gap-3">
                  <StatusBadge tone="neutral">Waiting</StatusBadge>
                  <h2 className="font-heading text-2xl font-semibold tracking-tight">Waiting for the next vehicle</h2>
                  <p className="text-sm text-muted-foreground">The gate is ready for the next check.</p>
                  <Indicator state="off" />
                </div>}
              </Card>
            </div>

            <section aria-labelledby="recent-checks-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="recent-checks-title" className="font-heading text-xl font-semibold tracking-tight">Recent checks</h2>
                <span className="text-sm text-muted-foreground">{feed?.events.length ?? 0} checks</span>
              </div>
              <Card className="overflow-hidden">
                {feed?.events.length ? <Table>
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead><TableHead>Crop</TableHead><TableHead>Plate</TableHead><TableHead>Driver</TableHead><TableHead>Result</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{feed.events.slice(currentEvent?.id === feed.events[0]?.id ? 1 : 0).map((event) => <TableRow key={event.id}>
                    <TableCell className="font-mono text-sm">{event.time}</TableCell>
                    <TableCell><span aria-label={`Crop for ${event.plate}`} className="flex h-8 w-20 items-center justify-center rounded border bg-muted font-mono text-xs">{event.plate}</span></TableCell>
                    <TableCell className="font-mono font-medium">{event.plate}</TableCell>
                    <TableCell>{event.driver}</TableCell>
                    <TableCell><StatusBadge tone={toneOf(event.result)}>{event.result}</StatusBadge></TableCell>
                  </TableRow>)}</TableBody>
                </Table> : <div className="grid min-h-32 place-items-center p-6 text-sm text-muted-foreground">No entry checks yet</div>}
              </Card>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
