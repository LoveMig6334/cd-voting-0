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

  const election = await getElectionById(electionId);

  if (!election) {
    notFound();
  }

  // Get stats for total eligible voters
  const studentStats = await getStudentStats();
  const totalEligible =
    studentStats.approved > 0 ? studentStats.approved : studentStats.total;

  // Get voter turnout
  const turnout = await getVoterTurnout(electionId, totalEligible);

  // Get results for each enabled position (parallel fetch)
  const enabledPositions = election.positions.filter((p) => p.enabled);
  const positionResults = await Promise.all(
    enabledPositions.map((position) =>
      getPositionResults(electionId, position.id, position.title),
    ),
  );

  // Get participation by class level (1-6)
  const levelStats = await getParticipationByLevel(electionId);

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
