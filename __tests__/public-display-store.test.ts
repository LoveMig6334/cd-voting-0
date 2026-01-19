/**
 * Unit tests for lib/public-display-store.ts
 * Tests public display settings CRUD operations
 */

import {
  applyGlobalSettings,
  createDefaultSettings,
  deleteDisplaySettings,
  getAllDisplaySettings,
  getDisplaySettings,
  getOrCreateDisplaySettings,
  publishResults,
  resetDisplaySettings,
  unpublishResults,
  updateDisplaySettings,
  updatePositionConfig,
} from "@/lib/public-display-store";

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

describe("public-display-store", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockDispatchEvent.mockClear();
  });

  // ============================================
  // createDefaultSettings Tests
  // ============================================
  describe("createDefaultSettings", () => {
    it("should create default settings with correct structure", () => {
      const settings = createDefaultSettings("election1", [
        "president",
        "secretary",
      ]);

      expect(settings.electionId).toBe("election1");
      expect(settings.isPublished).toBe(false);
      expect(settings.globalShowRawScore).toBe(true);
      expect(settings.globalShowWinnerOnly).toBe(false);
      expect(settings.positionConfigs).toHaveLength(2);
    });

    it("should create position configs with default values", () => {
      const settings = createDefaultSettings("election1", ["president"]);

      expect(settings.positionConfigs[0]).toEqual({
        positionId: "president",
        showRawScore: true,
        showWinnerOnly: false,
        skip: false,
      });
    });

    it("should handle empty positions array", () => {
      const settings = createDefaultSettings("election1", []);

      expect(settings.positionConfigs).toHaveLength(0);
    });
  });

  // ============================================
  // getOrCreateDisplaySettings Tests
  // ============================================
  describe("getOrCreateDisplaySettings", () => {
    it("should create new settings if none exist", () => {
      const settings = getOrCreateDisplaySettings("election1", ["president"]);

      expect(settings.electionId).toBe("election1");
      expect(getAllDisplaySettings()).toHaveLength(1);
    });

    it("should return existing settings if found", () => {
      // Create initial settings
      getOrCreateDisplaySettings("election1", ["president"]);

      // Get again - should return same settings
      const settings = getOrCreateDisplaySettings("election1", ["president"]);

      expect(settings.electionId).toBe("election1");
      expect(getAllDisplaySettings()).toHaveLength(1);
    });

    it("should add new position configs if positions were added", () => {
      // Create initial settings with one position
      getOrCreateDisplaySettings("election1", ["president"]);

      // Get again with additional position
      const settings = getOrCreateDisplaySettings("election1", [
        "president",
        "secretary",
      ]);

      expect(settings.positionConfigs).toHaveLength(2);
    });
  });

  // ============================================
  // getDisplaySettings Tests
  // ============================================
  describe("getDisplaySettings", () => {
    it("should return null for non-existent election", () => {
      const settings = getDisplaySettings("nonexistent");
      expect(settings).toBeNull();
    });

    it("should return settings for existing election", () => {
      getOrCreateDisplaySettings("election1", ["president"]);

      const settings = getDisplaySettings("election1");

      expect(settings).not.toBeNull();
      expect(settings?.electionId).toBe("election1");
    });
  });

  // ============================================
  // updateDisplaySettings Tests
  // ============================================
  describe("updateDisplaySettings", () => {
    it("should update settings successfully", () => {
      getOrCreateDisplaySettings("election1", ["president"]);

      const updated = updateDisplaySettings("election1", {
        globalShowRawScore: false,
        globalShowWinnerOnly: true,
      });

      expect(updated?.globalShowRawScore).toBe(false);
      expect(updated?.globalShowWinnerOnly).toBe(true);
    });

    it("should return null for non-existent election", () => {
      const updated = updateDisplaySettings("nonexistent", {
        globalShowRawScore: false,
      });

      expect(updated).toBeNull();
    });

    it("should dispatch event after update", () => {
      getOrCreateDisplaySettings("election1", ["president"]);
      mockDispatchEvent.mockClear();

      updateDisplaySettings("election1", { isPublished: true });

      expect(mockDispatchEvent).toHaveBeenCalled();
    });
  });

  // ============================================
  // updatePositionConfig Tests
  // ============================================
  describe("updatePositionConfig", () => {
    it("should update specific position config", () => {
      getOrCreateDisplaySettings("election1", ["president", "secretary"]);

      const updated = updatePositionConfig("election1", "president", {
        skip: true,
        showRawScore: false,
      });

      const presidentConfig = updated?.positionConfigs.find(
        (c) => c.positionId === "president",
      );
      const secretaryConfig = updated?.positionConfigs.find(
        (c) => c.positionId === "secretary",
      );

      expect(presidentConfig?.skip).toBe(true);
      expect(presidentConfig?.showRawScore).toBe(false);
      expect(secretaryConfig?.skip).toBe(false); // unchanged
    });

    it("should return null for non-existent election", () => {
      const updated = updatePositionConfig("nonexistent", "president", {
        skip: true,
      });

      expect(updated).toBeNull();
    });
  });

  // ============================================
  // publishResults / unpublishResults Tests
  // ============================================
  describe("publishResults", () => {
    it("should set isPublished to true and record timestamp", () => {
      getOrCreateDisplaySettings("election1", ["president"]);

      const published = publishResults("election1");

      expect(published?.isPublished).toBe(true);
      expect(published?.publishedAt).toBeDefined();
    });

    it("should return null for non-existent election", () => {
      const published = publishResults("nonexistent");
      expect(published).toBeNull();
    });
  });

  describe("unpublishResults", () => {
    it("should set isPublished to false and clear timestamp", () => {
      getOrCreateDisplaySettings("election1", ["president"]);
      publishResults("election1");

      const unpublished = unpublishResults("election1");

      expect(unpublished?.isPublished).toBe(false);
      expect(unpublished?.publishedAt).toBeUndefined();
    });
  });

  // ============================================
  // applyGlobalSettings Tests
  // ============================================
  describe("applyGlobalSettings", () => {
    it("should apply global settings to all positions", () => {
      getOrCreateDisplaySettings("election1", ["president", "secretary"]);

      const updated = applyGlobalSettings("election1", false, true);

      expect(updated?.globalShowRawScore).toBe(false);
      expect(updated?.globalShowWinnerOnly).toBe(true);

      updated?.positionConfigs.forEach((config) => {
        expect(config.showRawScore).toBe(false);
        expect(config.showWinnerOnly).toBe(true);
      });
    });
  });

  // ============================================
  // deleteDisplaySettings Tests
  // ============================================
  describe("deleteDisplaySettings", () => {
    it("should delete settings for election", () => {
      getOrCreateDisplaySettings("election1", ["president"]);
      expect(getAllDisplaySettings()).toHaveLength(1);

      const deleted = deleteDisplaySettings("election1");

      expect(deleted).toBe(true);
      expect(getAllDisplaySettings()).toHaveLength(0);
    });

    it("should return false for non-existent election", () => {
      const deleted = deleteDisplaySettings("nonexistent");
      expect(deleted).toBe(false);
    });
  });

  // ============================================
  // resetDisplaySettings Tests
  // ============================================
  describe("resetDisplaySettings", () => {
    it("should clear all display settings", () => {
      getOrCreateDisplaySettings("election1", ["president"]);
      getOrCreateDisplaySettings("election2", ["secretary"]);

      expect(getAllDisplaySettings()).toHaveLength(2);

      resetDisplaySettings();

      expect(getAllDisplaySettings()).toHaveLength(0);
    });

    it("should dispatch event after reset", () => {
      mockDispatchEvent.mockClear();
      resetDisplaySettings();
      expect(mockDispatchEvent).toHaveBeenCalled();
    });
  });
});
