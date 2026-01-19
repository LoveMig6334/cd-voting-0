/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { formatThaiDate, useDashboardData } from "../hooks/useDashboardData";

// Mock all dependent stores
jest.mock("../lib/election-store", () => ({
  getAllElections: jest.fn(),
  updateElection: jest.fn(),
  subscribeToElections: jest.fn(() => jest.fn()),
}));

jest.mock("../lib/vote-store", () => ({
  getVotesByElection: jest.fn(),
  getVoterTurnout: jest.fn(),
  getCandidateVotesAggregate: jest.fn(),
  subscribeToVotes: jest.fn(() => jest.fn()),
}));

jest.mock("../lib/student-store", () => ({
  getAllStudents: jest.fn(),
  getStudentStats: jest.fn(),
  subscribeToStudents: jest.fn(() => jest.fn()),
}));

jest.mock("../lib/activity-store", () => ({
  getRecentActivitiesForDisplay: jest.fn(),
  subscribeToActivities: jest.fn(() => jest.fn()),
  logElectionChange: jest.fn(),
}));

// Import mocked modules
import {
  getRecentActivitiesForDisplay,
  logElectionChange,
  subscribeToActivities,
} from "../lib/activity-store";
import {
  getAllElections,
  subscribeToElections,
  updateElection,
} from "../lib/election-store";
import { getStudentStats, subscribeToStudents } from "../lib/student-store";
import {
  getCandidateVotesAggregate,
  getVoterTurnout,
  getVotesByElection,
  subscribeToVotes,
} from "../lib/vote-store";

const mockGetAllElections = getAllElections as jest.MockedFunction<
  typeof getAllElections
>;
const mockUpdateElection = updateElection as jest.MockedFunction<
  typeof updateElection
>;
const mockSubscribeToElections = subscribeToElections as jest.MockedFunction<
  typeof subscribeToElections
>;
const mockGetVotesByElection = getVotesByElection as jest.MockedFunction<
  typeof getVotesByElection
>;
const mockGetVoterTurnout = getVoterTurnout as jest.MockedFunction<
  typeof getVoterTurnout
>;
const mockGetCandidateVotesAggregate =
  getCandidateVotesAggregate as jest.MockedFunction<
    typeof getCandidateVotesAggregate
  >;
const mockSubscribeToVotes = subscribeToVotes as jest.MockedFunction<
  typeof subscribeToVotes
>;
const mockGetStudentStats = getStudentStats as jest.MockedFunction<
  typeof getStudentStats
>;
const mockSubscribeToStudents = subscribeToStudents as jest.MockedFunction<
  typeof subscribeToStudents
>;
const mockGetRecentActivitiesForDisplay =
  getRecentActivitiesForDisplay as jest.MockedFunction<
    typeof getRecentActivitiesForDisplay
  >;
const mockSubscribeToActivities = subscribeToActivities as jest.MockedFunction<
  typeof subscribeToActivities
>;
const mockLogElectionChange = logElectionChange as jest.MockedFunction<
  typeof logElectionChange
>;

describe("useDashboardData", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockGetStudentStats.mockReturnValue({
      total: 100,
      approved: 80,
      pending: 20,
      byClassroom: {},
    });

    mockGetAllElections.mockReturnValue([]);
    mockGetVotesByElection.mockReturnValue([]);
    mockGetVoterTurnout.mockReturnValue({
      totalEligible: 100,
      totalVoted: 0,
      notVoted: 100,
      percentage: 0,
    });
    mockGetCandidateVotesAggregate.mockReturnValue([]);
    mockGetRecentActivitiesForDisplay.mockReturnValue([]);

    // Mock subscription returns
    mockSubscribeToElections.mockReturnValue(jest.fn());
    mockSubscribeToVotes.mockReturnValue(jest.fn());
    mockSubscribeToStudents.mockReturnValue(jest.fn());
    mockSubscribeToActivities.mockReturnValue(jest.fn());
  });

  describe("totalStudents", () => {
    it("should return total students from student-store", async () => {
      mockGetStudentStats.mockReturnValue({
        total: 1500,
        approved: 1200,
        pending: 300,
        byClassroom: {},
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalStudents).toBe(1500);
    });
  });

  describe("activeElections", () => {
    it('should count elections with status "open"', async () => {
      mockGetAllElections.mockReturnValue([
        {
          id: "1",
          title: "Election 1",
          description: "",
          type: "student-committee",
          status: "open",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "2",
          title: "Election 2",
          description: "",
          type: "student-committee",
          status: "closed",
          startDate: "2025-01-01",
          endDate: "2025-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "3",
          title: "Election 3",
          description: "",
          type: "student-committee",
          status: "open",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
      ]);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeElections).toBe(2);
    });

    it("should return 0 when no elections are open", async () => {
      mockGetAllElections.mockReturnValue([
        {
          id: "1",
          title: "Election 1",
          description: "",
          type: "student-committee",
          status: "closed",
          startDate: "2025-01-01",
          endDate: "2025-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
      ]);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.activeElections).toBe(0);
    });
  });

  describe("totalVotesInActiveElections", () => {
    it("should sum votes from all active elections", async () => {
      mockGetAllElections.mockReturnValue([
        {
          id: "1",
          title: "Election 1",
          description: "",
          type: "student-committee",
          status: "open",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "2",
          title: "Election 2",
          description: "",
          type: "student-committee",
          status: "open",
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
      ]);

      mockGetVotesByElection.mockImplementation((electionId: string) => {
        if (electionId === "1")
          return [
            {
              id: "v1",
              electionId: "1",
              studentId: 1,
              votes: {},
              timestamp: "",
              token: "",
            },
            {
              id: "v2",
              electionId: "1",
              studentId: 2,
              votes: {},
              timestamp: "",
              token: "",
            },
          ];
        if (electionId === "2")
          return [
            {
              id: "v3",
              electionId: "2",
              studentId: 3,
              votes: {},
              timestamp: "",
              token: "",
            },
          ];
        return [];
      });

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalVotesInActiveElections).toBe(3);
    });
  });

  describe("primaryActiveElection", () => {
    it("should return first active election with data", async () => {
      mockGetAllElections.mockReturnValue([
        {
          id: "1",
          title: "สภานักเรียน 2568",
          description: "การเลือกตั้งสภานักเรียน",
          type: "student-committee" as const,
          status: "open" as const,
          startDate: "2026-01-20T08:00:00Z",
          endDate: "2026-01-24T17:00:00Z",
          positions: [
            { id: "p1", title: "ประธาน", icon: "person", enabled: true },
          ],
          candidates: [
            {
              id: "c1",
              positionId: "p1",
              name: "Sarah",
              slogan: "",
              imageUrl: "",
              rank: 1,
            },
          ],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
      ]);

      mockGetVoterTurnout.mockReturnValue({
        totalEligible: 100,
        totalVoted: 58,
        notVoted: 42,
        percentage: 58,
      });

      mockGetCandidateVotesAggregate.mockReturnValue([
        {
          candidateId: "c1",
          candidateName: "Sarah",
          votes: 58,
          percentage: 100,
        },
      ]);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.primaryActiveElection).not.toBeNull();
      expect(result.current.primaryActiveElection?.title).toBe(
        "สภานักเรียน 2568",
      );
      expect(
        result.current.primaryActiveElection?.voterTurnout.percentage,
      ).toBe(58);
    });

    it("should return null when no active elections", async () => {
      mockGetAllElections.mockReturnValue([]);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.primaryActiveElection).toBeNull();
    });
  });

  describe("topCandidates", () => {
    it("should return top 3 candidates from primary position", async () => {
      mockGetAllElections.mockReturnValue([
        {
          id: "1",
          title: "Election",
          description: "",
          type: "student-committee" as const,
          status: "open" as const,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          positions: [
            { id: "p1", title: "ประธาน", icon: "person", enabled: true },
          ],
          candidates: [
            {
              id: "c1",
              positionId: "p1",
              name: "Alice",
              slogan: "",
              imageUrl: "",
              rank: 1,
            },
            {
              id: "c2",
              positionId: "p1",
              name: "Bob",
              slogan: "",
              imageUrl: "",
              rank: 2,
            },
            {
              id: "c3",
              positionId: "p1",
              name: "Charlie",
              slogan: "",
              imageUrl: "",
              rank: 3,
            },
            {
              id: "c4",
              positionId: "p1",
              name: "Diana",
              slogan: "",
              imageUrl: "",
              rank: 4,
            },
          ],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
      ]);

      mockGetCandidateVotesAggregate.mockReturnValue([
        {
          candidateId: "c1",
          candidateName: "Alice",
          votes: 45,
          percentage: 45,
        },
        { candidateId: "c2", candidateName: "Bob", votes: 30, percentage: 30 },
        {
          candidateId: "c3",
          candidateName: "Charlie",
          votes: 15,
          percentage: 15,
        },
        {
          candidateId: "c4",
          candidateName: "Diana",
          votes: 10,
          percentage: 10,
        },
      ]);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const topCandidates = result.current.primaryActiveElection?.topCandidates;
      expect(topCandidates?.length).toBe(3);
      expect(topCandidates?.[0].name).toBe("Alice");
      expect(topCandidates?.[1].name).toBe("Bob");
      expect(topCandidates?.[2].name).toBe("Charlie");
    });
  });

  describe("closeElection", () => {
    it("should update election status and log activity", async () => {
      mockGetAllElections.mockReturnValue([
        {
          id: "1",
          title: "Test Election",
          description: "",
          type: "student-committee" as const,
          status: "open" as const,
          startDate: "2026-01-01",
          endDate: "2026-12-31",
          positions: [],
          candidates: [],
          totalVotes: 0,
          createdAt: "",
          updatedAt: "",
        },
      ]);

      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.closeElection("1");
      });

      expect(mockUpdateElection).toHaveBeenCalledWith("1", expect.any(Object));
      expect(mockLogElectionChange).toHaveBeenCalledWith(
        "ปิดการเลือกตั้ง",
        "Test Election",
      );
    });
  });

  describe("subscriptions", () => {
    it("should subscribe to all data stores on mount", async () => {
      renderHook(() => useDashboardData());

      expect(mockSubscribeToElections).toHaveBeenCalled();
      expect(mockSubscribeToVotes).toHaveBeenCalled();
      expect(mockSubscribeToStudents).toHaveBeenCalled();
      expect(mockSubscribeToActivities).toHaveBeenCalled();
    });

    it("should unsubscribe from all stores on unmount", async () => {
      const unsubElections = jest.fn();
      const unsubVotes = jest.fn();
      const unsubStudents = jest.fn();
      const unsubActivities = jest.fn();

      mockSubscribeToElections.mockReturnValue(unsubElections);
      mockSubscribeToVotes.mockReturnValue(unsubVotes);
      mockSubscribeToStudents.mockReturnValue(unsubStudents);
      mockSubscribeToActivities.mockReturnValue(unsubActivities);

      const { unmount } = renderHook(() => useDashboardData());

      unmount();

      expect(unsubElections).toHaveBeenCalled();
      expect(unsubVotes).toHaveBeenCalled();
      expect(unsubStudents).toHaveBeenCalled();
      expect(unsubActivities).toHaveBeenCalled();
    });
  });

  describe("systemStatus", () => {
    it('should return "online" by default', async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.systemStatus).toBe("online");
    });
  });
});

describe("formatThaiDate", () => {
  it("should format date to Thai format", () => {
    // January 20, 2026 at 08:00
    const result = formatThaiDate("2026-01-20T08:00:00Z");
    // Note: Exact output depends on timezone, but should contain day, month, time
    expect(result).toContain("ม.ค.");
    expect(result).toContain("น.");
  });

  it("should format month correctly", () => {
    const months = [
      { date: "2026-01-15T10:00:00Z", month: "ม.ค." },
      { date: "2026-06-15T10:00:00Z", month: "มิ.ย." },
      { date: "2026-12-15T10:00:00Z", month: "ธ.ค." },
    ];

    months.forEach(({ date, month }) => {
      expect(formatThaiDate(date)).toContain(month);
    });
  });

  it("should pad hours and minutes with zeros", () => {
    const result = formatThaiDate("2026-01-20T01:05:00Z");
    // Result should contain properly padded time
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});
