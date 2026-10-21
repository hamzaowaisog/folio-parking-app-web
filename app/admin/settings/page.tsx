// S-12 Settings: the route. The page itself is the container.
import { SettingsContainer } from "@/components/screens/s-12/container";
import { fixtureState } from "@/lib/fixture";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { fixture } = await searchParams;
  return <SettingsContainer fixture={fixtureState(typeof fixture === "string" ? fixture : undefined, "S-12")} />;
}
