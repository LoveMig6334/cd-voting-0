import {
  ACCESS_LEVELS,
  ACCESS_LEVEL_LABELS,
  getAccessLevelLabel,
} from "@/lib/admin-types";

describe("ACCESS_LEVELS constants", () => {
  it("defines ROOT as 0", () => {
    expect(ACCESS_LEVELS.ROOT).toBe(0);
  });

  it("defines SYSTEM_ADMIN as 1", () => {
    expect(ACCESS_LEVELS.SYSTEM_ADMIN).toBe(1);
  });

  it("defines TEACHER as 2", () => {
    expect(ACCESS_LEVELS.TEACHER).toBe(2);
  });

  it("defines OBSERVER as 3", () => {
    expect(ACCESS_LEVELS.OBSERVER).toBe(3);
  });

  it("has exactly 4 levels", () => {
    expect(Object.keys(ACCESS_LEVELS)).toHaveLength(4);
  });
});

describe("ACCESS_LEVEL_LABELS", () => {
  it("has a label for every access level", () => {
    for (const level of Object.values(ACCESS_LEVELS)) {
      expect(ACCESS_LEVEL_LABELS[level]).toBeDefined();
      expect(typeof ACCESS_LEVEL_LABELS[level]).toBe("string");
    }
  });

  it("labels ROOT as 'Root Admin'", () => {
    expect(ACCESS_LEVEL_LABELS[ACCESS_LEVELS.ROOT]).toBe("Root Admin");
  });
});

describe("getAccessLevelLabel", () => {
  it("returns correct label for each known level", () => {
    expect(getAccessLevelLabel(ACCESS_LEVELS.ROOT)).toBe("Root Admin");
    expect(getAccessLevelLabel(ACCESS_LEVELS.SYSTEM_ADMIN)).toBe(
      "ผู้ดูแลระบบ",
    );
    expect(getAccessLevelLabel(ACCESS_LEVELS.TEACHER)).toBe(
      "คุณครูประจำชั้น",
    );
    expect(getAccessLevelLabel(ACCESS_LEVELS.OBSERVER)).toBe(
      "ผู้สังเกตการณ์",
    );
  });

  it("returns fallback string for unknown level", () => {
    expect(getAccessLevelLabel(99)).toBe("ไม่ทราบ");
    expect(getAccessLevelLabel(-1)).toBe("ไม่ทราบ");
  });
});
