// S-4 My space: the route. The page itself is the container.
import { MySpaceContainer } from "@/components/screens/s-4/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <MySpaceContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-4")} />;
}
