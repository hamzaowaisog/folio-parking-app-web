// S-5 Free spaces: the route. The page itself is the container.
import { FreeSpacesContainer } from "@/components/screens/s-5/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <FreeSpacesContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-5")} />;
}
