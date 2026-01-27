import { getCurrentSession } from "@/lib/actions/auth";
import { getPublicElections } from "@/lib/actions/student-analytics";
import { redirect } from "next/navigation";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  // Check authentication
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch elections from database
  const elections = await getPublicElections();

  return <AnalyticsClient initialElections={elections} />;
}
