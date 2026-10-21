"use client";

// S-11 Employees (/admin/employees): the approved Stitch page, built by the coding task in this file.
// Fixture mode keeps each approved state local and never calls the employee service.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CarFront, RefreshCw, Search, UserRound, UsersRound } from "lucide-react";
import { createEmployee, getEmployee, listEmployees, updateEmployee } from "@/lib/api/client";
import type { Employee, EmployeeInput, ListEmployeesParkingStatus } from "@/lib/api/client.schemas";
import { getAccessToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice, NoticeDescription, NoticeTitle } from "@/components/ui/notice";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNav } from "@/lib/nav";

type ParkingFilter = "All" | ListEmployeesParkingStatus;
type FormValues = {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  parkingStatus: ListEmployeesParkingStatus;
  assignedFloor: string;
  plate: string;
  make: string;
  model: string;
  color: string;
};

const loadError = "We couldn't load employees. Try again.";
const accessError = "You do not have access to this page.";
const departments = ["Engineering", "Finance", "HR", "Operations", "Product", "Sales"];
const parkingFilters = [
  { value: "All", label: "All" },
  { value: "Dedicated", label: "Dedicated" },
  { value: "Temporary", label: "Temporary" },
];

const sampleEmployees: Employee[] = [
  { id: 1001, employeeId: "EMP-1001", name: "Usman Tariq", email: "usman.tariq@folio3.com", department: "Operations", role: "Parking administrator", parkingStatus: "Dedicated", assignedFloor: "Floor 1", vehicles: [{ id: 1, plate: "RDX-226", make: "Hyundai", model: "Tucson", color: "Blue" }], datedActivity: [] },
  { id: 1042, employeeId: "EMP-1042", name: "Ayesha Malik", email: "ayesha.malik@folio3.com", department: "Engineering", role: "Senior Engineer", parkingStatus: "Dedicated", assignedFloor: "Floor 2", vehicles: [{ id: 2, plate: "BKT-482", make: "Honda", model: "City", color: "White" }], datedActivity: [] },
  { id: 1063, employeeId: "EMP-1063", name: "Sana Raza", email: "sana.raza@folio3.com", department: "Product", role: "Product Manager", parkingStatus: "Dedicated", assignedFloor: "Floor 3", vehicles: [{ id: 3, plate: "KLM-305", make: "Suzuki", model: "Swift", color: "Silver" }], datedActivity: [] },
  { id: 1088, employeeId: "EMP-1088", name: "Mariam Farooq", email: "mariam.farooq@folio3.com", department: "HR", role: "HR Manager", parkingStatus: "Dedicated", assignedFloor: "Floor 1", vehicles: [{ id: 4, plate: "LZR-771", make: "Toyota", model: "Yaris", color: "Blue" }], datedActivity: [] },
  { id: 1107, employeeId: "EMP-1107", name: "Bilal Ahmed", email: "bilal.ahmed@folio3.com", department: "Finance", role: "Accountant", parkingStatus: "Temporary", assignedFloor: null, vehicles: [{ id: 5, plate: "AWC-917", make: "Toyota", model: "Corolla", color: "Grey" }], datedActivity: [] },
  { id: 1131, employeeId: "EMP-1131", name: "Hamza Qureshi", email: "hamza.qureshi@folio3.com", department: "Sales", role: "Account Executive", parkingStatus: "Temporary", assignedFloor: null, vehicles: [{ id: 6, plate: "SNP-640", make: "Kia", model: "Sportage", color: "Red" }], datedActivity: [] },
  { id: 1156, employeeId: "EMP-1156", name: "Daniyal Sheikh", email: "daniyal.sheikh@folio3.com", department: "Engineering", role: "Software Engineer", parkingStatus: "Dedicated", assignedFloor: "Floor 2", vehicles: [{ id: 7, plate: "APD-208", make: "Honda", model: "Civic", color: "Black" }], datedActivity: [] },
];

function inFixture(fixture: string | undefined, phrase: string): boolean {
  return fixture?.toLowerCase().includes(phrase) ?? false;
}

function fixtureFilter(fixture?: string): ParkingFilter {
  return inFixture(fixture, "temporary") ? "Temporary" : inFixture(fixture, "dedicated") || inFixture(fixture, "filtered") ? "Dedicated" : "All";
}

function fixtureSearch(fixture?: string): string {
  return inFixture(fixture, "empty-search") || inFixture(fixture, "empty search") ? "no matching employee" : "";
}

function matchingEmployees(employees: Employee[], query: string, parking: ParkingFilter, department: string): Employee[] {
  const normalizedQuery = query.trim().toLowerCase();
  return employees.filter((employee) => {
    const matchesParking = parking === "All" || employee.parkingStatus === parking;
    const matchesDepartment = department === "All departments" || employee.department === department;
    const matchesQuery = !normalizedQuery || [employee.name, employee.email, employee.employeeId, employee.department, employee.role,
      ...employee.vehicles.map((vehicle) => [vehicle.plate, vehicle.make, vehicle.model].filter(Boolean).join(" "))]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesParking && matchesDepartment && matchesQuery;
  });
}

function emptyForm(): FormValues {
  return { employeeId: "", name: "", email: "", department: "", role: "", parkingStatus: "Temporary", assignedFloor: "", plate: "", make: "", model: "", color: "" };
}

function valuesFor(employee: Employee): FormValues {
  const vehicle = employee.vehicles[0];
  return {
    employeeId: employee.employeeId,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    role: employee.role,
    parkingStatus: employee.parkingStatus,
    assignedFloor: employee.assignedFloor ?? "",
    plate: vehicle?.plate ?? "",
    make: vehicle?.make ?? "",
    model: vehicle?.model ?? "",
    color: vehicle?.color ?? "",
  };
}

function payloadFor(values: FormValues): EmployeeInput {
  const plate = values.plate.trim();
  return {
    employeeId: values.employeeId.trim(),
    name: values.name.trim(),
    email: values.email.trim(),
    department: values.department.trim(),
    role: values.role.trim(),
    parkingStatus: values.parkingStatus,
    assignedFloor: values.assignedFloor.trim() || null,
    vehicles: plate ? [{ plate: plate.toUpperCase(), make: values.make.trim() || null, model: values.model.trim() || null, color: values.color.trim() || null }] : [],
  };
}

function formErrorsFor(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.employeeId.trim()) errors.employeeId = "Enter an employee ID";
  if (!values.name.trim()) errors.name = "Enter a name";
  if (!values.email.trim()) errors.email = "Enter an email";
  if (!values.department.trim()) errors.department = "Enter a department";
  if (!values.role.trim()) errors.role = "Enter a role";
  if (values.parkingStatus === "Dedicated" && !values.assignedFloor.trim()) errors.assignedFloor = "Enter an assigned floor";
  return errors;
}

function EmployeesSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Department and role</TableHead><TableHead>Parking</TableHead><TableHead>Vehicle</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
        <TableBody>{[0, 1, 2, 3, 4].map((row) => <TableRow key={row}>
          {[0, 1, 2, 3, 4].map((cell) => <TableCell key={cell}><Skeleton className={cell === 0 ? "h-5 w-32" : "h-5 w-28"} /></TableCell>)}
        </TableRow>)}</TableBody>
      </Table>
    </Card>
  );
}

function NoEmployees({ onClear }: { onClear: () => void }) {
  return (
    <Card className="grid justify-items-center gap-3 p-6 text-center">
      <div role="img" aria-label="No employees illustration" className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <UsersRound aria-hidden="true" className="size-10 stroke-1" />
      </div>
      <h2 className="font-heading text-lg font-semibold">No employees match</h2>
      <Button variant="outline" onClick={onClear}>Clear filters</Button>
    </Card>
  );
}

export function EmployeesContainer({ fixture }: { fixture?: string }) {
  const isFixture = fixture !== undefined;
  const fixtureLoading = inFixture(fixture, "loading");
  const fixtureError = inFixture(fixture, "error");
  const fixtureEmpty = inFixture(fixture, "empty");
  const fixtureFiltered = inFixture(fixture, "filtered");
  const fixtureSaved = inFixture(fixture, "saved");
  const fixtureInitialFilter = fixtureFilter(fixture);
  const fixtureInitialQuery = fixtureSearch(fixture);
  const fixtureData = fixtureSaved
    ? sampleEmployees.map((employee) => employee.name === "Ayesha Malik" ? { ...employee, role: "Engineering Lead" } : employee)
    : sampleEmployees;
  const fixturePanel = inFixture(fixture, "panel-edit-employee") || inFixture(fixture, "panel: edit employee");
  const fixturePanelEmployee = fixtureData.find((employee) => employee.name === "Ayesha Malik") ?? fixtureData[0] ?? null;
  const [allEmployees, setAllEmployees] = useState<Employee[]>(isFixture ? fixtureData : []);
  const [total, setTotal] = useState(isFixture ? 71 : 0);
  const [search, setSearch] = useState(fixtureInitialQuery);
  const [department, setDepartment] = useState("All departments");
  const [parkingFilter, setParkingFilter] = useState<ParkingFilter>(fixtureFiltered ? fixtureInitialFilter : "All");
  const [loading, setLoading] = useState(!isFixture || fixtureLoading);
  const [pageError, setPageError] = useState(fixtureError ? loadError : "");
  const [accessRefused, setAccessRefused] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [fixtureResolved, setFixtureResolved] = useState(false);
  const [savedMessage, setSavedMessage] = useState(fixtureSaved ? "Changes saved for Ayesha Malik." : "");
  const [savedActivityEmployee, setSavedActivityEmployee] = useState<Employee | null>(null);
  const [addOpen, setAddOpen] = useState(inFixture(fixture, "dialog-add-employee") || inFixture(fixture, "dialog: add employee"));
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(fixturePanel ? fixturePanelEmployee : null);
  const [editLoading, setEditLoading] = useState(false);
  const [form, setForm] = useState<FormValues>(() => fixturePanelEmployee && fixturePanel ? valuesFor(fixturePanelEmployee) : emptyForm());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [formMessage, setFormMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const editRequestId = useRef(0);
  const { go } = useNav();
  const navigate = useRef(go);
  navigate.current = go;

  const loadEmployees = useCallback(async (query: string, parking: ParkingFilter) => {
    const request = ++requestId.current;
    setLoading(true);
    setPageError("");
    setAccessRefused("");
    try {
      const token = getAccessToken();
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const status = parking === "All" ? undefined : parking;
      const response = await listEmployees({ ...(query.trim() ? { search: query.trim() } : {}), ...(status ? { parkingStatus: status } : {}) }, options);
      if (request !== requestId.current) return;
      if (response.status === 200) {
        setAllEmployees(response.data.employees);
        setTotal(response.data.total);
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else {
        setAllEmployees([]);
        setTotal(0);
        setAccessRefused(response.data.message || accessError);
      }
    } catch {
      if (request === requestId.current) {
        setAllEmployees([]);
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
    if (isFixture) return;
    const timer = window.setTimeout(() => void loadEmployees(search, parkingFilter), search ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [isFixture, loadEmployees, parkingFilter, search]);

  const fixtureEmployees = matchingEmployees(fixtureData, search, parkingFilter, department);
  const employees = matchingEmployees(allEmployees, "", "All", department);
  const visibleEmployees = isFixture ? fixtureEmployees : employees;
  const visibleTotal = department === "All departments" ? total : visibleEmployees.length;
  const empty = !loading && !pageError && !accessRefused && (fixtureEmpty && !fixtureResolved || visibleEmployees.length === 0);
  const screenState = fixtureResolved ? "default" : fixture ?? (loading ? "loading" : pageError ? "error" : accessRefused ? "access-refused" : empty ? "empty" : parkingFilter === "All" ? "default" : "filtered");
  const departmentOptions = Array.from(new Set([...departments, ...allEmployees.map((employee) => employee.department)])).sort();

  function changeSearch(value: string) {
    setSearch(value);
    setSavedMessage("");
    if (isFixture) setFixtureResolved(true);
  }

  function changeParkingFilter(value: string) {
    setParkingFilter(value as ParkingFilter);
    setSavedMessage("");
    if (isFixture) setFixtureResolved(true);
  }

  function clearFilters() {
    setSearch("");
    setDepartment("All departments");
    setParkingFilter("All");
    setPageError("");
    setAccessRefused("");
    setSavedMessage("");
    setFixtureResolved(true);
    if (isFixture) {
      setAllEmployees(sampleEmployees);
      setTotal(71);
      setLoading(false);
    } else {
      void loadEmployees("", "All");
    }
  }

  function retry() {
    setRetrying(true);
    setFixtureResolved(true);
    if (isFixture) {
      setAllEmployees(sampleEmployees);
      setTotal(71);
      setPageError("");
      setAccessRefused("");
      setLoading(false);
      setRetrying(false);
      return;
    }
    void loadEmployees(search, parkingFilter);
  }

  function openAdd() {
    setEditingEmployee(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormMessage("");
    setAddOpen(true);
    setSavedMessage("");
  }

  async function openEdit(employee: Employee) {
    const request = ++editRequestId.current;
    setEditingEmployee(employee);
    setForm(valuesFor(employee));
    setFieldErrors({});
    setFormMessage("");
    setEditLoading(!isFixture);
    setSavedMessage("");
    if (isFixture) return;

    try {
      const token = getAccessToken();
      const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const response = await getEmployee(employee.id, options);
      if (request !== editRequestId.current) return;
      if (response.status === 200) {
        setEditingEmployee(response.data.employee);
        setForm(valuesFor(response.data.employee));
      } else if (response.status === 401) {
        navigate.current("/sign-in");
      } else {
        setFormMessage(response.data.message || "We couldn't load this employee. Try again.");
      }
    } catch {
      if (request === editRequestId.current) setFormMessage("We couldn't load this employee. Try again.");
    } finally {
      if (request === editRequestId.current) setEditLoading(false);
    }
  }

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormMessage("");
  }

  function upsertEmployee(employee: Employee) {
    setAllEmployees((current) => {
      const exists = current.some((item) => item.id === employee.id);
      return exists ? current.map((item) => item.id === employee.id ? employee : item) : [employee, ...current];
    });
    setTotal((current) => current + (allEmployees.some((item) => item.id === employee.id) ? 0 : 1));
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = formErrorsFor(form);
    setFieldErrors(errors);
    setFormMessage("");
    if (Object.keys(errors).length) return;

    const payload = payloadFor(form);
    setSaving(true);
    try {
      let updated: Employee;
      if (isFixture) {
        const current = editingEmployee;
        updated = current ? { ...current, ...payload, vehicles: payload.vehicles.map((vehicle, index) => ({
          ...(current.vehicles[index]?.id === undefined ? {} : { id: current.vehicles[index].id }),
          plate: vehicle.plate,
          make: vehicle.make ?? null,
          model: vehicle.model ?? null,
          color: vehicle.color ?? null,
        })) }
          : { id: 2000 + allEmployees.length, ...payload, vehicles: payload.vehicles.map((vehicle, index) => ({ id: index + 1, plate: vehicle.plate, make: vehicle.make ?? null, model: vehicle.model ?? null, color: vehicle.color ?? null })), datedActivity: [] };
      } else {
        const token = getAccessToken();
        const options = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
        const result = editingEmployee
          ? await updateEmployee(editingEmployee.id, payload, options)
          : await createEmployee(payload, options);
        if (result.status === 401) {
          navigate.current("/sign-in");
          return;
        }
        if (result.status !== 200 && result.status !== 201) {
          setFormMessage(result.data.message || "We couldn't save this employee. Try again.");
          return;
        }
        updated = result.data.employee;
      }

      upsertEmployee(updated);
      if (editingEmployee) setSavedActivityEmployee(updated);
      setEditingEmployee(null);
      setForm(valuesFor(updated));
      setSavedMessage(editingEmployee ? `Changes saved for ${updated.name}.` : `${updated.name} added.`);
      if (!editingEmployee) setAddOpen(false);
    } catch {
      setFormMessage("We couldn't save this employee. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function renderEmployeeForm() {
    const fields: { name: keyof FormValues; label: string; type?: string }[] = [
      { name: "employeeId", label: "Employee ID" },
      { name: "name", label: "Name" },
      { name: "email", label: "Email", type: "email" },
      { name: "department", label: "Department" },
      { name: "role", label: "Role" },
    ];

    return (
      <form onSubmit={submitEmployee} className="grid gap-4">
        {fields.map((field) => (
          <div key={field.name} className="grid gap-2">
            <Label htmlFor={`employee-${field.name}`}>{field.label}</Label>
            <Input id={`employee-${field.name}`} type={field.type ?? "text"} value={form[field.name]} onChange={(event) => updateForm(field.name, event.target.value)} aria-invalid={Boolean(fieldErrors[field.name])} className={field.name === "employeeId" ? "font-mono" : undefined} />
            {fieldErrors[field.name] && <p className="text-sm text-destructive">{fieldErrors[field.name]}</p>}
          </div>
        ))}
        <div className="grid gap-2">
          <Label htmlFor="employee-parking-status">Parking status</Label>
          <Select value={form.parkingStatus} onValueChange={(value) => updateForm("parkingStatus", value)}>
            <SelectTrigger id="employee-parking-status" aria-invalid={Boolean(fieldErrors.parkingStatus)}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Dedicated">Dedicated</SelectItem>
              <SelectItem value="Temporary">Temporary</SelectItem>
            </SelectContent>
          </Select>
          {fieldErrors.parkingStatus && <p className="text-sm text-destructive">{fieldErrors.parkingStatus}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="employee-assigned-floor">Assigned floor</Label>
          <Input id="employee-assigned-floor" value={form.assignedFloor} onChange={(event) => updateForm("assignedFloor", event.target.value)} aria-invalid={Boolean(fieldErrors.assignedFloor)} />
          {fieldErrors.assignedFloor && <p className="text-sm text-destructive">{fieldErrors.assignedFloor}</p>}
        </div>
        <div className="grid gap-3 border-t pt-4">
          <h3 className="font-heading text-sm font-semibold">Vehicle</h3>
          {[{ name: "plate" as const, label: "Plate" }, { name: "make" as const, label: "Make" }, { name: "model" as const, label: "Model" }, { name: "color" as const, label: "Color" }].map((field) => (
            <div key={field.name} className="grid gap-2">
              <Label htmlFor={`employee-${field.name}`}>{field.label}</Label>
              <Input id={`employee-${field.name}`} value={form[field.name]} onChange={(event) => updateForm(field.name, event.target.value)} className={field.name === "plate" ? "font-mono" : undefined} />
            </div>
          ))}
        </div>
        {formMessage && <p role="alert" className="text-sm text-destructive">{formMessage}</p>}
        <DialogFooter className="pt-2">
          <Button type="submit" disabled={saving || editLoading}>{saving ? "Saving…" : editingEmployee ? "Save changes" : "Add employee"}</Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <main data-screen="S-11" data-state={screenState} className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Employees</h1>
        <Button onClick={openAdd}>Add employee</Button>
      </header>

      {savedMessage && <Notice tone="ok" className="mb-4"><NoticeTitle>{savedMessage}</NoticeTitle></Notice>}

      <Card className="mb-6 flex flex-col items-stretch justify-between gap-4 p-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search employees" placeholder="Search employees" value={search} onChange={(event) => changeSearch(event.target.value)} className="h-11 pl-10" />
          </div>
          <div className="w-full sm:w-56">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger aria-label="Department filter" className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All departments">All departments</SelectItem>
                {departmentOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Segmented items={parkingFilters} value={parkingFilter} onChange={changeParkingFilter} label="Filter employees by parking status" className="self-start lg:self-auto" />
      </Card>

      {loading ? <EmployeesSkeleton /> : pageError ? (
        <Notice tone="bad">
          <RefreshCw aria-hidden="true" />
          <NoticeTitle>{pageError}</NoticeTitle>
          <NoticeDescription><Button variant="outline" size="sm" disabled={retrying} onClick={retry}>{retrying ? "Retrying…" : "Retry"}</Button></NoticeDescription>
        </Notice>
      ) : accessRefused ? (
        <Notice tone="bad"><NoticeTitle>{accessRefused}</NoticeTitle></Notice>
      ) : empty ? <NoEmployees onClear={clearFilters} /> : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Department and role</TableHead><TableHead>Parking</TableHead><TableHead>Vehicle</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>{visibleEmployees.map((employee) => {
              const initials = employee.name.split(" ").map((part) => part[0]).join("").slice(0, 2);
              return (
                <TableRow key={employee.id}>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted text-xs font-semibold text-muted-foreground">{initials || <UserRound className="size-4" />}</span>
                      <span className="grid gap-0.5"><span className="font-medium">{employee.name}</span><span className="font-mono text-xs text-muted-foreground">{employee.employeeId}</span></span>
                    </span>
                  </TableCell>
                  <TableCell><span className="grid gap-0.5"><span>{employee.department}</span><span className="text-sm text-muted-foreground">{employee.role}</span></span></TableCell>
                  <TableCell><span className="grid justify-items-start gap-1"><StatusBadge tone={employee.parkingStatus === "Dedicated" ? "ok" : "warn"}>{employee.parkingStatus}</StatusBadge>{employee.assignedFloor && <span className="text-xs text-muted-foreground">{employee.assignedFloor}</span>}</span></TableCell>
                  <TableCell>
                    {employee.vehicles.length ? <span className="flex items-center gap-2"><CarFront aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span className="grid gap-0.5">{employee.vehicles.map((vehicle) => <span key={vehicle.id ?? vehicle.plate}>{[vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(" ")} <span className="font-mono">{vehicle.plate}</span></span>)}</span></span> : <span className="text-muted-foreground">No vehicle registered</span>}
                  </TableCell>
                  <TableCell><Button variant="outline" size="sm" onClick={() => void openEdit(employee)}>Edit</Button></TableCell>
                </TableRow>
              );
            })}</TableBody>
          </Table>
          <div className="flex min-h-11 flex-col items-start justify-between gap-1 border-t px-4 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
            <span>Showing {visibleEmployees.length} of {visibleTotal} employees</span>
            <span className="font-mono font-medium text-foreground">{visibleTotal} employees</span>
          </div>
        </Card>
      )}

      {savedActivityEmployee && savedActivityEmployee.datedActivity.length > 0 && (
        <section className="mt-6 grid gap-3" aria-label={`Dated parking activity for ${savedActivityEmployee.name}`}>
          <h2 className="font-heading text-lg font-semibold">Dated parking activity for {savedActivityEmployee.name}</h2>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Activity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{savedActivityEmployee.datedActivity.map((activity, index) => <TableRow key={`${activity.date}-${activity.kind}-${index}`}>
                <TableCell className="font-mono">{activity.date}</TableCell><TableCell>{activity.kind}</TableCell><TableCell><StatusBadge>{activity.status}</StatusBadge></TableCell>
              </TableRow>)}</TableBody>
            </Table>
          </Card>
        </section>
      )}

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setFormMessage(""); }}>
        <DialogContent className="max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add employee</DialogTitle>
            <DialogDescription>Add employee, vehicle, and parking assignment details.</DialogDescription>
          </DialogHeader>
          {renderEmployeeForm()}
        </DialogContent>
      </Dialog>

      <Sheet open={editingEmployee !== null} onOpenChange={(open) => { if (!open) { setEditingEmployee(null); setEditLoading(false); setFormMessage(""); editRequestId.current += 1; } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetTitle>Edit employee</SheetTitle>
          <SheetDescription>Update employee, vehicle, and parking assignment details.</SheetDescription>
          {editLoading ? <div className="grid gap-4 pt-4" aria-label="Loading employee details">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-9 w-full" />)}</div> : (
            <>
              {renderEmployeeForm()}
              {editingEmployee && editingEmployee.datedActivity.length > 0 && (
                <section className="mt-6 grid gap-3 border-t pt-4" aria-label="Dated parking activity">
                  <h3 className="font-heading text-sm font-semibold">Dated parking activity</h3>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Activity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>{editingEmployee.datedActivity.map((activity, index) => <TableRow key={`${activity.date}-${activity.kind}-${index}`}>
                      <TableCell className="font-mono">{activity.date}</TableCell><TableCell>{activity.kind}</TableCell><TableCell><StatusBadge>{activity.status}</StatusBadge></TableCell>
                    </TableRow>)}</TableBody>
                  </Table>
                </section>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
