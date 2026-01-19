/**
 * @jest-environment jsdom
 */
import {
  ActivityLog,
  clearActivities,
  formatRelativeTime,
  getActivitiesByType,
  getRecentActivities,
  getRecentActivitiesForDisplay,
  logActivity,
  logAdminAction,
  logElectionChange,
  logSystemCheck,
  logVoteCast,
  toDisplayItem,
} from "../lib/activity-store";

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

describe("activity-store", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe("logActivity", () => {
    it("should create a new activity with id and timestamp", () => {
      const activity = logActivity({
        type: "vote_cast",
        title: "Test Vote",
        description: "Test description",
      });

      expect(activity.id).toBeDefined();
      expect(activity.timestamp).toBeDefined();
      expect(activity.type).toBe("vote_cast");
      expect(activity.title).toBe("Test Vote");
      expect(activity.description).toBe("Test description");
    });

    it("should include metadata when provided", () => {
      const activity = logActivity({
        type: "admin_action",
        title: "Test Action",
        description: "Test",
        metadata: { userId: 123 },
      });

      expect(activity.metadata).toEqual({ userId: 123 });
    });

    it("should save activity to localStorage", () => {
      logActivity({
        type: "system_check",
        title: "Check",
        description: "System OK",
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should dispatch custom event after saving", () => {
      logActivity({
        type: "vote_cast",
        title: "Vote",
        description: "New vote",
      });

      expect(dispatchEventMock).toHaveBeenCalled();
    });
  });

  describe("getRecentActivities", () => {
    it("should return empty array when no activities exist", () => {
      const activities = getRecentActivities();
      expect(activities).toEqual([]);
    });

    it("should return activities sorted by most recent first", () => {
      logActivity({ type: "vote_cast", title: "First", description: "1" });
      logActivity({ type: "vote_cast", title: "Second", description: "2" });
      logActivity({ type: "vote_cast", title: "Third", description: "3" });

      const activities = getRecentActivities(3);

      expect(activities[0].title).toBe("Third");
      expect(activities[1].title).toBe("Second");
      expect(activities[2].title).toBe("First");
    });

    it("should respect the limit parameter", () => {
      for (let i = 0; i < 10; i++) {
        logActivity({
          type: "vote_cast",
          title: `Activity ${i}`,
          description: "Test",
        });
      }

      const activities = getRecentActivities(5);
      expect(activities.length).toBe(5);
    });

    it("should default to 5 activities when no limit specified", () => {
      for (let i = 0; i < 10; i++) {
        logActivity({
          type: "vote_cast",
          title: `Activity ${i}`,
          description: "Test",
        });
      }

      const activities = getRecentActivities();
      expect(activities.length).toBe(5);
    });
  });

  describe("getActivitiesByType", () => {
    it("should filter activities by type", () => {
      logActivity({ type: "vote_cast", title: "Vote 1", description: "V1" });
      logActivity({
        type: "system_check",
        title: "Check 1",
        description: "C1",
      });
      logActivity({ type: "vote_cast", title: "Vote 2", description: "V2" });

      const voteActivities = getActivitiesByType("vote_cast");

      expect(voteActivities.length).toBe(2);
      expect(voteActivities.every((a) => a.type === "vote_cast")).toBe(true);
    });
  });

  describe("formatRelativeTime", () => {
    it('should return "เมื่อสักครู่" for times less than 1 minute ago', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe("เมื่อสักครู่");
    });

    it("should return minutes for times less than 1 hour ago", () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const result = formatRelativeTime(thirtyMinutesAgo.toISOString());
      expect(result).toContain("นาทีที่แล้ว");
    });

    it("should return hours for times less than 24 hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo.toISOString());
      expect(result).toBe("2 ชั่วโมงที่แล้ว");
    });

    it('should return "เมื่อวาน" for times 1 day ago', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(yesterday.toISOString());
      expect(result).toBe("เมื่อวาน");
    });

    it("should return days for times less than 7 days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo.toISOString());
      expect(result).toBe("3 วันที่แล้ว");
    });
  });

  describe("toDisplayItem", () => {
    it("should convert ActivityLog to display format", () => {
      const activity: ActivityLog = {
        id: "test-id",
        type: "vote_cast",
        title: "Vote Title",
        description: "Vote Description",
        timestamp: new Date().toISOString(),
      };

      const displayItem = toDisplayItem(activity);

      expect(displayItem.id).toBe("test-id");
      expect(displayItem.title).toBe("Vote Title");
      expect(displayItem.description).toBe("Vote Description");
      expect(displayItem.icon).toBe("how_to_reg");
      expect(displayItem.iconBg).toBe("bg-royal-blue");
      expect(displayItem.iconColor).toBe("text-white");
      expect(displayItem.time).toBe("เมื่อสักครู่");
    });

    it("should use correct icon config for each type", () => {
      const types = [
        { type: "vote_cast" as const, icon: "how_to_reg" },
        { type: "system_check" as const, icon: "check_circle" },
        { type: "admin_action" as const, icon: "edit" },
        { type: "election_change" as const, icon: "how_to_vote" },
      ];

      types.forEach(({ type, icon }) => {
        const activity: ActivityLog = {
          id: "test",
          type,
          title: "Test",
          description: "Test",
          timestamp: new Date().toISOString(),
        };

        expect(toDisplayItem(activity).icon).toBe(icon);
      });
    });
  });

  describe("Convenience logging functions", () => {
    describe("logVoteCast", () => {
      it("should create vote_cast activity with correct format", () => {
        const activity = logVoteCast(1234, "สภานักเรียน 2568");

        expect(activity.type).toBe("vote_cast");
        expect(activity.title).toBe("มีการลงคะแนนใหม่");
        expect(activity.description).toContain("#1234");
        expect(activity.description).toContain("สภานักเรียน 2568");
        expect(activity.metadata).toEqual({
          studentId: 1234,
          electionTitle: "สภานักเรียน 2568",
        });
      });
    });

    describe("logSystemCheck", () => {
      it("should create system_check activity", () => {
        const activity = logSystemCheck("ระบบทำงานปกติ");

        expect(activity.type).toBe("system_check");
        expect(activity.title).toBe("ตรวจสอบระบบ");
        expect(activity.description).toBe("ระบบทำงานปกติ");
      });
    });

    describe("logAdminAction", () => {
      it("should create admin_action activity", () => {
        const activity = logAdminAction(
          "แก้ไขการเลือกตั้ง",
          'ผู้ดูแลแก้ไขคำอธิบาย "ชมรม"',
        );

        expect(activity.type).toBe("admin_action");
        expect(activity.title).toBe("แก้ไขการเลือกตั้ง");
        expect(activity.description).toBe('ผู้ดูแลแก้ไขคำอธิบาย "ชมรม"');
      });
    });

    describe("logElectionChange", () => {
      it("should create election_change activity", () => {
        const activity = logElectionChange("ปิดการเลือกตั้ง", "สภานักเรียน");

        expect(activity.type).toBe("election_change");
        expect(activity.title).toBe("ปิดการเลือกตั้ง");
        expect(activity.description).toContain("สภานักเรียน");
      });
    });
  });

  describe("clearActivities", () => {
    it("should remove all activities from localStorage", () => {
      logActivity({ type: "vote_cast", title: "Test", description: "Test" });
      clearActivities();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        "cd-voting-activities",
      );
    });
  });

  describe("getRecentActivitiesForDisplay", () => {
    it("should return display-formatted activities", () => {
      logActivity({
        type: "vote_cast",
        title: "Test Vote",
        description: "Vote description",
      });

      const displayItems = getRecentActivitiesForDisplay(1);

      expect(displayItems.length).toBe(1);
      expect(displayItems[0].icon).toBeDefined();
      expect(displayItems[0].iconBg).toBeDefined();
      expect(displayItems[0].time).toBeDefined();
    });
  });
});
