// S-11 Employees: the route. The page itself is the container.
import { EmployeesContainer } from "@/components/screens/s-11/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <EmployeesContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-11")} />;
}
