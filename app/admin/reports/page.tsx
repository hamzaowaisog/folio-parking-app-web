// S-9 Reports: the route. The page itself is the container.
import { ReportsContainer } from "@/components/screens/s-9/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <ReportsContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-9")} />;
}
