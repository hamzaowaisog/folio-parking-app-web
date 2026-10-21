// S-1 Sign in: the route. The page itself is the container.
import { SignInContainer } from "@/components/screens/s-1/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <SignInContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-1")} />;
}
