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

  // Fetch election data
  const election = await getElectionById(electionId);

  if (!election) {
    notFound();
  }

  // Check if user already voted
  const alreadyVoted = await hasVoted(electionId);
  if (alreadyVoted) {
    redirect("/vote-success?already=true");
  }

  return <VotingClient election={election} />;
}
