// Vote Data Store - localStorage-based mock backend
// This module provides operations for recording and retrieving votes

import { generateId } from "./election-types";

const STORAGE_KEY = "cd-voting-votes";
const STORAGE_EVENT_NAME = "votes-updated";

// ============================================
// Types
// ============================================

/**
 * Individual vote record for a student
 */
export interface VoteRecord {
  id: string;
  electionId: string;
  studentId: number;
  votes: Record<string, string>; // positionId -> candidateId (or "abstain")
  timestamp: string;
  token: string;
}

/**
 * Vote count for a single candidate or abstain option
 */
export interface CandidateVoteCount {
  candidateId: string;
  candidateName: string;
  votes: number;
  percentage: number;
}

/**
 * Results for a single position
 */
export interface PositionVoteResult {
  positionId: string;
  positionTitle: string;
  totalVotes: number;
  candidates: CandidateVoteCount[];
  abstainCount: number;
  abstainPercentage: number;
}

/**
 * Summary of voter turnout
 */
export interface VoterTurnout {
  totalEligible: number;
  totalVoted: number;
  notVoted: number;
  percentage: number;
}

/**
 * Complete election results summary
 */
export interface ElectionResultsSummary {
  electionId: string;
  voterTurnout: VoterTurnout;
  positionResults: PositionVoteResult[];
  allCandidateVotes: CandidateVoteCount[];
}

// ============================================
// Storage Operations
// ============================================

/**
 * Get all vote records from localStorage
 */
export function getAllVotes(): VoteRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load votes:", error);
    return [];
  }
}

/**
 * Save all votes to localStorage
 */
function saveVotes(votes: VoteRecord[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));

  // Dispatch custom event for real-time sync
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}

// ============================================
// Vote Recording
// ============================================

/**
 * Generate a vote token for verification
 */
function generateVoteToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "VOTE-";
  for (let i = 0; i < 8; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Record a vote for a student
 * @returns The created vote record or null if already voted
 */
export function recordVote(
  electionId: string,
  studentId: number,
  votes: Record<string, string>,
): VoteRecord | null {
  const allVotes = getAllVotes();

  // Check if student already voted in this election
  const existingVote = allVotes.find(
    (v) => v.electionId === electionId && v.studentId === studentId,
  );

  if (existingVote) {
    console.warn(
      `Student ${studentId} already voted in election ${electionId}`,
    );
    return null;
  }

  const newVote: VoteRecord = {
    id: generateId(),
    electionId,
    studentId,
    votes,
    timestamp: new Date().toISOString(),
    token: generateVoteToken(),
  };

  allVotes.push(newVote);
  saveVotes(allVotes);

  return newVote;
}

/**
 * Check if a student has already voted in an election
 */
export function hasVoted(electionId: string, studentId: number): boolean {
  const allVotes = getAllVotes();
  return allVotes.some(
    (v) => v.electionId === electionId && v.studentId === studentId,
  );
}

// ============================================
// Vote Retrieval
// ============================================

/**
 * Get all votes for a specific election
 */
export function getVotesByElection(electionId: string): VoteRecord[] {
  const allVotes = getAllVotes();
  return allVotes.filter((v) => v.electionId === electionId);
}

/**
 * Get vote records (for voting log display)
 */
export function getVotingLog(
  electionId: string,
  limit: number = 10,
): Pick<VoteRecord, "id" | "token" | "timestamp">[] {
  const votes = getVotesByElection(electionId);
  return votes
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit)
    .map((v) => ({
      id: v.id,
      token: v.token,
      timestamp: v.timestamp,
    }));
}

// ============================================
// Statistics Functions
// ============================================

/**
 * Calculate voter turnout statistics
 */
export function getVoterTurnout(
  electionId: string,
  totalEligibleVoters: number,
): VoterTurnout {
  const votes = getVotesByElection(electionId);
  const totalVoted = votes.length;
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
 * Get vote results for a specific position
 */
export function getPositionResults(
  electionId: string,
  positionId: string,
  positionTitle: string,
  candidates: { id: string; name: string }[],
): PositionVoteResult {
  const votes = getVotesByElection(electionId);

  // Count votes for each candidate and abstain
  const voteCounts: Record<string, number> = {};
  let abstainCount = 0;
  let totalVotes = 0;

  // Initialize counts
  candidates.forEach((c) => {
    voteCounts[c.id] = 0;
  });

  // Count votes
  votes.forEach((vote) => {
    const candidateId = vote.votes[positionId];
    if (candidateId) {
      totalVotes++;
      if (candidateId === "abstain") {
        abstainCount++;
      } else if (voteCounts[candidateId] !== undefined) {
        voteCounts[candidateId]++;
      }
    }
  });

  // Build candidate results
  const candidateResults: CandidateVoteCount[] = candidates.map((c) => ({
    candidateId: c.id,
    candidateName: c.name,
    votes: voteCounts[c.id] || 0,
    percentage:
      totalVotes > 0 ? Math.round((voteCounts[c.id] / totalVotes) * 100) : 0,
  }));

  // Sort by votes (descending)
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
 * Get aggregated vote counts for all candidates (across all positions)
 * Used for the overall candidate bar chart
 */
export function getCandidateVotesAggregate(
  electionId: string,
  candidates: { id: string; name: string }[],
): CandidateVoteCount[] {
  const votes = getVotesByElection(electionId);

  // Count all votes for each candidate
  const voteCounts: Record<string, number> = {};
  candidates.forEach((c) => {
    voteCounts[c.id] = 0;
  });

  // Count votes across all positions
  votes.forEach((vote) => {
    Object.values(vote.votes).forEach((candidateId) => {
      if (candidateId !== "abstain" && voteCounts[candidateId] !== undefined) {
        voteCounts[candidateId]++;
      }
    });
  });

  // Calculate total
  const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + v, 0);

  // Build results
  const results: CandidateVoteCount[] = candidates.map((c) => ({
    candidateId: c.id,
    candidateName: c.name,
    votes: voteCounts[c.id] || 0,
    percentage:
      totalVotes > 0 ? Math.round((voteCounts[c.id] / totalVotes) * 100) : 0,
  }));

  // Sort by votes (descending)
  results.sort((a, b) => b.votes - a.votes);

  return results;
}

// ============================================
// Subscription for Real-time Sync
// ============================================

export type VoteListener = (votes: VoteRecord[]) => void;

/**
 * Subscribe to vote changes
 */
export function subscribeToVotes(listener: VoteListener): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(getAllVotes());
    }
  };

  const handleCustomEvent = () => {
    listener(getAllVotes());
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  };
}

// ============================================
// Reset (for testing)
// ============================================

/**
 * Clear all vote data
 */
export function resetVoteData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}
