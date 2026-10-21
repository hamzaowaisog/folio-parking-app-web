// The product's address: it opens /dashboard (sign-in first when signed out).
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
