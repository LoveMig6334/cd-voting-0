import { getElectionById } from "@/lib/actions/elections";
import { getStudentStats } from "@/lib/actions/students";
import {
  getParticipationByLevel,
  getPositionResults,
  getVoterTurnout,
} from "@/lib/actions/votes";
import { notFound } from "next/navigation";
import ResultsClient from "./ResultsClient";

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const electionId = parseInt(id, 10);

  if (isNaN(electionId)) {
    notFound();
  }

  // Fetch election and stats in parallel
  const [election, studentStats] = await Promise.all([
    getElectionById(electionId),
    getStudentStats(),
  ]);

  if (!election) {
    notFound();
  }

  const totalEligible =
    studentStats.approved > 0 ? studentStats.approved : studentStats.total;

  // Fetch turnout, position results, and level stats in parallel
  const enabledPositions = election.positions.filter((p) => p.enabled);
  const [turnout, positionResults, levelStats] = await Promise.all([
    getVoterTurnout(electionId, totalEligible),
    Promise.all(
      enabledPositions.map((position) =>
        getPositionResults(electionId, position.id, position.title),
      ),
    ),
    getParticipationByLevel(electionId),
  ]);

  return (
    <ResultsClient
      election={election}
      turnout={turnout}
      positionResults={positionResults}
      totalStudents={studentStats.total}
      levelStats={levelStats}
    />
  );
}
