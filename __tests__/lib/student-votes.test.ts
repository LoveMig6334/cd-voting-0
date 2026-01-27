/**
 * Unit tests for student-votes.ts
 * Tests vote history retrieval, token verification, and status logic
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

import { getCurrentSession } from "@/lib/actions/auth";
import { query } from "@/lib/db";

// Dynamic import after mocking
let getStudentVoteHistory: typeof import("@/lib/actions/student-votes").getStudentVoteHistory;
let getStudentVoteHistoryByStatus: typeof import("@/lib/actions/student-votes").getStudentVoteHistoryByStatus;
let verifyVoteToken: typeof import("@/lib/actions/student-votes").verifyVoteToken;
let hasTokenForElection: typeof import("@/lib/actions/student-votes").hasTokenForElection;
let getStudentToken: typeof import("@/lib/actions/student-votes").getStudentToken;

beforeAll(async () => {
  const studentVotesModule = await import("@/lib/actions/student-votes");
  getStudentVoteHistory = studentVotesModule.getStudentVoteHistory;
  getStudentVoteHistoryByStatus =
    studentVotesModule.getStudentVoteHistoryByStatus;
  verifyVoteToken = studentVotesModule.verifyVoteToken;
  hasTokenForElection = studentVotesModule.hasTokenForElection;
  getStudentToken = studentVotesModule.getStudentToken;
});

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedGetCurrentSession = getCurrentSession as jest.MockedFunction<
  typeof getCurrentSession
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

describe("getStudentVoteHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await getStudentVoteHistory();
    expect(result).toEqual([]);
  });

  it("returns vote history with correct status for closed election", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const pastDate = new Date(Date.now() - 86400000); // Yesterday
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        election_id: 10,
        voted_at: new Date(),
        title: "Test Election",
        type: "student_council",
        end_date: pastDate,
        token: "VOTE-TEST-1234",
      },
    ] as never);

    const result = await getStudentVoteHistory();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("confirmed");
    expect(result[0].token).toBe("VOTE-TEST-1234");
  });

  it("returns vote history with pending status for active election", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        election_id: 10,
        voted_at: new Date(),
        title: "Active Election",
        type: "class_leader",
        end_date: futureDate,
        token: "VOTE-ACTV-5678",
      },
    ] as never);

    const result = await getStudentVoteHistory();

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("pending");
  });

  it("returns N/A for token when token is null", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const pastDate = new Date(Date.now() - 86400000);
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        election_id: 10,
        voted_at: new Date(),
        title: "Old Election",
        type: null,
        end_date: pastDate,
        token: null,
      },
    ] as never);

    const result = await getStudentVoteHistory();

    expect(result[0].token).toBe("N/A");
  });
});

describe("getStudentVoteHistoryByStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("filters by pending status", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        election_id: 10,
        voted_at: new Date(),
        title: "Active",
        type: null,
        end_date: futureDate,
        token: "VOTE-1111-1111",
      },
      {
        id: 2,
        election_id: 11,
        voted_at: new Date(),
        title: "Closed",
        type: null,
        end_date: pastDate,
        token: "VOTE-2222-2222",
      },
    ] as never);

    const result = await getStudentVoteHistoryByStatus("pending");

    expect(result).toHaveLength(1);
    expect(result[0].electionTitle).toBe("Active");
  });

  it("returns all records when filter is 'all'", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 86400000);
    mockedQuery.mockResolvedValue([
      {
        id: 1,
        election_id: 10,
        voted_at: new Date(),
        title: "Active",
        type: null,
        end_date: futureDate,
        token: "VOTE-1111-1111",
      },
      {
        id: 2,
        election_id: 11,
        voted_at: new Date(),
        title: "Closed",
        type: null,
        end_date: pastDate,
        token: "VOTE-2222-2222",
      },
    ] as never);

    const result = await getStudentVoteHistoryByStatus("all");

    expect(result).toHaveLength(2);
  });
});

describe("verifyVoteToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns invalid when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await verifyVoteToken(1, "VOTE-TEST-1234");
    expect(result.valid).toBe(false);
    expect(result.message).toBe("กรุณาเข้าสู่ระบบก่อน");
  });

  it("returns valid for correct token", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([{ token: "VOTE-TEST-1234" }] as never);

    const result = await verifyVoteToken(1, "VOTE-TEST-1234");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("Token ถูกต้อง");
  });

  it("returns invalid for wrong token", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([] as never);

    const result = await verifyVoteToken(1, "VOTE-WRONG-0000");
    expect(result.valid).toBe(false);
  });

  it("normalizes token to uppercase", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([{ token: "VOTE-TEST-1234" }] as never);

    await verifyVoteToken(1, "vote-test-1234");

    expect(mockedQuery).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(["VOTE-TEST-1234"]),
    );
  });
});

describe("hasTokenForElection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await hasTokenForElection(1);
    expect(result).toBe(false);
  });

  it("returns true when token exists", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([{ id: 1 }] as never);

    const result = await hasTokenForElection(1);
    expect(result).toBe(true);
  });

  it("returns false when no token", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([] as never);

    const result = await hasTokenForElection(1);
    expect(result).toBe(false);
  });
});

describe("getStudentToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when not logged in", async () => {
    mockedGetCurrentSession.mockResolvedValue(null);

    const result = await getStudentToken(1);
    expect(result).toBeNull();
  });

  it("returns token when it exists", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([{ token: "VOTE-TEST-9999" }] as never);

    const result = await getStudentToken(1);
    expect(result).toBe("VOTE-TEST-9999");
  });

  it("returns null when no token exists", async () => {
    mockedGetCurrentSession.mockResolvedValue(createMockSession("1234"));

    mockedQuery.mockResolvedValue([] as never);

    const result = await getStudentToken(1);
    expect(result).toBeNull();
  });
});
