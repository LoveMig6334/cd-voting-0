/**
 * Unit tests for lib/student-store.ts
 * Tests CRUD operations, voting rights management, and import functionality
 */

import {
  addStudent,
  approveVotingRight,
  bulkApproveVotingRights,
  bulkRevokeVotingRights,
  deleteStudent,
  getAllStudents,
  getStudentsByClassroom,
  getStudentsByVotingStatus,
  getStudentStats,
  getUniqueClassrooms,
  importStudents,
  resetStudentData,
  revokeVotingRight,
  updateStudent,
  type RawStudentData,
  type StudentRecord,
} from "@/lib/student-store";

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

describe("student-store", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    mockDispatchEvent.mockClear();
  });

  // ============================================
  // getAllStudents Tests
  // ============================================
  describe("getAllStudents", () => {
    it("should return empty array if no data", () => {
      const students = getAllStudents();
      expect(students).toEqual([]);
    });

    it("should return students from localStorage", () => {
      const mockStudents: StudentRecord[] = [
        {
          id: 6367,
          no: 1,
          name: "ทดสอบ",
          surname: "นามสกุล",
          classroom: "3/1",
          nationalId: "1234567890123",
          votingApproved: false,
          votedIn: [],
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ];
      localStorageMock.setItem(
        "cd-voting-students",
        JSON.stringify(mockStudents),
      );

      const students = getAllStudents();
      expect(students).toHaveLength(1);
      expect(students[0].id).toBe(6367);
    });
  });

  // ============================================
  // addStudent Tests
  // ============================================
  describe("addStudent", () => {
    it("should add a new student", () => {
      const result = addStudent({
        id: 6368,
        no: 2,
        name: "ใหม่",
        surname: "ทดสอบ",
        classroom: "3/1",
        nationalId: "1234567890124",
      });

      expect(result.success).toBe(true);
      expect(result.student).toBeDefined();
      expect(result.student?.id).toBe(6368);
      expect(result.student?.votingApproved).toBe(false);
    });

    it("should prevent duplicate student IDs", () => {
      // Add first student
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      // Try to add duplicate
      const result = addStudent({
        id: 6367,
        no: 2,
        name: "ซ้ำ",
        surname: "ทดสอบ",
        classroom: "3/1",
        nationalId: "1234567890125",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("รหัสนักเรียนนี้มีอยู่แล้ว");
    });

    it("should prevent duplicate nationalId", () => {
      // Add first student
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      // Try to add with same nationalId
      const result = addStudent({
        id: 6369,
        no: 2,
        name: "ซ้ำ",
        surname: "ทดสอบ",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("เลขประจำตัวประชาชน");
    });
  });

  // ============================================
  // updateStudent Tests
  // ============================================
  describe("updateStudent", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
    });

    it("should update student data", () => {
      const updated = updateStudent(6367, { name: "ชื่อใหม่" });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe("ชื่อใหม่");
      expect(updated?.surname).toBe("นามสกุล"); // unchanged
    });

    it("should return null for non-existent student", () => {
      const updated = updateStudent(9999, { name: "ไม่มี" });
      expect(updated).toBeNull();
    });
  });

  // ============================================
  // deleteStudent Tests
  // ============================================
  describe("deleteStudent", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
    });

    it("should delete existing student", () => {
      const deleted = deleteStudent(6367);
      expect(deleted).toBe(true);
      expect(getAllStudents()).toHaveLength(0);
    });

    it("should return false for non-existent student", () => {
      const deleted = deleteStudent(9999);
      expect(deleted).toBe(false);
    });
  });

  // ============================================
  // Voting Rights Tests
  // ============================================
  describe("approveVotingRight", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
    });

    it("should set votingApproved to true", () => {
      const updated = approveVotingRight(6367);

      expect(updated).not.toBeNull();
      expect(updated?.votingApproved).toBe(true);
    });

    it("should record approval timestamp", () => {
      const before = new Date().toISOString();
      const updated = approveVotingRight(6367);
      const after = new Date().toISOString();

      expect(updated?.votingApprovedAt).toBeDefined();
      if (updated?.votingApprovedAt) {
        expect(updated.votingApprovedAt >= before).toBe(true);
        expect(updated.votingApprovedAt <= after).toBe(true);
      }
    });

    it("should record approver name", () => {
      const updated = approveVotingRight(6367, "ผู้ดูแล");
      expect(updated?.votingApprovedBy).toBe("ผู้ดูแล");
    });
  });

  describe("revokeVotingRight", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      approveVotingRight(6367);
    });

    it("should set votingApproved to false", () => {
      const updated = revokeVotingRight(6367);

      expect(updated).not.toBeNull();
      expect(updated?.votingApproved).toBe(false);
    });
  });

  // ============================================
  // Bulk Voting Rights Tests
  // ============================================
  describe("bulkApproveVotingRights", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "นักเรียน1",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      addStudent({
        id: 6368,
        no: 2,
        name: "นักเรียน2",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890124",
      });
      addStudent({
        id: 6369,
        no: 1,
        name: "นักเรียน3",
        surname: "ห้อง2",
        classroom: "3/2",
        nationalId: "1234567890125",
      });
    });

    it("should approve all students in a classroom", () => {
      const count = bulkApproveVotingRights("3/1");

      expect(count).toBe(2);

      const students = getAllStudents();
      const classroom31 = students.filter((s) => s.classroom === "3/1");
      expect(classroom31.every((s) => s.votingApproved)).toBe(true);

      const classroom32 = students.filter((s) => s.classroom === "3/2");
      expect(classroom32.every((s) => !s.votingApproved)).toBe(true);
    });
  });

  describe("bulkRevokeVotingRights", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "นักเรียน1",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      addStudent({
        id: 6368,
        no: 2,
        name: "นักเรียน2",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890124",
      });
      bulkApproveVotingRights("3/1");
    });

    it("should revoke all students in a classroom", () => {
      const count = bulkRevokeVotingRights("3/1");

      expect(count).toBe(2);

      const students = getAllStudents();
      expect(students.every((s) => !s.votingApproved)).toBe(true);
    });
  });

  // ============================================
  // Import Tests
  // ============================================
  describe("importStudents", () => {
    it("should import valid JSON array", () => {
      const rawData: RawStudentData[] = [
        {
          classroom: "3/1",
          no: 1,
          id: 6367,
          name: "ทดสอบ",
          surname: "นามสกุล",
          nationalId: "1234567890123",
        },
        {
          classroom: "3/1",
          no: 2,
          id: 6368,
          name: "ทดสอบ2",
          surname: "นามสกุล2",
          nationalId: "1234567890124",
        },
      ];

      const result = importStudents(rawData);

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(getAllStudents()).toHaveLength(2);
    });

    it("should skip students with missing required fields", () => {
      const rawData = [
        {
          classroom: "3/1",
          no: 1,
          id: 6367,
          name: "", // missing name
          surname: "นามสกุล",
          nationalId: "1234567890123",
        },
      ] as RawStudentData[];

      const result = importStudents(rawData);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should merge with existing students", () => {
      // Add existing student
      addStudent({
        id: 6367,
        no: 1,
        name: "เดิม",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      // Import new students
      const rawData: RawStudentData[] = [
        {
          classroom: "3/1",
          no: 2,
          id: 6368,
          name: "ใหม่",
          surname: "นามสกุล",
          nationalId: "1234567890124",
        },
      ];

      const result = importStudents(rawData);

      expect(result.imported).toBe(1);
      expect(getAllStudents()).toHaveLength(2);
    });

    it("should skip duplicates without overwrite option", () => {
      // Add existing student
      addStudent({
        id: 6367,
        no: 1,
        name: "เดิม",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      // Try to import duplicate
      const rawData: RawStudentData[] = [
        {
          classroom: "3/1",
          no: 1,
          id: 6367,
          name: "ใหม่",
          surname: "อัพเดท",
          nationalId: "1234567890123",
        },
      ];

      const result = importStudents(rawData);

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);

      // Original should be unchanged
      const students = getAllStudents();
      expect(students[0].name).toBe("เดิม");
    });

    it("should overwrite duplicates with overwrite option", () => {
      // Add existing student
      addStudent({
        id: 6367,
        no: 1,
        name: "เดิม",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      // Import with overwrite
      const rawData: RawStudentData[] = [
        {
          classroom: "3/1",
          no: 1,
          id: 6367,
          name: "อัพเดท",
          surname: "นามสกุลใหม่",
          nationalId: "1234567890123",
        },
      ];

      const result = importStudents(rawData, { overwrite: true });

      expect(result.imported).toBe(1);

      const students = getAllStudents();
      expect(students[0].name).toBe("อัพเดท");
    });
  });

  // ============================================
  // Filter Tests
  // ============================================
  describe("getStudentsByClassroom", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "นักเรียน1",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      addStudent({
        id: 6368,
        no: 1,
        name: "นักเรียน2",
        surname: "ห้อง2",
        classroom: "3/2",
        nationalId: "1234567890124",
      });
    });

    it("should return students in specified classroom", () => {
      const students = getStudentsByClassroom("3/1");
      expect(students).toHaveLength(1);
      expect(students[0].classroom).toBe("3/1");
    });
  });

  describe("getStudentsByVotingStatus", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "นักเรียน1",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      addStudent({
        id: 6368,
        no: 2,
        name: "นักเรียน2",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890124",
      });
      approveVotingRight(6367);
    });

    it("should return approved students", () => {
      const students = getStudentsByVotingStatus(true);
      expect(students).toHaveLength(1);
      expect(students[0].votingApproved).toBe(true);
    });

    it("should return pending students", () => {
      const students = getStudentsByVotingStatus(false);
      expect(students).toHaveLength(1);
      expect(students[0].votingApproved).toBe(false);
    });
  });

  // ============================================
  // Utility Tests
  // ============================================
  describe("getUniqueClassrooms", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "นักเรียน1",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      addStudent({
        id: 6368,
        no: 1,
        name: "นักเรียน2",
        surname: "ห้อง2",
        classroom: "3/2",
        nationalId: "1234567890124",
      });
      addStudent({
        id: 6369,
        no: 2,
        name: "นักเรียน3",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890125",
      });
    });

    it("should return unique sorted classrooms", () => {
      const classrooms = getUniqueClassrooms();
      expect(classrooms).toEqual(["3/1", "3/2"]);
    });
  });

  describe("getStudentStats", () => {
    beforeEach(() => {
      addStudent({
        id: 6367,
        no: 1,
        name: "นักเรียน1",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890123",
      });
      addStudent({
        id: 6368,
        no: 2,
        name: "นักเรียน2",
        surname: "ห้อง1",
        classroom: "3/1",
        nationalId: "1234567890124",
      });
      addStudent({
        id: 6369,
        no: 1,
        name: "นักเรียน3",
        surname: "ห้อง2",
        classroom: "3/2",
        nationalId: "1234567890125",
      });
      approveVotingRight(6367);
    });

    it("should return correct statistics", () => {
      const stats = getStudentStats();

      expect(stats.total).toBe(3);
      expect(stats.approved).toBe(1);
      expect(stats.pending).toBe(2);
      expect(stats.byClassroom["3/1"].total).toBe(2);
      expect(stats.byClassroom["3/1"].approved).toBe(1);
      expect(stats.byClassroom["3/2"].total).toBe(1);
      expect(stats.byClassroom["3/2"].approved).toBe(0);
    });
  });

  // ============================================
  // Reset Tests
  // ============================================
  describe("resetStudentData", () => {
    it("should clear all student data", () => {
      addStudent({
        id: 6367,
        no: 1,
        name: "ทดสอบ",
        surname: "นามสกุล",
        classroom: "3/1",
        nationalId: "1234567890123",
      });

      expect(getAllStudents()).toHaveLength(1);

      resetStudentData();

      expect(getAllStudents()).toHaveLength(0);
    });
  });
});
