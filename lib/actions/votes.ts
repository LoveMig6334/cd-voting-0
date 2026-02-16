"use server";

import {
  CandidateRow,
  ElectionRow,
  PositionRow,
  query,
  transaction,
  VoteHistoryRow,
  VoteRow,
} from "@/lib/db";
import { generateVoteToken } from "@/lib/token";
import { PoolConnection, RowDataPacket } from "mysql2/promise";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { logVoteCast } from "./activities";
import { getCurrentAdmin } from "./admin-auth";
import { getCurrentSession } from "./auth";

// ==========================================
// Types
// ==========================================

export interface VoteChoice {
  positionId: string;
  candidateId: number | null; // null = No Vote (abstain)
}

export interface VoteResult {
  success: boolean;
  message: string;
  token?: string;
}

export interface CandidateVoteCount {
  candidateId: number;
  candidateName: string;
  rank: number;
  votes: number;
  percentage: number;
}

export interface PositionResult {
  positionId: string;
  positionTitle: string;
  totalVotes: number;
  candidates: CandidateVoteCount[];
  abstainCount: number;
  abstainPercentage: number;
}

export interface VoterTurnout {
  totalEligible: number;
  totalVoted: number;
  notVoted: number;
  percentage: number;
}

export interface LevelParticipation {
  level: number;
  totalStudents: number;
  voted: number;
  percentage: number;
}

export type WinnerStatus =
  | "winner"
  | "abstain_wins"
  | "tie"
  | "no_candidates"
  | "no_votes";

export interface PositionWinner {
  positionId: string;
  positionTitle: string;
  status: WinnerStatus;
  winner?: CandidateVoteCount;
  tiedCandidates?: CandidateVoteCount[];
  abstainCount: number;
  totalVotes: number;
}

// ==========================================
// Voting Operations
// ==========================================

/**
 * Cast vote - transactional, anonymous
 */
export async function castVote(
  electionId: number,
  choices: VoteChoice[],
): Promise<VoteResult> {
  // 1. Check session
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนลงคะแนน" };
  }

  const studentId = session.studentId;

  try {
    // 2. Use transaction for atomicity
    const voteToken = await transaction(async (conn: PoolConnection) => {
      // 3. Check if already voted (with row lock)
      const [history] = await conn.execute(
        "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ? FOR UPDATE",
        [studentId, electionId],
      );

      if ((history as unknown[]).length > 0) {
        throw new Error("คุณได้ใช้สิทธิ์เลือกตั้งในรายการนี้ไปแล้ว");
      }

      // 4. Record vote history (who voted)
      await conn.execute(
        "INSERT INTO vote_history (student_id, election_id, ip_address) VALUES (?, ?, ?)",
        [studentId, electionId, "server"],
      );

      // 5. Insert votes (anonymous - no student_id)
      for (const choice of choices) {
        if (choice.candidateId) {
          await conn.execute(
            "INSERT INTO votes (election_id, position_id, candidate_id) VALUES (?, ?, ?)",
            [electionId, choice.positionId, choice.candidateId],
          );
        } else {
          await conn.execute(
            "INSERT INTO votes (election_id, position_id, is_no_vote) VALUES (?, ?, TRUE)",
            [electionId, choice.positionId],
          );
        }
      }

      // 6. Update total votes count
      await conn.execute(
        "UPDATE elections SET total_votes = total_votes + 1 WHERE id = ?",
        [electionId],
      );

      // 7. Generate and persist vote token
      const token = generateVoteToken(`${studentId}:${electionId}`, Date.now());

      await conn.execute(
        "INSERT INTO vote_tokens (student_id, election_id, token) VALUES (?, ?, ?)",
        [studentId, electionId, token],
      );

      return token;
    });

    revalidatePath(`/elections/${electionId}`);
    revalidatePath("/admin/results");

    // Log activity (non-blocking) - get election title after response
    after(async () => {
      const elections = await query<ElectionRow>(
        "SELECT title FROM elections WHERE id = ?",
        [electionId],
      );
      const electionTitle = elections[0]?.title || "(ไม่ทราบชื่อ)";
      await logVoteCast(studentId, electionTitle);
    });

    return {
      success: true,
      message: "บันทึกคะแนนโหวตเรียบร้อยแล้ว",
      token: voteToken,
    };
  } catch (error: unknown) {
    console.error("Vote Error:", error);
    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกคะแนน";
    return { success: false, message };
  }
}

/**
 * Check if current user has voted in an election
 */
export async function hasVoted(electionId: number): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;

  const results = await query<VoteHistoryRow>(
    "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ?",
    [session.studentId, electionId],
  );

  return results.length > 0;
}

/**
 * Check if specific student has voted
 */
export async function hasStudentVoted(
  studentId: string,
  electionId: number,
): Promise<boolean> {
  const session = await getCurrentAdmin();
  if (!session) return false;

  const results = await query<VoteHistoryRow>(
    "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ?",
    [studentId, electionId],
  );

  return results.length > 0;
}

// ==========================================
// Results Operations
// ==========================================

/**
 * Get voter turnout for an election
 */
export async function getVoterTurnout(
  electionId: number,
  totalEligibleVoters: number,
): Promise<VoterTurnout> {
  const session = await getCurrentAdmin();
  if (!session) return { totalEligible: 0, totalVoted: 0, notVoted: 0, percentage: 0 };

  const results = await query<{ count: number } & VoteHistoryRow>(
    "SELECT COUNT(*) as count FROM vote_history WHERE election_id = ?",
    [electionId],
  );

  const totalVoted = results[0]?.count || 0;
  const notVoted = Math.max(0, totalEligibleVoters - totalVoted);
  const percentage =
    totalEligibleVoters > 0
      ? Math.round((totalVoted / totalEligibleVoters) * 100)
      : 0;

  return {
    totalEligible: totalEligibleVoters,
    totalVoted,
    notVoted,
    percentage,
  };
}

/**
 * Get vote results for a position
 */
export async function getPositionResults(
  electionId: number,
  positionId: string,
  positionTitle: string,
): Promise<PositionResult> {
  const session = await getCurrentAdmin();
  if (!session) return { positionId, positionTitle, totalVotes: 0, candidates: [], abstainCount: 0, abstainPercentage: 0 };

  // Get all candidates, vote counts, and abstain count in parallel
  const [candidates, voteCounts, abstainResults] = await Promise.all([
    query<CandidateRow>(
      "SELECT * FROM candidates WHERE election_id = ? AND position_id = ? ORDER BY rank",
      [electionId, positionId],
    ),
    query<{ candidate_id: number; count: number } & VoteRow>(
      `SELECT candidate_id, COUNT(*) as count FROM votes
       WHERE election_id = ? AND position_id = ? AND candidate_id IS NOT NULL
       GROUP BY candidate_id`,
      [electionId, positionId],
    ),
    query<{ count: number } & VoteRow>(
      `SELECT COUNT(*) as count FROM votes
       WHERE election_id = ? AND position_id = ? AND is_no_vote = TRUE`,
      [electionId, positionId],
    ),
  ]);

  const abstainCount = abstainResults[0]?.count || 0;

  // Build vote count map
  const voteMap = new Map<number, number>();
  for (const vc of voteCounts) {
    voteMap.set(vc.candidate_id, vc.count);
  }

  // Calculate total votes
  let totalVotes = abstainCount;
  for (const count of voteMap.values()) {
    totalVotes += count;
  }

  // Build candidate results
  const candidateResults: CandidateVoteCount[] = candidates.map((c) => {
    const votes = voteMap.get(c.id) || 0;
    return {
      candidateId: c.id,
      candidateName: c.name,
      rank: c.rank,
      votes,
      percentage: totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0,
    };
  });

  // Sort by votes descending
  candidateResults.sort((a, b) => b.votes - a.votes);

  return {
    positionId,
    positionTitle,
    totalVotes,
    candidates: candidateResults,
    abstainCount,
    abstainPercentage:
      totalVotes > 0 ? Math.round((abstainCount / totalVotes) * 100) : 0,
  };
}

/**
 * Determine winner for a position
 */
export async function getPositionWinner(
  electionId: number,
  positionId: string,
  positionTitle: string,
): Promise<PositionWinner> {
  const session = await getCurrentAdmin();
  if (!session) return { positionId, positionTitle, status: "no_votes", abstainCount: 0, totalVotes: 0 };

  const results = await getPositionResults(
    electionId,
    positionId,
    positionTitle,
  );

  // No candidates
  if (results.candidates.length === 0) {
    return {
      positionId,
      positionTitle,
      status: "no_candidates",
      abstainCount: 0,
      totalVotes: 0,
    };
  }

  // No votes
  if (results.totalVotes === 0) {
    return {
      positionId,
      positionTitle,
      status: "no_votes",
      abstainCount: 0,
      totalVotes: 0,
    };
  }

  // Get highest candidate votes
  const maxCandidateVotes = Math.max(...results.candidates.map((c) => c.votes));

  // Abstain wins
  if (results.abstainCount > maxCandidateVotes) {
    return {
      positionId,
      positionTitle,
      status: "abstain_wins",
      abstainCount: results.abstainCount,
      totalVotes: results.totalVotes,
    };
  }

  // Find candidates with highest votes
  const topCandidates = results.candidates.filter(
    (c) => c.votes === maxCandidateVotes,
  );

  // Tie
  if (topCandidates.length > 1) {
    return {
      positionId,
      positionTitle,
      status: "tie",
      tiedCandidates: topCandidates,
      abstainCount: results.abstainCount,
      totalVotes: results.totalVotes,
    };
  }

  // Winner
  return {
    positionId,
    positionTitle,
    status: "winner",
    winner: topCandidates[0],
    abstainCount: results.abstainCount,
    totalVotes: results.totalVotes,
  };
}

/**
 * Get all election results
 */
export async function getElectionResults(electionId: number): Promise<{
  turnout: VoterTurnout;
  positions: PositionResult[];
  winners: PositionWinner[];
}> {
  const session = await getCurrentAdmin();
  if (!session) return { turnout: { totalEligible: 0, totalVoted: 0, notVoted: 0, percentage: 0 }, positions: [], winners: [] };

  // Get positions and eligible count in parallel
  interface CountResult extends RowDataPacket {
    count: number;
  }
  const [positions, eligibleResults] = await Promise.all([
    query<PositionRow>(
      "SELECT id, title, enabled FROM positions WHERE election_id = ? AND enabled = TRUE ORDER BY sort_order",
      [electionId],
    ),
    query<CountResult>(
      "SELECT COUNT(*) as count FROM students WHERE voting_approved = TRUE",
    ),
  ]);
  const totalEligible = eligibleResults[0]?.count || 0;

  // Get turnout
  const turnout = await getVoterTurnout(electionId, totalEligible);

  // Get results and winners for all positions in parallel
  const [positionResults, winners] = await Promise.all([
    Promise.all(
      positions.map((pos) => getPositionResults(electionId, pos.id, pos.title)),
    ),
    Promise.all(
      positions.map((pos) => getPositionWinner(electionId, pos.id, pos.title)),
    ),
  ]);

  return {
    turnout,
    positions: positionResults,
    winners,
  };
}

/**
 * Get voting log (recent votes without student info)
 */
export async function getVotingLog(
  electionId: number,
  limit: number = 10,
): Promise<{ id: number; votedAt: Date }[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  const results = await query<VoteHistoryRow>(
    "SELECT id, voted_at FROM vote_history WHERE election_id = ? ORDER BY voted_at DESC LIMIT ?",
    [electionId, limit],
  );

  return results.map((r) => ({
    id: r.id,
    votedAt: r.voted_at,
  }));
}

/**
 * Get total vote count for an election
 */
export async function getTotalVotes(electionId: number): Promise<number> {
  const session = await getCurrentAdmin();
  if (!session) return 0;

  interface CountResult extends RowDataPacket {
    count: number;
  }
  const results = await query<CountResult>(
    "SELECT COUNT(*) as count FROM vote_history WHERE election_id = ?",
    [electionId],
  );
  return results[0]?.count || 0;
}

/**
 * Get participation rate by class level (1-6)
 */
export async function getParticipationByLevel(
  electionId: number,
): Promise<LevelParticipation[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  interface LevelCount extends RowDataPacket {
    level: number;
    count: number;
  }

  // Get total and voted students per level in parallel
  const [totalByLevel, votedByLevel] = await Promise.all([
    query<LevelCount>(
      `SELECT
         CAST(SUBSTRING(class_room, 1, 1) AS UNSIGNED) as level,
         COUNT(*) as count
       FROM students
       WHERE class_room REGEXP '^[1-6]/'
       GROUP BY level
       ORDER BY level`,
    ),
    query<LevelCount>(
      `SELECT
         CAST(SUBSTRING(s.class_room, 1, 1) AS UNSIGNED) as level,
         COUNT(*) as count
       FROM vote_history vh
       JOIN students s ON vh.student_id = s.id
       WHERE vh.election_id = ? AND s.class_room REGEXP '^[1-6]/'
       GROUP BY level
       ORDER BY level`,
      [electionId],
    ),
  ]);

  // Build maps for quick lookup
  const totalMap = new Map<number, number>();
  for (const row of totalByLevel) {
    totalMap.set(row.level, row.count);
  }

  const votedMap = new Map<number, number>();
  for (const row of votedByLevel) {
    votedMap.set(row.level, row.count);
  }

  // Build result for levels 1-6
  const result: LevelParticipation[] = [];
  for (let level = 1; level <= 6; level++) {
    const totalStudents = totalMap.get(level) || 0;
    const voted = votedMap.get(level) || 0;
    const percentage = totalStudents > 0 ? Math.round((voted / totalStudents) * 100) : 0;
    result.push({ level, totalStudents, voted, percentage });
  }

  return result;
}
