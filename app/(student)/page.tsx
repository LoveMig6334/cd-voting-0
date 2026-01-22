import { getActiveElections, getElectionById } from "@/lib/actions/elections";
import { DashboardClient } from "./DashboardClient";

export default async function Dashboard() {
  // Fetch active elections from MySQL
  const activeElections = await getActiveElections();

  // Fetch full details (positions, candidates) for each election
  const electionsWithDetails = await Promise.all(
    activeElections.map(async (election) => {
      const details = await getElectionById(election.id);
      return details;
    })
  );

  // Filter out nulls
  const elections = electionsWithDetails.filter(
    (e): e is NonNullable<typeof e> => e !== null
  );

  return <DashboardClient elections={elections} />;
}
