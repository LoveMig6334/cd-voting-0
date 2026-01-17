/**
 * Unit tests for lib/election-store.ts
 * Tests election operations, candidate management, and validation functions
 */

import {
  addCandidate,
  addCandidateWithValidation,
  createElection,
  DEFAULT_AVATAR_URL,
  deleteCandidate,
  getAllElections,
  isCandidateNameDuplicate,
  updateCandidate,
} from "@/lib/election-store";
import type { ElectionCandidate } from "@/lib/election-types";

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

describe("election-store", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockDispatchEvent.mockClear();
  });

  // Helper function to create a test election
  const createTestElection = () => {
    return createElection({
      title: "Test Election",
      description: "Test Description",
      type: "student-committee",
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    });
  };

  // ============================================
  // isCandidateNameDuplicate Tests
  // ============================================
  describe("isCandidateNameDuplicate", () => {
    it("should return false when no candidates exist", () => {
      const election = createTestElection();

      const result = isCandidateNameDuplicate(
        election.id,
        "president",
        "John Doe",
      );

      expect(result).toBe(false);
    });

    it("should return true for duplicate names in same position", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      const result = isCandidateNameDuplicate(
        election.id,
        "president",
        "John Doe",
      );

      expect(result).toBe(true);
    });

    it("should return false for same name in different positions", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      const result = isCandidateNameDuplicate(
        election.id,
        "secretary",
        "John Doe",
      );

      expect(result).toBe(false);
    });

    it("should be case-insensitive", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(
        isCandidateNameDuplicate(election.id, "president", "JOHN DOE"),
      ).toBe(true);
      expect(
        isCandidateNameDuplicate(election.id, "president", "john doe"),
      ).toBe(true);
      expect(
        isCandidateNameDuplicate(election.id, "president", "JoHn DoE"),
      ).toBe(true);
    });

    it("should trim whitespace when comparing", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(
        isCandidateNameDuplicate(election.id, "president", "  John Doe  "),
      ).toBe(true);
    });

    it("should exclude specified candidate when editing", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      // Get the candidate ID
      const elections = getAllElections();
      const updatedElection = elections.find((e) => e.id === election.id);
      const candidateId = updatedElection?.candidates[0]?.id;

      // Should be false when excluding the same candidate (editing scenario)
      const result = isCandidateNameDuplicate(
        election.id,
        "president",
        "John Doe",
        candidateId,
      );

      expect(result).toBe(false);
    });

    it("should return false for non-existent election", () => {
      const result = isCandidateNameDuplicate(
        "non-existent-id",
        "president",
        "John Doe",
      );

      expect(result).toBe(false);
    });
  });

  // ============================================
  // addCandidateWithValidation Tests
  // ============================================
  describe("addCandidateWithValidation", () => {
    it("should add candidate successfully when name is unique", () => {
      const election = createTestElection();

      const result = addCandidateWithValidation(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.election.candidates).toHaveLength(1);
        expect(result.election.candidates[0].name).toBe("John Doe");
      }
    });

    it("should reject duplicate candidate names", () => {
      const election = createTestElection();

      // Add first candidate
      addCandidateWithValidation(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      // Try to add duplicate
      const result = addCandidateWithValidation(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Different slogan",
        imageUrl: "/different.jpg",
        rank: 2,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("ผู้สมัครชื่อนี้มีอยู่แล้วในตำแหน่งนี้");
      }
    });

    it("should allow same name in different positions", () => {
      const election = createTestElection();

      // Add first candidate
      addCandidateWithValidation(election.id, {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      // Add same name in different position
      const result = addCandidateWithValidation(election.id, {
        positionId: "secretary",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(result.success).toBe(true);
    });

    it("should return error for non-existent election", () => {
      const result = addCandidateWithValidation("non-existent-id", {
        positionId: "president",
        name: "John Doe",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("ไม่พบการเลือกตั้งที่ระบุ");
      }
    });
  });

  // ============================================
  // DEFAULT_AVATAR_URL Tests
  // ============================================
  describe("DEFAULT_AVATAR_URL", () => {
    it("should be defined and point to correct path", () => {
      expect(DEFAULT_AVATAR_URL).toBe("/default-avatar.svg");
    });
  });

  // ============================================
  // addCandidate Tests
  // ============================================
  describe("addCandidate", () => {
    it("should add a candidate successfully", () => {
      const election = createTestElection();

      const result = addCandidate(election.id, {
        positionId: "president",
        name: "Test Candidate",
        slogan: "Test Slogan",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(result).not.toBeNull();
      expect(result?.candidates).toHaveLength(1);
      expect(result?.candidates[0].name).toBe("Test Candidate");
    });

    it("should generate unique ID for candidate", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "Candidate 1",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      addCandidate(election.id, {
        positionId: "president",
        name: "Candidate 2",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 2,
      });

      const elections = getAllElections();
      const updatedElection = elections.find((e) => e.id === election.id);

      expect(updatedElection?.candidates[0].id).not.toBe(
        updatedElection?.candidates[1].id,
      );
    });

    it("should return null for non-existent election", () => {
      const result = addCandidate("non-existent-id", {
        positionId: "president",
        name: "Test",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      expect(result).toBeNull();
    });
  });

  // ============================================
  // updateCandidate Tests
  // ============================================
  describe("updateCandidate", () => {
    it("should update candidate data", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "Original Name",
        slogan: "Original Slogan",
        imageUrl: "/original.jpg",
        rank: 1,
      });

      const elections = getAllElections();
      const candidateId = elections.find((e) => e.id === election.id)
        ?.candidates[0]?.id as string;

      const result = updateCandidate(election.id, candidateId, {
        name: "Updated Name",
        slogan: "Updated Slogan",
      });

      expect(result).not.toBeNull();
      const updatedCandidate = result?.candidates.find(
        (c: ElectionCandidate) => c.id === candidateId,
      );
      expect(updatedCandidate?.name).toBe("Updated Name");
      expect(updatedCandidate?.slogan).toBe("Updated Slogan");
    });
  });

  // ============================================
  // deleteCandidate Tests
  // ============================================
  describe("deleteCandidate", () => {
    it("should remove candidate from election", () => {
      const election = createTestElection();

      addCandidate(election.id, {
        positionId: "president",
        name: "Test Candidate",
        slogan: "Test",
        imageUrl: "/test.jpg",
        rank: 1,
      });

      const elections = getAllElections();
      const candidateId = elections.find((e) => e.id === election.id)
        ?.candidates[0]?.id as string;

      const result = deleteCandidate(election.id, candidateId);

      expect(result).not.toBeNull();
      expect(result?.candidates).toHaveLength(0);
    });
  });
});
