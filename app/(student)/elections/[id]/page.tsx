import { getElectionById } from "@/lib/actions/elections";
import { hasVoted } from "@/lib/actions/votes";
import { notFound, redirect } from "next/navigation";
import { VotingClient } from "./VotingClient";

interface VotingPageProps {
  params: Promise<{ id: string }>;
}

export default async function VotingPage({ params }: VotingPageProps) {
  const { id } = await params;
  const electionId = parseInt(id, 10);

  if (isNaN(electionId)) {
    notFound();
  }

  // Fetch election data and check vote status in parallel
  const [election, alreadyVoted] = await Promise.all([
    getElectionById(electionId),
    hasVoted(electionId),
  ]);

  if (!election) {
    notFound();
  }
  if (alreadyVoted) {
    redirect("/vote-success?already=true");
  }

  return <VotingClient election={election} />;
}
