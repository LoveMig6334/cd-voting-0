import {
  getAllElections,
  getArchivedElections,
} from "@/lib/actions/elections";
import { query, CandidateRow } from "@/lib/db";
import ElectionsClient, { ElectionWithCandidates } from "./ElectionsClient";

export default async function ElectionManagementPage() {
  // Get all elections and archived elections in parallel
  const [elections, archivedElectionsRaw] = await Promise.all([
    getAllElections(),
    getArchivedElections(),
  ]);

  // Get candidate counts for each election
  const candidateCounts = await query<
    { election_id: number; count: number } & CandidateRow
  >(
    `SELECT election_id, COUNT(*) as count FROM candidates GROUP BY election_id`
  );

  // Build count map
  const countMap = new Map<number, number>();
  for (const row of candidateCounts) {
    countMap.set(row.election_id, row.count);
  }

  // Combine elections with candidate counts
  const electionsWithCandidates: ElectionWithCandidates[] = elections.map(
    (e) => ({
      ...e,
      candidateCount: countMap.get(e.id) || 0,
    })
  );

  // Combine archived elections with candidate counts
  const archivedElections: ElectionWithCandidates[] = archivedElectionsRaw.map(
    (e) => ({
      ...e,
      candidateCount: countMap.get(e.id) || 0,
    })
  );

  return (
    <ElectionsClient
      elections={electionsWithCandidates}
      archivedElections={archivedElections}
    />
  );
}
