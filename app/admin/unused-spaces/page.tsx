// S-10 Unused spaces: the route. The page itself is the container.
import { UnusedSpacesContainer } from "@/components/screens/s-10/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <UnusedSpacesContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-10")} />;
}
