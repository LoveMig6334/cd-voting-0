import { updateElectionStatus } from "@/lib/actions/elections";
import { execute, query } from "@/lib/db";

// Mock the DB layer
jest.mock("@/lib/db", () => ({
  execute: jest.fn(),
  query: jest.fn(),
}));

// Mock Next.js revalidatePath
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock Activities
jest.mock("@/lib/actions/activities", () => ({
  logElectionChange: jest.fn(),
}));

describe("Admin Dashboard Server Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("updateElectionStatus", () => {
    it("should update status to OPEN and adjust dates if needed", async () => {
      const mockElection = {
        id: 1,
        title: "Test Election",
        start_date: new Date(Date.now() - 86400000), // yesterday
        end_date: new Date(Date.now() - 3600000), // 1 hour ago
      };

      (query as jest.Mock).mockResolvedValue([mockElection]);
      (execute as jest.Mock).mockResolvedValue({ affectedRows: 1 });

      const result = await updateElectionStatus(1, "OPEN");

      expect(result.success).toBe(true);
      // Should have called update once
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE elections SET status = ?, start_date = ?, end_date = ? WHERE id = ?",
        ),
        expect.any(Array),
      );
    });

    it("should update status to CLOSED and set end_date to now", async () => {
      const mockElection = {
        id: 1,
        title: "Test Election",
        start_date: new Date(Date.now() - 86400000),
        end_date: new Date(Date.now() + 86400000),
      };

      (query as jest.Mock).mockResolvedValue([mockElection]);
      (execute as jest.Mock).mockResolvedValue({ affectedRows: 1 });

      const result = await updateElectionStatus(1, "CLOSED");

      expect(result.success).toBe(true);
      expect(execute).toHaveBeenCalledWith(
        expect.stringContaining(
          "UPDATE elections SET status = ?, end_date = ? WHERE id = ?",
        ),
        expect.any(Array),
      );
    });
  });
});
