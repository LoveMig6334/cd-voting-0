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

  // Step 1: Fetch all election details in parallel (async-parallel)
  const electionsWithDetails = await Promise.all(
    elections.map((row) => getElectionById(row.id))
  );

  // Filter out null elections
  const validElections = electionsWithDetails.filter(
    (e): e is NonNullable<typeof e> => e !== null
  );

  // Step 2: Build summaries in parallel - fetch turnout and winner concurrently
  const summaries = await Promise.all(
    validElections.map(async (election) => {
      const status = calculateStatus(
        new Date(election.start_date),
        new Date(election.end_date)
      );

      const enabledPositions = election.positions.filter((p) => p.enabled);

      // Parallel fetch: turnout and primary winner at the same time
      const [turnout, primaryWinner] = await Promise.all([
        getVoterTurnout(election.id, totalEligible),
        enabledPositions.length > 0
          ? getPositionWinner(
              election.id,
              enabledPositions[0].id,
              enabledPositions[0].title
            )
          : Promise.resolve(null),
      ]);

      return {
        election,
        turnout,
        primaryWinner,
        status,
      } satisfies ElectionResultSummary;
    })
  );

  return <AdminResultsClient summaries={summaries} />;
}
