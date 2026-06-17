import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getSession();
  redirect(session ? "/benar-foundation" : "/login");
}