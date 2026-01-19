/**
 * Unit tests for lib/vote-store.ts
 * Tests vote recording, retrieval, and statistics functions
 */

import {
  getAllVotes,
  getCandidateVotesAggregate,
  getElectionPrimaryWinner,
  getElectionWinners,
  getPositionResults,
  getPositionWinner,
  getVoterTurnout,
  getVotesByElection,
  getVotingLog,
  hasVoted,
  recordVote,
  resetVoteData,
  type VoteRecord,
} from "@/lib/vote-store";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock CustomEvent and dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, "dispatchEvent", {
  value: mockDispatchEvent,
});

describe("vote-store", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockDispatchEvent.mockClear();
  });

  // ============================================
  // recordVote Tests
  // ============================================
  describe("recordVote", () => {
    it("should record a vote successfully", () => {
      const votes = { president: "candidate1", secretary: "candidate2" };
      const result = recordVote("election1", 6367, votes);

      expect(result).not.toBeNull();
      expect(result?.electionId).toBe("election1");
      expect(result?.studentId).toBe(6367);
      expect(result?.votes).toEqual(votes);
      expect(result?.token).toMatch(/^VOTE-[A-Z0-9]{8}$/);
      expect(result?.timestamp).toBeDefined();
    });

    it("should prevent duplicate votes from same student", () => {
      // Suppress expected console.warn for this test
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      const votes = { president: "candidate1" };

      // First vote
      const firstResult = recordVote("election1", 6367, votes);
      expect(firstResult).not.toBeNull();

      // Second vote attempt
      const secondResult = recordVote("election1", 6367, {
        president: "candidate2",
      });
      expect(secondResult).toBeNull();

      // Verify warning was called
      expect(warnSpy).toHaveBeenCalledWith(
        "Student 6367 already voted in election election1",
      );

      // Only one vote should exist
      const allVotes = getAllVotes();
      expect(allVotes).toHaveLength(1);
      expect(allVotes[0].votes.president).toBe("candidate1");

      warnSpy.mockRestore();
    });

    it("should allow same student to vote in different elections", () => {
      const votes = { president: "candidate1" };

      const result1 = recordVote("election1", 6367, votes);
      const result2 = recordVote("election2", 6367, votes);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      const allVotes = getAllVotes();
      expect(allVotes).toHaveLength(2);
    });

    it("should dispatch custom event after recording", () => {
      recordVote("election1", 6367, { president: "candidate1" });
      expect(mockDispatchEvent).toHaveBeenCalled();
    });
  });

  // ============================================
  // hasVoted Tests
  // ============================================
  describe("hasVoted", () => {
    it("should return false if student has not voted", () => {
      expect(hasVoted("election1", 6367)).toBe(false);
    });

    it("should return true if student has voted", () => {
      recordVote("election1", 6367, { president: "candidate1" });
      expect(hasVoted("election1", 6367)).toBe(true);
    });

    it("should return correct status for different elections", () => {
      recordVote("election1", 6367, { president: "candidate1" });

      expect(hasVoted("election1", 6367)).toBe(true);
      expect(hasVoted("election2", 6367)).toBe(false);
    });
  });

  // ============================================
  // getVotesByElection Tests
  // ============================================
  describe("getVotesByElection", () => {
    it("should return empty array for election with no votes", () => {
      const votes = getVotesByElection("election1");
      expect(votes).toEqual([]);
    });

    it("should return only votes for specified election", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c2" });
      recordVote("election2", 6369, { president: "c1" });

      const votes = getVotesByElection("election1");
      expect(votes).toHaveLength(2);
      expect(votes.every((v) => v.electionId === "election1")).toBe(true);
    });
  });

  // ============================================
  // getVoterTurnout Tests
  // ============================================
  describe("getVoterTurnout", () => {
    it("should calculate turnout correctly", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c2" });

      const turnout = getVoterTurnout("election1", 10);

      expect(turnout.totalEligible).toBe(10);
      expect(turnout.totalVoted).toBe(2);
      expect(turnout.notVoted).toBe(8);
      expect(turnout.percentage).toBe(20);
    });

    it("should handle zero eligible voters", () => {
      const turnout = getVoterTurnout("election1", 0);

      expect(turnout.percentage).toBe(0);
      expect(turnout.notVoted).toBe(0);
    });

    it("should handle more votes than eligible (edge case)", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c2" });
      recordVote("election1", 6369, { president: "c3" });

      const turnout = getVoterTurnout("election1", 2);

      expect(turnout.totalVoted).toBe(3);
      expect(turnout.notVoted).toBe(0); // capped at 0
      expect(turnout.percentage).toBe(150); // can exceed 100%
    });
  });

  // ============================================
  // getPositionResults Tests
  // ============================================
  describe("getPositionResults", () => {
    const candidates = [
      { id: "c1", name: "Candidate 1" },
      { id: "c2", name: "Candidate 2" },
    ];

    it("should count votes correctly per candidate", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c1" });
      recordVote("election1", 6369, { president: "c2" });

      const results = getPositionResults(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(results.totalVotes).toBe(3);
      expect(results.candidates[0].candidateId).toBe("c1");
      expect(results.candidates[0].votes).toBe(2);
      expect(results.candidates[0].percentage).toBe(67);
      expect(results.candidates[1].candidateId).toBe("c2");
      expect(results.candidates[1].votes).toBe(1);
      expect(results.candidates[1].percentage).toBe(33);
    });

    it("should count abstain votes", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "abstain" });

      const results = getPositionResults(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(results.abstainCount).toBe(1);
      expect(results.abstainPercentage).toBe(50);
    });

    it("should sort candidates by votes descending", () => {
      recordVote("election1", 6367, { president: "c2" });
      recordVote("election1", 6368, { president: "c2" });
      recordVote("election1", 6369, { president: "c1" });

      const results = getPositionResults(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(results.candidates[0].candidateId).toBe("c2");
      expect(results.candidates[1].candidateId).toBe("c1");
    });

    it("should handle empty votes", () => {
      const results = getPositionResults(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(results.totalVotes).toBe(0);
      expect(results.candidates[0].votes).toBe(0);
      expect(results.abstainCount).toBe(0);
    });
  });

  // ============================================
  // getCandidateVotesAggregate Tests
  // ============================================
  describe("getCandidateVotesAggregate", () => {
    const candidates = [
      { id: "c1", name: "Alice" },
      { id: "c2", name: "Bob" },
      { id: "c3", name: "Charlie" },
    ];

    it("should aggregate votes across all positions", () => {
      // Candidate appears in multiple positions
      recordVote("election1", 6367, { president: "c1", secretary: "c1" });
      recordVote("election1", 6368, { president: "c2", secretary: "c1" });

      const aggregate = getCandidateVotesAggregate("election1", candidates);

      // c1 should have 3 votes (2 for secretary + 1 for president)
      const c1 = aggregate.find((c) => c.candidateId === "c1");
      expect(c1?.votes).toBe(3);

      // c2 should have 1 vote
      const c2 = aggregate.find((c) => c.candidateId === "c2");
      expect(c2?.votes).toBe(1);

      // c3 should have 0 votes
      const c3 = aggregate.find((c) => c.candidateId === "c3");
      expect(c3?.votes).toBe(0);
    });

    it("should sort by votes descending", () => {
      recordVote("election1", 6367, { president: "c3" });
      recordVote("election1", 6368, { president: "c3" });
      recordVote("election1", 6369, { president: "c1" });

      const aggregate = getCandidateVotesAggregate("election1", candidates);

      expect(aggregate[0].candidateId).toBe("c3");
      expect(aggregate[1].candidateId).toBe("c1");
    });

    it("should exclude abstain from aggregate", () => {
      recordVote("election1", 6367, { president: "c1", secretary: "abstain" });

      const aggregate = getCandidateVotesAggregate("election1", candidates);
      const total = aggregate.reduce((sum, c) => sum + c.votes, 0);

      expect(total).toBe(1); // only c1's vote counts
    });
  });

  // ============================================
  // getVotingLog Tests
  // ============================================
  describe("getVotingLog", () => {
    it("should return recent votes sorted by timestamp", () => {
      recordVote("election1", 6367, { president: "c1" });
      // Small delay to ensure different timestamps
      recordVote("election1", 6368, { president: "c2" });

      const log = getVotingLog("election1", 10);

      expect(log).toHaveLength(2);
      // Most recent first
      expect(new Date(log[0].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(log[1].timestamp).getTime(),
      );
    });

    it("should limit results to specified count", () => {
      for (let i = 0; i < 5; i++) {
        recordVote("election1", 6370 + i, { president: "c1" });
      }

      const log = getVotingLog("election1", 3);
      expect(log).toHaveLength(3);
    });

    it("should return only token, id, and timestamp", () => {
      recordVote("election1", 6367, { president: "c1" });

      const log = getVotingLog("election1", 1);

      expect(log[0]).toHaveProperty("id");
      expect(log[0]).toHaveProperty("token");
      expect(log[0]).toHaveProperty("timestamp");
      // Should not include sensitive data
      expect((log[0] as unknown as VoteRecord).studentId).toBeUndefined();
      expect((log[0] as unknown as VoteRecord).votes).toBeUndefined();
    });
  });

  // ============================================
  // resetVoteData Tests
  // ============================================
  describe("resetVoteData", () => {
    it("should clear all vote data", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c2" });

      expect(getAllVotes()).toHaveLength(2);

      resetVoteData();

      expect(getAllVotes()).toHaveLength(0);
    });

    it("should dispatch event after reset", () => {
      mockDispatchEvent.mockClear();
      resetVoteData();
      expect(mockDispatchEvent).toHaveBeenCalled();
    });
  });

  // ============================================
  // getPositionWinner Tests
  // ============================================
  describe("getPositionWinner", () => {
    const candidates = [
      { id: "c1", name: "Candidate 1" },
      { id: "c2", name: "Candidate 2" },
    ];

    it("should return no_candidates status when no candidates", () => {
      const winner = getPositionWinner("election1", "president", "ประธาน", []);

      expect(winner.status).toBe("no_candidates");
      expect(winner.totalVotes).toBe(0);
    });

    it("should return no_votes status when no votes cast", () => {
      const winner = getPositionWinner(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(winner.status).toBe("no_votes");
      expect(winner.totalVotes).toBe(0);
    });

    it("should return winner status with correct winner", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c1" });
      recordVote("election1", 6369, { president: "c2" });

      const winner = getPositionWinner(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(winner.status).toBe("winner");
      expect(winner.winner?.candidateId).toBe("c1");
      expect(winner.winner?.votes).toBe(2);
      expect(winner.totalVotes).toBe(3);
    });

    it("should return abstain_wins status when abstain has most votes", () => {
      recordVote("election1", 6367, { president: "abstain" });
      recordVote("election1", 6368, { president: "abstain" });
      recordVote("election1", 6369, { president: "c1" });

      const winner = getPositionWinner(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(winner.status).toBe("abstain_wins");
      expect(winner.abstainCount).toBe(2);
    });

    it("should return tie status when multiple candidates have same votes", () => {
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "c2" });

      const winner = getPositionWinner(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      expect(winner.status).toBe("tie");
      expect(winner.tiedCandidates).toHaveLength(2);
    });

    it("should handle winner when abstain count equals candidate votes", () => {
      // When abstain ties with a candidate, candidate wins (abstain must be strictly greater)
      recordVote("election1", 6367, { president: "c1" });
      recordVote("election1", 6368, { president: "abstain" });

      const winner = getPositionWinner(
        "election1",
        "president",
        "ประธาน",
        candidates,
      );

      // c1 has 1 vote, abstain has 1 vote - should be winner (not abstain_wins)
      expect(winner.status).toBe("winner");
      expect(winner.winner?.candidateId).toBe("c1");
    });
  });

  // ============================================
  // getElectionWinners Tests
  // ============================================
  describe("getElectionWinners", () => {
    const positions = [
      { id: "president", title: "ประธาน", enabled: true },
      { id: "secretary", title: "เลขานุการ", enabled: true },
      { id: "disabled_pos", title: "ตำแหน่งปิด", enabled: false },
    ];

    const candidates = [
      { id: "c1", name: "Candidate 1", positionId: "president" },
      { id: "c2", name: "Candidate 2", positionId: "president" },
      { id: "c3", name: "Candidate 3", positionId: "secretary" },
    ];

    it("should return winners for all enabled positions", () => {
      recordVote("election1", 6367, { president: "c1", secretary: "c3" });

      const winners = getElectionWinners("election1", positions, candidates);

      expect(winners).toHaveLength(2); // Only enabled positions
      expect(winners[0].positionId).toBe("president");
      expect(winners[1].positionId).toBe("secretary");
    });

    it("should handle positions with no candidates", () => {
      const positionsWithEmpty = [
        ...positions,
        { id: "empty_pos", title: "ตำแหน่งว่าง", enabled: true },
      ];

      const winners = getElectionWinners(
        "election1",
        positionsWithEmpty,
        candidates,
      );

      const emptyPosWinner = winners.find((w) => w.positionId === "empty_pos");
      expect(emptyPosWinner?.status).toBe("no_candidates");
    });
  });

  // ============================================
  // getElectionPrimaryWinner Tests
  // ============================================
  describe("getElectionPrimaryWinner", () => {
    const positions = [{ id: "president", title: "ประธาน", enabled: true }];

    const candidates = [
      { id: "c1", name: "Candidate 1", positionId: "president" },
    ];

    it("should return primary winner text", () => {
      recordVote("election1", 6367, { president: "c1" });

      const primary = getElectionPrimaryWinner(
        "election1",
        positions,
        candidates,
      );

      expect(primary?.status).toBe("winner");
      expect(primary?.text).toBe("Candidate 1");
    });

    it("should return null when no positions", () => {
      const primary = getElectionPrimaryWinner("election1", [], candidates);

      expect(primary).toBeNull();
    });

    it("should return correct text for abstain wins", () => {
      recordVote("election1", 6367, { president: "abstain" });
      recordVote("election1", 6368, { president: "abstain" });

      const primary = getElectionPrimaryWinner(
        "election1",
        positions,
        candidates,
      );

      expect(primary?.status).toBe("abstain_wins");
      expect(primary?.text).toBe("โหวตไม่เลือก");
    });
  });
});
