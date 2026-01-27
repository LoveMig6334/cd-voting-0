import { getCurrentSession } from "@/lib/actions/auth";
import { getStudentVoteHistory } from "@/lib/actions/student-votes";
import { redirect } from "next/navigation";
import MyVotesClient from "./MyVotesClient";

export default async function MyVotesPage() {
  // Check authentication
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // Fetch vote history from database
  const votes = await getStudentVoteHistory();

  return <MyVotesClient initialVotes={votes} />;
}
