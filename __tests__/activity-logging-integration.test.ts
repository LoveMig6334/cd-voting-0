/**
 * @jest-environment jsdom
 */
import {
  clearActivities,
  getRecentActivities,
  logAdminAction,
  logElectionChange,
} from "@/lib/activity-store";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock dispatchEvent
const dispatchEventMock = jest.fn();
window.dispatchEvent = dispatchEventMock;

describe("Activity Logging Integration Tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  // ============================================
  // Phase 1: Election Management Logging
  // ============================================
  describe("Phase 1: Election Management", () => {
    describe("Create Election", () => {
      it("should log activity when election is created", () => {
        const electionTitle = "การเลือกตั้งสภานักเรียน 2568";

        logElectionChange("สร้างการเลือกตั้ง", electionTitle);

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("election_change");
        expect(activities[0].title).toBe("สร้างการเลือกตั้ง");
        expect(activities[0].description).toContain(electionTitle);
      });

      it("should have correct metadata for created election", () => {
        const electionTitle = "เลือกตั้งประธานนักเรียน";

        const activity = logElectionChange("สร้างการเลือกตั้ง", electionTitle);

        expect(activity.id).toBeDefined();
        expect(activity.timestamp).toBeDefined();
        expect(activity.metadata?.electionTitle).toBe(electionTitle);
      });
    });

    describe("Delete Election", () => {
      it("should log activity when election is deleted", () => {
        const electionTitle = "การเลือกตั้งที่จะลบ";

        logElectionChange("ลบการเลือกตั้ง", electionTitle);

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("election_change");
        expect(activities[0].title).toBe("ลบการเลือกตั้ง");
        expect(activities[0].description).toContain(electionTitle);
      });
    });

    describe("Edit Election", () => {
      it("should log activity when election is edited", () => {
        const electionTitle = "การเลือกตั้งที่แก้ไข";

        logElectionChange("แก้ไขการเลือกตั้ง", electionTitle);

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("election_change");
        expect(activities[0].title).toBe("แก้ไขการเลือกตั้ง");
      });
    });
  });

  // ============================================
  // Phase 2: Candidate Management Logging
  // ============================================
  describe("Phase 2: Candidate Management", () => {
    describe("Add Candidate", () => {
      it("should log activity when candidate is added", () => {
        const candidateName = "นายสมชาย ใจดี";
        const electionTitle = "สภานักเรียน 2568";

        logAdminAction(
          "เพิ่มผู้สมัคร",
          `${candidateName} ในการเลือกตั้ง ${electionTitle}`,
        );

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("admin_action");
        expect(activities[0].title).toBe("เพิ่มผู้สมัคร");
        expect(activities[0].description).toContain(candidateName);
        expect(activities[0].description).toContain(electionTitle);
      });
    });

    describe("Edit Candidate", () => {
      it("should log activity when candidate is edited", () => {
        const candidateName = "นางสาวสมหญิง รักเรียน";
        const electionTitle = "สภานักเรียน 2568";

        logAdminAction(
          "แก้ไขผู้สมัคร",
          `${candidateName} ในการเลือกตั้ง ${electionTitle}`,
        );

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("admin_action");
        expect(activities[0].title).toBe("แก้ไขผู้สมัคร");
      });
    });

    describe("Delete Candidate", () => {
      it("should log activity when candidate is deleted", () => {
        const candidateName = "นายทดสอบ ลบออก";
        const electionTitle = "สภานักเรียน 2568";

        logAdminAction(
          "ลบผู้สมัคร",
          `${candidateName} ในการเลือกตั้ง ${electionTitle}`,
        );

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("admin_action");
        expect(activities[0].title).toBe("ลบผู้สมัคร");
      });
    });
  });

  // ============================================
  // Phase 3: Position Management Logging
  // ============================================
  describe("Phase 3: Position Management", () => {
    describe("Add Position", () => {
      it("should log activity when position is added", () => {
        const positionTitle = "หัวหน้าฝ่ายกีฬา";
        const electionTitle = "สภานักเรียน 2568";

        logAdminAction(
          "เพิ่มตำแหน่ง",
          `${positionTitle} ในการเลือกตั้ง ${electionTitle}`,
        );

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("admin_action");
        expect(activities[0].title).toBe("เพิ่มตำแหน่ง");
        expect(activities[0].description).toContain(positionTitle);
      });
    });

    describe("Toggle Position", () => {
      it("should log activity when position is enabled", () => {
        const positionTitle = "ประธานนักเรียน";
        const electionTitle = "สภานักเรียน 2568";

        logAdminAction(
          "เปิดตำแหน่ง",
          `${positionTitle} ในการเลือกตั้ง ${electionTitle}`,
        );

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("admin_action");
        expect(activities[0].title).toBe("เปิดตำแหน่ง");
      });

      it("should log activity when position is disabled", () => {
        const positionTitle = "เลขานุการ";
        const electionTitle = "สภานักเรียน 2568";

        logAdminAction(
          "ปิดตำแหน่ง",
          `${positionTitle} ในการเลือกตั้ง ${electionTitle}`,
        );

        const activities = getRecentActivities();
        expect(activities.length).toBe(1);
        expect(activities[0].type).toBe("admin_action");
        expect(activities[0].title).toBe("ปิดตำแหน่ง");
      });
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe("Integration", () => {
    it("should maintain activity order (most recent first)", () => {
      logElectionChange("สร้างการเลือกตั้ง", "การเลือกตั้ง 1");
      logAdminAction("เพิ่มผู้สมัคร", "ผู้สมัคร ก");
      logAdminAction("เพิ่มตำแหน่ง", "ตำแหน่ง A");

      const activities = getRecentActivities(3);
      expect(activities.length).toBe(3);
      expect(activities[0].title).toBe("เพิ่มตำแหน่ง"); // Most recent
      expect(activities[1].title).toBe("เพิ่มผู้สมัคร");
      expect(activities[2].title).toBe("สร้างการเลือกตั้ง"); // Oldest
    });

    it("should handle multiple election operations", () => {
      logElectionChange("สร้างการเลือกตั้ง", "การเลือกตั้ง A");
      logElectionChange("สร้างการเลือกตั้ง", "การเลือกตั้ง B");
      logElectionChange("ลบการเลือกตั้ง", "การเลือกตั้ง A");

      const activities = getRecentActivities(10);
      expect(activities.length).toBe(3);

      const electionChangeActivities = activities.filter(
        (a) => a.type === "election_change",
      );
      expect(electionChangeActivities.length).toBe(3);
    });

    it("should clear activities correctly", () => {
      logElectionChange("สร้างการเลือกตั้ง", "Test");
      logAdminAction("เพิ่มผู้สมัคร", "Test");

      expect(getRecentActivities().length).toBe(2);

      clearActivities();

      expect(getRecentActivities().length).toBe(0);
    });
  });
});
