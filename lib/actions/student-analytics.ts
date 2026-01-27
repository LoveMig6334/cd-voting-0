"use server";

import {
  CandidateRow,
  ElectionRow,
  PositionRow,
  query,
  StudentRow,
  VoteTokenRow,
} from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { getCurrentSession } from "./auth";
import { getDisplaySettings } from "./public-display";
import {
  getPositionResults,
  getPositionWinner,
  getVoterTurnout,
} from "./votes";

// ==========================================
// Types
// ==========================================

export interface PublicElectionSummary {
  id: number;
  title: string;
  type: string | null;
  endDate: Date;
  status: "active" | "closed";
  totalVotes: number;
  canViewResults: boolean;
}

export interface PublicPositionResult {
  positionId: string;
  positionTitle: string;
  winner?: {
    name: string;
    imageUrl: string | null;
    votes: number;
  };
  candidates?: {
    candidateId: number;
    name: string;
    rank: number;
    votes: number;
    percentage: number;
    imageUrl: string | null;
  }[];
  abstainCount: number;
  abstainPercentage: number;
  showRawScore: boolean;
  showWinnerOnly: boolean;
  skip: boolean;
}

export interface VoterTurnoutData {
  totalEligible: number;
  totalVoted: number;
  notVoted: number;
  percentage: number;
}

export interface PublicElectionResult {
  election: {
    id: number;
    title: string;
    type: string | null;
    endDate: Date;
  };
  turnout: VoterTurnoutData;
  positions: PublicPositionResult[];
}

// ==========================================
// Query Functions
// ==========================================

/**
 * Get all elections for public viewing
 * Returns closed elections that have been published
 */
export async function getPublicElections(): Promise<PublicElectionSummary[]> {
  const session = await getCurrentSession();
  if (!session) {
    return [];
  }

  const elections = await query<ElectionRow>(
    `SELECT * FROM elections 
     WHERE is_active = TRUE 
     ORDER BY end_date DESC`,
  );

  const now = new Date();

  const results: PublicElectionSummary[] = [];

  for (const election of elections) {
    const endDate = new Date(election.end_date);
    const isClosed = endDate <= now;

    // Check if results are published
    let canViewResults = false;
    if (isClosed) {
      const displaySettings = await getDisplaySettings(election.id);
      canViewResults = displaySettings?.isPublished ?? false;
    }

    results.push({
      id: election.id,
      title: election.title,
      type: election.type,
      endDate: election.end_date,
      status: isClosed ? "closed" : "active",
      totalVotes: election.total_votes,
      canViewResults,
    });
  }

  return results;
}

/**
 * Verify vote token and get election results
 */
export async function getPublicElectionResults(
  electionId: number,
  token: string,
): Promise<{
  success: boolean;
  message?: string;
  data?: PublicElectionResult;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  }

  // 1. Verify token
  const tokenResults = await query<VoteTokenRow>(
    `SELECT * FROM vote_tokens 
     WHERE student_id = ? AND election_id = ? AND token = ?`,
    [session.studentId, electionId, token.toUpperCase().trim()],
  );

  if (tokenResults.length === 0) {
    return {
      success: false,
      message: "Token ไม่ถูกต้องหรือไม่ตรงกับการเลือกตั้งนี้",
    };
  }

  // 2. Get election data
  const [election] = await query<ElectionRow>(
    "SELECT * FROM elections WHERE id = ?",
    [electionId],
  );

  if (!election) {
    return { success: false, message: "ไม่พบการเลือกตั้งนี้" };
  }

  // 3. Check if election is closed
  const now = new Date();
  if (new Date(election.end_date) > now) {
    return { success: false, message: "การเลือกตั้งยังไม่สิ้นสุด" };
  }

  // 4. Get display settings
  const displaySettings = await getDisplaySettings(electionId);
  if (!displaySettings?.isPublished) {
    return { success: false, message: "ผลการเลือกตั้งยังไม่ได้เผยแพร่" };
  }

  // 5. Get voter turnout
  // Need to get total eligible voters (all students with voting rights)
  const students = await query<StudentRow>(
    "SELECT COUNT(*) as count FROM students WHERE voting_approved = TRUE",
  );
  const totalEligible =
    (students[0] as unknown as { count: number })?.count || 0;
  const turnout = await getVoterTurnout(electionId, totalEligible);

  // 6. Get positions
  const positions = await query<PositionRow>(
    "SELECT * FROM positions WHERE election_id = ? AND enabled = TRUE ORDER BY sort_order",
    [electionId],
  );

  // 7. Build position results
  const positionResults: PublicPositionResult[] = [];

  for (const position of positions) {
    // Find position-specific config
    const positionConfig = displaySettings.positionConfigs.find(
      (c) => c.positionId === position.id,
    );

    // Determine display settings for this position
    const showRawScore =
      positionConfig?.showRawScore ?? displaySettings.globalShowRawScore;
    const showWinnerOnly =
      positionConfig?.showWinnerOnly ?? displaySettings.globalShowWinnerOnly;
    const skip = positionConfig?.skip ?? false;

    // Skip this position if configured to skip
    if (skip) {
      continue;
    }

    // Get raw results
    const rawResults = await getPositionResults(
      electionId,
      position.id,
      position.title,
    );
    const winnerData = await getPositionWinner(
      electionId,
      position.id,
      position.title,
    );

    // Get candidate images
    const candidateImages = await query<CandidateRow>(
      "SELECT id, name, image_url FROM candidates WHERE election_id = ? AND position_id = ?",
      [electionId, position.id],
    );
    const imageMap = new Map(candidateImages.map((c) => [c.id, c.image_url]));

    const result: PublicPositionResult = {
      positionId: position.id,
      positionTitle: position.title,
      abstainCount: rawResults.abstainCount,
      abstainPercentage: rawResults.abstainPercentage,
      showRawScore,
      showWinnerOnly,
      skip: false,
    };

    // Add winner if available
    if (winnerData.status === "winner" && winnerData.winner) {
      result.winner = {
        name: winnerData.winner.candidateName,
        votes: showRawScore ? winnerData.winner.votes : 0,
        imageUrl: imageMap.get(winnerData.winner.candidateId) || null,
      };
    }

    // Add all candidates if showRawScore and not showWinnerOnly
    if (showRawScore && !showWinnerOnly) {
      result.candidates = rawResults.candidates.map((c) => ({
        candidateId: c.candidateId,
        name: c.candidateName,
        rank: c.rank,
        votes: c.votes,
        percentage: c.percentage,
        imageUrl: imageMap.get(c.candidateId) || null,
      }));
    }

    positionResults.push(result);
  }

  return {
    success: true,
    data: {
      election: {
        id: election.id,
        title: election.title,
        type: election.type,
        endDate: election.end_date,
      },
      turnout: {
        totalEligible: turnout.totalEligible,
        totalVoted: turnout.totalVoted,
        notVoted: turnout.notVoted,
        percentage: turnout.percentage,
      },
      positions: positionResults,
    },
  };
}

/**
 * Check if student has voted in an election (for showing token input hint)
 */
export async function hasVotedInElection(electionId: number): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) {
    return false;
  }

  const results = await query<RowDataPacket>(
    "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ?",
    [session.studentId, electionId],
  );

  return results.length > 0;
}
