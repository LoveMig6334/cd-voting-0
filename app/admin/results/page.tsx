import { getAllElections, getElectionById } from "@/lib/actions/elections";
import { getVoterTurnout, getPositionWinner } from "@/lib/actions/votes";
import { getStudentStats } from "@/lib/actions/students";
import AdminResultsClient, { ElectionResultSummary } from "./AdminResultsClient";

function calculateStatus(startDate: Date, endDate: Date): "draft" | "open" | "closed" {
  const now = new Date();
  if (now < startDate) return "draft";
  if (now >= startDate && now <= endDate) return "open";
  return "closed";
}

export default async function AdminResultsPage() {
  // Get all elections
  const elections = await getAllElections();

  // Get stats for total eligible voters
  const studentStats = await getStudentStats();
  const totalEligible =
    studentStats.approved > 0 ? studentStats.approved : studentStats.total;

  // Build summaries for each election
  const summaries: ElectionResultSummary[] = [];

  for (const electionRow of elections) {
    // Get full election details
    const election = await getElectionById(electionRow.id);
    if (!election) continue;

    // Calculate status
    const status = calculateStatus(
      new Date(election.start_date),
      new Date(election.end_date)
    );

    // Get voter turnout
    const turnout = await getVoterTurnout(election.id, totalEligible);

    // Get primary winner (first enabled position)
    const enabledPositions = election.positions.filter((p) => p.enabled);
    let primaryWinner = null;

    if (enabledPositions.length > 0) {
      primaryWinner = await getPositionWinner(
        election.id,
        enabledPositions[0].id,
        enabledPositions[0].title
      );
    }

    summaries.push({
      election,
      turnout,
      primaryWinner,
      status,
    });
  }

  return <AdminResultsClient summaries={summaries} />;
}
