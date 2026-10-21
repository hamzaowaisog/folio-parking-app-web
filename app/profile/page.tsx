// S-6 Profile: the route. The page itself is the container.
import { ProfileContainer } from "@/components/screens/s-6/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <ProfileContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-6")} />;
}
