"use client";

// S-13 Admins (/admin/admins): administrator access, built with the approved screen and theme.
import { useCallback, useEffect, useRef, useState } from "react";
import { Fence, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { grantAdministratorAccess, listAdministrators, revokeAdministratorAccess, searchEmployeeDirectory } from "@/lib/api/client";
import type { Administrator, DirectoryEmployee } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNav } from "@/lib/nav";

const loadError = "We couldn't load the administrators. Try again.";
const accessError = "You don't have access to this page. Ask a parking administrator.";

const sampleAdministrators: Administrator[] = [
  { id: 1001, name: "Usman Tariq", email: "usman.tariq@folio3.com", accessStatus: "active" },
  { id: 1107, name: "Mariam Farooq", email: "mariam.farooq@folio3.com", accessStatus: "active" },
];

const sampleDirectory: DirectoryEmployee[] = [
  { id: 1201, name: "Daniyal Sheikh", email: "daniyal.sheikh@folio3.com" },
  { id: 1042, name: "Ayesha Malik", email: "ayesha.malik@folio3.com" },
  { id: 1063, name: "Sana Raza", email: "sana.raza@folio3.com" },
];

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function requestOptions(): RequestInit | undefined {
  const token = getAccessToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

function AdminsSkeleton() {
  return (
    <Card aria-label="Loading administrators" className="divide-y overflow-hidden">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="grid min-w-0 gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </Card>
  );
}

function ClosedGatePanel() {
  return (
    <Card className="grid justify-items-center gap-3 p-6 text-center sm:p-8">
      <div role="img" aria-label="Closed gate illustration" className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Fence aria-hidden="true" className="size-10 stroke-1" />
      </div>
      <h2 className="font-heading text-lg font-semibold">You don't have access to this page. Ask a parking administrator.</h2>
    </Card>
  );
}

export function AdminsContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureDenied = inFixture(fixture, "access-refused") || inFixture(fixture, "access refused");
  const fixtureGranted = inFixture(fixture, "access-granted") || inFixture(fixture, "access granted");
  const fixtureRemoved = inFixture(fixture, "access-removed") || inFixture(fixture, "access removed");
  const fixtureGrantDialog = inFixture(fixture, "dialog-give-admin-access") || inFixture(fixture, "dialog: give admin access");
  const fixtureConfirm = inFixture(fixture, "confirm-remove-admin-access") || inFixture(fixture, "confirm: remove admin access");
  const initialFixtureAdministrators = fixtureGranted
    ? [...sampleAdministrators, { id: 1201, name: "Daniyal Sheikh", email: "daniyal.sheikh@folio3.com", accessStatus: "active" as const }]
    : fixtureRemoved
      ? sampleAdministrators.map((administrator) => administrator.name === "Mariam Farooq" ? { ...administrator, accessStatus: "revoked" as const } : administrator)
      : sampleAdministrators;
  const [administrators, setAdministrators] = useState<Administrator[]>(isFixture ? initialFixtureAdministrators : []);
  const [total, setTotal] = useState(isFixture ? initialFixtureAdministrators.length : 0);
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? loadError : "");
  const [accessRefused, setAccessRefused] = useState(fixtureDenied);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState(fixtureGranted
    ? "Daniyal Sheikh is now an administrator."
    : fixtureRemoved ? "Access removed for Mariam Farooq." : "");
  const [grantOpen, setGrantOpen] = useState(fixtureGrantDialog);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryEmployees, setDirectoryEmployees] = useState<DirectoryEmployee[]>(fixtureGrantDialog ? sampleDirectory : []);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [removingAdmin, setRemovingAdmin] = useState<Administrator | null>(fixtureConfirm ? sampleAdministrators[1] : null);
  const [mutationError, setMutationError] = useState("");
  const [savingAccess, setSavingAccess] = useState(false);
  const [fixtureResolved, setFixtureResolved] = useState(false);
  const requestId = useRef(0);
  const directoryRequestId = useRef(0);
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;

  const loadAdministrators = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true);
    setPageError("");
    setAccessRefused(false);
    try {
      const response = await listAdministrators(requestOptions());
      if (request !== requestId.current) return;
      if (response.status === 200) {
        setAdministrators(response.data.administrators);
        setTotal(response.data.total);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else if (response.status === 403) {
        setAdministrators([]);
        setTotal(0);
        setAccessRefused(true);
      } else {
        setAdministrators([]);
        setTotal(0);
        setPageError(loadError);
      }
    } catch {
      if (request === requestId.current) {
        setAdministrators([]);
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
    if (isFixture) return;
    void loadAdministrators();
  }, [isFixture, loadAdministrators]);

  const searchDirectory = useCallback(async (query: string) => {
    if (!query.trim()) {
      directoryRequestId.current += 1;
      setDirectoryEmployees([]);
      setDirectoryLoading(false);
      setDialogError("");
      return;
    }
    const request = ++directoryRequestId.current;
    setDirectoryLoading(true);
    setDialogError("");
    try {
      const response = await searchEmployeeDirectory({ search: query.trim() }, requestOptions());
      if (request !== directoryRequestId.current) return;
      if (response.status === 200) {
        setDirectoryEmployees(response.data.employees);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else {
        setDirectoryEmployees([]);
        setAccessRefused(true);
        setGrantOpen(false);
      }
    } catch {
      if (request !== directoryRequestId.current) return;
      setDirectoryEmployees([]);
      setDialogError("We couldn't search employees. Try again.");
    } finally {
      if (request === directoryRequestId.current) setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!grantOpen || isFixture) return;
    const timer = window.setTimeout(() => void searchDirectory(directoryQuery), directoryQuery.trim() ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [directoryQuery, grantOpen, isFixture, searchDirectory]);

  function retry() {
    setFixtureResolved(true);
    if (isFixture) {
      setAdministrators(sampleAdministrators);
      setTotal(sampleAdministrators.length);
      setPageError("");
      setAccessRefused(false);
      setLoading(false);
      setRetrying(false);
      return;
    }
    setRetrying(true);
    void loadAdministrators();
  }

  function openGrantDialog() {
    setDirectoryQuery("");
    setDirectoryEmployees(isFixture ? sampleDirectory : []);
    setDialogError("");
    setNotice("");
    setGrantOpen(true);
  }

  async function grantAccess(employee: DirectoryEmployee) {
    setSavingAccess(true);
    setDialogError("");
    if (isFixture) {
      const isAlreadyAdmin = administrators.some((item) => item.id === employee.id);
      setAdministrators((current) => current.some((item) => item.id === employee.id)
        ? current
        : [...current, { ...employee, accessStatus: "active" }]);
      setTotal((current) => current + (isAlreadyAdmin ? 0 : 1));
      setNotice(`${employee.name} is now an administrator.`);
      setGrantOpen(false);
      setFixtureResolved(true);
      setSavingAccess(false);
      return;
    }
    try {
      const response = await grantAdministratorAccess({ employeeId: employee.id }, requestOptions());
      if (response.status === 200) {
        const alreadyAdmin = administrators.some((item) => item.id === response.data.employee.id);
        setAdministrators((current) => current.some((item) => item.id === response.data.employee.id)
          ? current.map((item) => item.id === response.data.employee.id ? response.data.employee : item)
          : [...current, response.data.employee]);
        setTotal((current) => current + (alreadyAdmin ? 0 : 1));
        setNotice(response.data.message);
        setGrantOpen(false);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else if (response.status === 403) {
        setAdministrators([]);
        setTotal(0);
        setAccessRefused(true);
        setGrantOpen(false);
      } else {
        setDialogError(response.data.message || "We couldn't give access. Try again.");
      }
    } catch {
      setDialogError("We couldn't give access. Try again.");
    } finally {
      setSavingAccess(false);
    }
  }

  async function revokeAccess() {
    if (!removingAdmin) return;
    const target = removingAdmin;
    setSavingAccess(true);
    setMutationError("");
    if (isFixture) {
      const revoked = { ...target, accessStatus: "revoked" as const };
      setAdministrators((current) => current.map((item) => item.id === revoked.id ? revoked : item));
      setNotice(`Access removed for ${target.name}.`);
      setRemovingAdmin(null);
      setFixtureResolved(true);
      setSavingAccess(false);
      return;
    }
    try {
      const response = await revokeAdministratorAccess(target.id, requestOptions());
      if (response.status === 200) {
        setAdministrators((current) => current.map((item) => item.id === response.data.employee.id ? response.data.employee : item));
        setNotice(response.data.message);
        setRemovingAdmin(null);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else if (response.status === 403) {
        setAdministrators([]);
        setTotal(0);
        setAccessRefused(true);
        setRemovingAdmin(null);
      } else {
        setMutationError(response.data.message || "We couldn't remove access. Try again.");
      }
    } catch {
      setMutationError("We couldn't remove access. Try again.");
    } finally {
      setSavingAccess(false);
    }
  }

  const screenState = fixtureResolved ? "default" : fixture ?? (loading ? "loading" : pageError ? "error" : accessRefused ? "access-refused" : "default");
  const canManage = !loading && !pageError && !accessRefused;
  const accessStatuses = Array.from(new Set(administrators.map((administrator) => administrator.accessStatus)));
  const visibleDirectory = isFixture && directoryQuery.trim()
    ? directoryEmployees.filter((employee) => `${employee.name} ${employee.email}`.toLowerCase().includes(directoryQuery.trim().toLowerCase()))
    : directoryEmployees;

  return (
    <main data-screen="S-13" data-state={screenState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Admins</h1>
            <p className="mt-1.5 text-base text-muted-foreground">People who can open these administrator pages.</p>
          </div>
          {canManage && (
            <Button onClick={openGrantDialog} className="self-start sm:self-auto">
              <Plus aria-hidden="true" />
              Give access
            </Button>
          )}
        </header>

        {notice && !accessRefused && <Notice tone="ok" className="mb-4"><NoticeTitle>{notice}</NoticeTitle></Notice>}

        {accessRefused ? <ClosedGatePanel /> : loading ? <AdminsSkeleton /> : pageError ? (
          <Notice tone="bad">
            <RefreshCw aria-hidden="true" />
            <NoticeTitle>{loadError}</NoticeTitle>
            <NoticeDescription><Button variant="outline" size="sm" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
          </Notice>
        ) : (
          <section aria-label="Administrators">
            {mutationError && <Notice tone="bad" className="mb-4"><NoticeTitle>{mutationError}</NoticeTitle></Notice>}
            <Card className="overflow-hidden">
              {administrators.map((administrator, index) => (
                <article key={administrator.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${index < administrators.length - 1 ? "border-b" : ""}`}>
                  <div className="flex min-w-0 items-center gap-4">
                    <div aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                      <UserRound className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-heading text-sm font-semibold">{administrator.name}</span>
                        <StatusBadge aria-label={`Access status: ${administrator.accessStatus}`} title={administrator.accessStatus} tone={administrator.accessStatus === "active" ? "ok" : "neutral"}>
                          {administrator.accessStatus === "active" ? "Parking administrator" : "Access removed"}
                        </StatusBadge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">{administrator.email}</p>
                    </div>
                  </div>
                  {administrator.accessStatus === "active" && (
                    <div className="flex items-center justify-end border-t pt-3 sm:border-0 sm:pt-0">
                      <Button variant="ghost" size="sm" className="w-full text-left text-muted-foreground hover:text-destructive sm:w-auto" onClick={() => { setMutationError(""); setRemovingAdmin(administrator); }}>
                        Remove access
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </Card>
            <div className="mt-3 flex items-center justify-between px-1 text-sm text-muted-foreground">
              <p><span className="font-mono font-medium text-foreground">{total}</span> administrators</p>
              {accessStatuses.length > 0 && <p className="flex items-center gap-2" aria-label="Administrator access statuses">Access: {accessStatuses.map((status) => <span key={status} className="font-medium text-foreground">{status}</span>)}</p>}
            </div>
          </section>
        )}
      </div>

      <Dialog open={grantOpen && canManage} onOpenChange={(open) => { if (!savingAccess) setGrantOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Give admin access</DialogTitle>
            <DialogDescription>Find an employee to add to the administrator list.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search employees" placeholder="Search employees" value={directoryQuery} onChange={(event) => {
              setDirectoryQuery(event.target.value);
              if (isFixture) setDirectoryEmployees(sampleDirectory);
            }} className="pl-10" />
          </div>
          {dialogError && <p role="alert" className="text-sm text-destructive">{dialogError}</p>}
          <div className="max-h-64 overflow-y-auto">
            {directoryLoading ? <div className="grid gap-3 py-2" aria-label="Searching employees"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div> : visibleDirectory.length > 0 ? (
              <div className="divide-y rounded-md border">
                {visibleDirectory.map((employee) => (
                  <div key={employee.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{employee.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                    </div>
                    <Button size="sm" disabled={savingAccess} onClick={() => void grantAccess(employee)}>
                      {savingAccess ? "Giving access…" : "Give access"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : <p className="py-4 text-sm text-muted-foreground">Search for an employee to give administrator access.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setGrantOpen(false)} disabled={savingAccess}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(removingAdmin) && !accessRefused} onOpenChange={(open) => { if (!open && !savingAccess) setRemovingAdmin(null); }}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove admin access?</AlertDialogTitle>
          <AlertDialogDescription>{removingAdmin ? `Remove administrator access for ${removingAdmin.name}? They will no longer be able to open administrator pages.` : "This person will no longer be able to open administrator pages."}</AlertDialogDescription>
          {mutationError && <p role="alert" className="text-sm text-destructive">{mutationError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingAccess}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={savingAccess} onClick={() => void revokeAccess()}>{savingAccess ? "Removing…" : "Remove access"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
