// S-3 Dashboard: the route. The page itself is the container.
import { DashboardContainer } from "@/components/screens/s-3/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <DashboardContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-3")} />;
}
