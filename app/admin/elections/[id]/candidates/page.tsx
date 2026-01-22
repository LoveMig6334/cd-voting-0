import { notFound } from "next/navigation";
import { getElectionById } from "@/lib/actions/elections";
import CandidatesClient from "./CandidatesClient";

interface CandidatesPageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidatesPage({ params }: CandidatesPageProps) {
  const { id } = await params;
  const electionId = parseInt(id, 10);

  if (isNaN(electionId)) {
    notFound();
  }

  const election = await getElectionById(electionId);

  if (!election) {
    notFound();
  }

  return <CandidatesClient election={election} />;
}
