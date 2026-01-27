/**
 * Unit tests for student-analytics.ts
 * Tests public election listing and result retrieval with display settings
 */

import type { SessionData } from "@/lib/actions/auth";
import type { StudentRow } from "@/lib/db";

// Mock modules before imports
jest.mock("@/lib/db", () => ({
  query: jest.fn(),
}));

jest.mock("@/lib/actions/auth", () => ({
  getCurrentSession: jest.fn(),
}));

jest.mock("@/lib/actions/public-display", () => ({
  getDisplaySettings: jest.fn(),
}));

jest.mock("@/lib/actions/votes", () => ({
  getVoterTurnout: jest.fn(),
  getPositionResults: jest.fn(),
  getPositionWinner: jest.fn(),
}));

import { getCurrentSession } from "@/lib/actions/auth";
import { getDisplaySettings } from "@/lib/actions/public-display";
import { query } from "@/lib/db";

// Dynamic import after mocking
let getPublicElections: typeof import("@/lib/actions/student-analytics").getPublicElections;
let getPublicElectionResults: typeof import("@/lib/actions/student-analytics").getPublicElectionResults;
let hasVotedInElection: typeof import("@/lib/actions/student-analytics").hasVotedInElection;

beforeAll(async () => {
  const studentAnalyticsModule =
    await import("@/lib/actions/student-analytics");
  getPublicElections = studentAnalyticsModule.getPublicElections;
  getPublicElectionResults = studentAnalyticsModule.getPublicElectionResults;
  hasVotedInElection = studentAnalyticsModule.hasVotedInElection;
});

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedGetCurrentSession = getCurrentSession as jest.MockedFunction<
  typeof getCurrentSession
>;
const mockedGetDisplaySettings = getDisplaySettings as jest.MockedFunction<
  typeof getDisplaySettings
>;

// Helper to create mock SessionData
function createMockSession(studentId: string): SessionData {
  return {
    studentId,
    student: {
      id: studentId,
      national_id: "1234567890123",
      prefix: "นาย",
      name: "Test",
      surname: "User",
      student_no: 1,
      class_room: "3/1",
      role: "STUDENT",
      voting_approved: true,
      voting_approved_at: null,
      voting_approved_by: null,
      last_active: null,
      created_at: new Date(),
      updated_at: new Date(),
    } as StudentRow,
  };
}

describe("getPublicElections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await getPublicElections();
    expect(result).toEqual([]);
  });

  it("identifies active elections correctly", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const futureDate = new Date(Date.now() + 86400000);
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        title: "Active Election",
        type: "student_council",
        end_date: futureDate,
        total_votes: 50,
        is_active: true,
      },
    ] as never);

    const result = await getPublicElections();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("active");
    expect(result[0].canViewResults).toBe(false);
  });

  it("identifies closed elections correctly", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const pastDate = new Date(Date.now() - 86400000);
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        title: "Closed Election",
        type: null,
        end_date: pastDate,
        total_votes: 100,
        is_active: true,
      },
    ] as never);

    mockedGetDisplaySettings.mockResolvedValue({
      electionId: "1",
      isPublished: true,
      globalShowRawScore: true,
      globalShowWinnerOnly: false,
      positionConfigs: [],
    });

    const result = await getPublicElections();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("closed");
    expect(result[0].canViewResults).toBe(true);
  });

  it("sets canViewResults to false when not published", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const pastDate = new Date(Date.now() - 86400000);
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        title: "Unpublished Election",
        type: null,
        end_date: pastDate,
        total_votes: 100,
        is_active: true,
      },
    ] as never);

    mockedGetDisplaySettings.mockResolvedValue({
      electionId: "1",
      isPublished: false,
      globalShowRawScore: true,
      globalShowWinnerOnly: false,
      positionConfigs: [],
    });

    const result = await getPublicElections();

    expect(result[0].canViewResults).toBe(false);
  });
});

describe("getPublicElectionResults", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns error when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await getPublicElectionResults(1, "VOTE-TEST-1234");
    expect(result.success).toBe(false);
    expect(result.message).toBe("กรุณาเข้าสู่ระบบก่อน");
  });

  it("returns error for invalid token", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValueOnce([] as never); // Token query returns empty

    const result = await getPublicElectionResults(1, "VOTE-WRONG-0000");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Token ไม่ถูกต้อง");
  });

  it("returns error when election not found", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    // Token exists
    mockedQuery.mockResolvedValueOnce([{ token: "VOTE-TEST-1234" }] as never);
    // Election not found
    mockedQuery.mockResolvedValueOnce([] as never);

    const result = await getPublicElectionResults(1, "VOTE-TEST-1234");
    expect(result.success).toBe(false);
    expect(result.message).toBe("ไม่พบการเลือกตั้งนี้");
  });

  it("returns error when election not ended", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const futureDate = new Date(Date.now() + 86400000);

    // Token exists
    mockedQuery.mockResolvedValueOnce([{ token: "VOTE-TEST-1234" }] as never);
    // Election exists but not ended
    mockedQuery.mockResolvedValueOnce([
      { id: 1, title: "Active", end_date: futureDate },
    ] as never);

    const result = await getPublicElectionResults(1, "VOTE-TEST-1234");
    expect(result.success).toBe(false);
    expect(result.message).toBe("การเลือกตั้งยังไม่สิ้นสุด");
  });

  it("returns error when results not published", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const pastDate = new Date(Date.now() - 86400000);

    mockedQuery.mockResolvedValueOnce([{ token: "VOTE-TEST-1234" }] as never);
    mockedQuery.mockResolvedValueOnce([
      { id: 1, title: "Closed", end_date: pastDate },
    ] as never);

    mockedGetDisplaySettings.mockResolvedValue({
      electionId: "1",
      isPublished: false,
      globalShowRawScore: true,
      globalShowWinnerOnly: false,
      positionConfigs: [],
    });

    const result = await getPublicElectionResults(1, "VOTE-TEST-1234");
    expect(result.success).toBe(false);
    expect(result.message).toBe("ผลการเลือกตั้งยังไม่ได้เผยแพร่");
  });
});

describe("hasVotedInElection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await hasVotedInElection(1);
    expect(result).toBe(false);
  });

  it("returns true when vote history exists", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([{ id: 1 }] as never);

    const result = await hasVotedInElection(1);
    expect(result).toBe(true);
  });

  it("returns false when no vote history", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([] as never);

    const result = await hasVotedInElection(1);
    expect(result).toBe(false);
  });
});
