// S-2 Create an account: the route. The page itself is the container.
import { CreateAnAccountContainer } from "@/components/screens/s-2/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <CreateAnAccountContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-2")} />;
}
