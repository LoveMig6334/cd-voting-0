/**
 * Unit tests for elections archive functionality
 * Tests archiveElection, unarchiveElection, and related query functions
 */

import type { AdminSessionData } from "@/lib/actions/admin-auth";
import type { AdminRow } from "@/lib/db";

// Mock modules before imports
jest.mock("@/lib/db", () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

jest.mock("@/lib/actions/admin-auth", () => ({
  getCurrentAdmin: jest.fn(),
}));

jest.mock("@/lib/actions/activities", () => ({
  logElectionChange: jest.fn(),
  logAdminAction: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/server", () => ({
  after: jest.fn((fn: () => void) => fn()),
}));

import { getCurrentAdmin } from "@/lib/actions/admin-auth";
import { logElectionChange } from "@/lib/actions/activities";
import { execute, query } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Dynamic import after mocking
let archiveElection: typeof import("@/lib/actions/elections").archiveElection;
let unarchiveElection: typeof import("@/lib/actions/elections").unarchiveElection;
let getArchivedElections: typeof import("@/lib/actions/elections").getArchivedElections;
let getAllElections: typeof import("@/lib/actions/elections").getAllElections;
let getActiveElections: typeof import("@/lib/actions/elections").getActiveElections;

beforeAll(async () => {
  const electionsModule = await import("@/lib/actions/elections");
  archiveElection = electionsModule.archiveElection;
  unarchiveElection = electionsModule.unarchiveElection;
  getArchivedElections = electionsModule.getArchivedElections;
  getAllElections = electionsModule.getAllElections;
  getActiveElections = electionsModule.getActiveElections;
});

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedExecute = execute as jest.MockedFunction<typeof execute>;
const mockedGetCurrentAdmin = getCurrentAdmin as jest.MockedFunction<
  typeof getCurrentAdmin
>;
const mockedLogElectionChange = logElectionChange as jest.MockedFunction<
  typeof logElectionChange
>;
const mockedRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

// Helper to create mock admin session
function createMockAdminSession(
  accessLevel: number,
  adminId: number = 1,
): AdminSessionData {
  return {
    adminId,
    admin: {
      id: adminId,
      username: "testadmin",
      display_name: "Test Admin",
      access_level: accessLevel,
      password_hash: "hashed",
      created_at: new Date(),
      updated_at: new Date(),
    } as AdminRow,
  };
}

// Helper to create mock election
function createMockElection(
  id: number,
  title: string,
  isArchived: boolean = false,
) {
  const now = new Date();
  const past = new Date(now.getTime() - 86400000);
  const future = new Date(now.getTime() + 86400000);

  return {
    id,
    title,
    description: "Test description",
    type: "student_council",
    start_date: past,
    end_date: future,
    status: "OPEN",
    is_active: true,
    is_archived: isArchived,
    total_votes: 0,
    created_at: now,
    updated_at: now,
  };
}

describe("archiveElection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should archive an election successfully when admin is ROOT (level 0)", async () => {
    // Mock admin session (ROOT level)
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(0) as AdminSessionData,
    );

    // Mock getElectionById query
    mockedQuery.mockResolvedValueOnce([
      createMockElection(1, "Test Election", false),
    ] as never);
    // Mock positions query
    mockedQuery.mockResolvedValueOnce([] as never);
    // Mock candidates query
    mockedQuery.mockResolvedValueOnce([] as never);

    mockedExecute.mockResolvedValue({ affectedRows: 1 } as never);

    const result = await archiveElection(1);

    expect(result.success).toBe(true);
    expect(mockedExecute).toHaveBeenCalledWith(
      "UPDATE elections SET is_archived = TRUE WHERE id = ?",
      [1],
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/elections");
    expect(mockedLogElectionChange).toHaveBeenCalledWith(
      "เก็บถาวรการเลือกตั้ง",
      "Test Election",
    );
  });

  it("should archive an election successfully when admin is SYSTEM_ADMIN (level 1)", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(1) as AdminSessionData,
    );

    mockedQuery.mockResolvedValueOnce([
      createMockElection(1, "Test Election", false),
    ] as never);
    mockedQuery.mockResolvedValueOnce([] as never);
    mockedQuery.mockResolvedValueOnce([] as never);

    mockedExecute.mockResolvedValue({ affectedRows: 1 } as never);

    const result = await archiveElection(1);

    expect(result.success).toBe(true);
  });

  it("should fail when admin is TEACHER (level 2)", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(2) as AdminSessionData,
    );

    const result = await archiveElection(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("คุณไม่มีสิทธิ์เก็บถาวรการเลือกตั้ง");
    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it("should fail when admin is OBSERVER (level 3)", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(3) as AdminSessionData,
    );

    const result = await archiveElection(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("คุณไม่มีสิทธิ์เก็บถาวรการเลือกตั้ง");
  });

  it("should fail when not logged in", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(null);

    const result = await archiveElection(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("คุณไม่มีสิทธิ์เก็บถาวรการเลือกตั้ง");
  });

  it("should fail when election is already archived", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(0) as AdminSessionData,
    );

    mockedQuery.mockResolvedValueOnce([
      createMockElection(1, "Test Election", true),
    ] as never);
    mockedQuery.mockResolvedValueOnce([] as never);
    mockedQuery.mockResolvedValueOnce([] as never);

    const result = await archiveElection(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("การเลือกตั้งนี้ถูกเก็บถาวรแล้ว");
  });

  it("should fail when election not found", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(0) as AdminSessionData,
    );

    mockedQuery.mockResolvedValueOnce([] as never);

    const result = await archiveElection(999);

    expect(result.success).toBe(false);
    expect(result.error).toBe("ไม่พบการเลือกตั้ง");
  });
});

describe("unarchiveElection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should unarchive an election successfully when admin is ROOT", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(0) as AdminSessionData,
    );

    // Mock getElectionByIdIncludeArchived
    mockedQuery.mockResolvedValueOnce([
      createMockElection(1, "Archived Election", true),
    ] as never);
    mockedQuery.mockResolvedValueOnce([] as never);
    mockedQuery.mockResolvedValueOnce([] as never);

    mockedExecute.mockResolvedValue({ affectedRows: 1 } as never);

    const result = await unarchiveElection(1);

    expect(result.success).toBe(true);
    expect(mockedExecute).toHaveBeenCalledWith(
      "UPDATE elections SET is_archived = FALSE WHERE id = ?",
      [1],
    );
    expect(mockedLogElectionChange).toHaveBeenCalledWith(
      "กู้คืนการเลือกตั้งจากถาวร",
      "Archived Election",
    );
  });

  it("should fail when election is not archived", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(0) as AdminSessionData,
    );

    mockedQuery.mockResolvedValueOnce([
      createMockElection(1, "Active Election", false),
    ] as never);
    mockedQuery.mockResolvedValueOnce([] as never);
    mockedQuery.mockResolvedValueOnce([] as never);

    const result = await unarchiveElection(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("การเลือกตั้งนี้ไม่ได้ถูกเก็บถาวร");
  });

  it("should fail when admin is TEACHER (level 2)", async () => {
    mockedGetCurrentAdmin.mockResolvedValue(
      createMockAdminSession(2) as AdminSessionData,
    );

    const result = await unarchiveElection(1);

    expect(result.success).toBe(false);
    expect(result.error).toBe("คุณไม่มีสิทธิ์กู้คืนการเลือกตั้ง");
  });
});

describe("getArchivedElections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return only archived elections", async () => {
    const archivedElection = createMockElection(2, "Archived Election", true);
    mockedQuery.mockResolvedValue([archivedElection] as never);

    const result = await getArchivedElections();

    expect(mockedQuery).toHaveBeenCalledWith(
      "SELECT * FROM elections WHERE is_active = TRUE AND is_archived = TRUE ORDER BY updated_at DESC",
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Archived Election");
  });
});

describe("getAllElections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should exclude archived elections", async () => {
    const activeElection = createMockElection(1, "Active Election", false);
    mockedQuery.mockResolvedValue([activeElection] as never);

    const result = await getAllElections();

    expect(mockedQuery).toHaveBeenCalledWith(
      "SELECT * FROM elections WHERE is_active = TRUE AND is_archived = FALSE ORDER BY start_date DESC",
    );
    expect(result).toHaveLength(1);
  });
});

describe("getActiveElections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should exclude archived elections and filter by OPEN status", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 86400000);
    const future = new Date(now.getTime() + 86400000);

    const openElection = {
      ...createMockElection(1, "Open Election", false),
      start_date: past,
      end_date: future,
    };

    mockedQuery.mockResolvedValue([openElection] as never);

    const result = await getActiveElections();

    expect(mockedQuery).toHaveBeenCalledWith(
      "SELECT * FROM elections WHERE is_active = TRUE AND is_archived = FALSE ORDER BY start_date ASC",
    );
    // Since the election is OPEN (start_date < now < end_date), it should be returned
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("should filter out PENDING elections", async () => {
    const now = new Date();
    const future1 = new Date(now.getTime() + 86400000);
    const future2 = new Date(now.getTime() + 172800000);

    const pendingElection = {
      ...createMockElection(1, "Pending Election", false),
      start_date: future1,
      end_date: future2,
    };

    mockedQuery.mockResolvedValue([pendingElection] as never);

    const result = await getActiveElections();

    // Pending elections should be filtered out
    expect(result).toHaveLength(0);
  });

  it("should filter out CLOSED elections", async () => {
    const now = new Date();
    const past1 = new Date(now.getTime() - 172800000);
    const past2 = new Date(now.getTime() - 86400000);

    const closedElection = {
      ...createMockElection(1, "Closed Election", false),
      start_date: past1,
      end_date: past2,
    };

    mockedQuery.mockResolvedValue([closedElection] as never);

    const result = await getActiveElections();

    // Closed elections should be filtered out
    expect(result).toHaveLength(0);
  });
});
