// S-13 Admins: the route. The page itself is the container.
import { AdminsContainer } from "@/components/screens/s-13/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <AdminsContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-13")} />;
}
