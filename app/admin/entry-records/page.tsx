// S-8 Entry records: the route. The page itself is the container.
import { EntryRecordsContainer } from "@/components/screens/s-8/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <EntryRecordsContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-8")} />;
}
