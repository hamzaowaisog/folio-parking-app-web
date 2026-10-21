// S-7 Gate Tue 14 Oct · live: the route. The page itself is the container.
import { GateTue14OctLiveContainer } from "@/components/screens/s-7/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <GateTue14OctLiveContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-7")} />;
}
