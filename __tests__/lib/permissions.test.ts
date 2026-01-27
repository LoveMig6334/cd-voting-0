import {
  PAGE_PERMISSIONS,
  canAccessPage,
  getDefaultPage,
  canCreateAdmin,
  getCreatableAccessLevels,
  canDeleteAdmin,
  canEditAdmin,
  canViewAdminManagement,
  canManageStudents,
} from "@/lib/permissions";
import { ACCESS_LEVELS, AccessLevel } from "@/lib/admin-types";

const { ROOT, SYSTEM_ADMIN, TEACHER, OBSERVER } = ACCESS_LEVELS;
const ALL_LEVELS: AccessLevel[] = [ROOT, SYSTEM_ADMIN, TEACHER, OBSERVER];

// -------------------------------------------------
// canAccessPage
// -------------------------------------------------
describe("canAccessPage", () => {
  describe("dashboard", () => {
    it("allows ROOT and SYSTEM_ADMIN", () => {
      expect(canAccessPage("dashboard", ROOT)).toBe(true);
      expect(canAccessPage("dashboard", SYSTEM_ADMIN)).toBe(true);
    });

    it("denies TEACHER and OBSERVER", () => {
      expect(canAccessPage("dashboard", TEACHER)).toBe(false);
      expect(canAccessPage("dashboard", OBSERVER)).toBe(false);
    });
  });

  describe("elections", () => {
    it("allows ROOT and SYSTEM_ADMIN", () => {
      expect(canAccessPage("elections", ROOT)).toBe(true);
      expect(canAccessPage("elections", SYSTEM_ADMIN)).toBe(true);
    });

    it("denies TEACHER and OBSERVER", () => {
      expect(canAccessPage("elections", TEACHER)).toBe(false);
      expect(canAccessPage("elections", OBSERVER)).toBe(false);
    });
  });

  describe("students", () => {
    it("allows ROOT, SYSTEM_ADMIN, and TEACHER", () => {
      expect(canAccessPage("students", ROOT)).toBe(true);
      expect(canAccessPage("students", SYSTEM_ADMIN)).toBe(true);
      expect(canAccessPage("students", TEACHER)).toBe(true);
    });

    it("denies OBSERVER", () => {
      expect(canAccessPage("students", OBSERVER)).toBe(false);
    });
  });

  describe("results", () => {
    it("allows ROOT, SYSTEM_ADMIN, and OBSERVER", () => {
      expect(canAccessPage("results", ROOT)).toBe(true);
      expect(canAccessPage("results", SYSTEM_ADMIN)).toBe(true);
      expect(canAccessPage("results", OBSERVER)).toBe(true);
    });

    it("denies TEACHER", () => {
      expect(canAccessPage("results", TEACHER)).toBe(false);
    });
  });

  describe("adminManagement", () => {
    it("allows ROOT and SYSTEM_ADMIN", () => {
      expect(canAccessPage("adminManagement", ROOT)).toBe(true);
      expect(canAccessPage("adminManagement", SYSTEM_ADMIN)).toBe(true);
    });

    it("denies TEACHER and OBSERVER", () => {
      expect(canAccessPage("adminManagement", TEACHER)).toBe(false);
      expect(canAccessPage("adminManagement", OBSERVER)).toBe(false);
    });
  });

  describe("activity", () => {
    it("allows ROOT and SYSTEM_ADMIN", () => {
      expect(canAccessPage("activity", ROOT)).toBe(true);
      expect(canAccessPage("activity", SYSTEM_ADMIN)).toBe(true);
    });

    it("denies TEACHER and OBSERVER", () => {
      expect(canAccessPage("activity", TEACHER)).toBe(false);
      expect(canAccessPage("activity", OBSERVER)).toBe(false);
    });
  });
});

// -------------------------------------------------
// PAGE_PERMISSIONS completeness
// -------------------------------------------------
describe("PAGE_PERMISSIONS", () => {
  it("defines permissions for all expected pages", () => {
    const expectedPages = [
      "dashboard",
      "elections",
      "students",
      "results",
      "adminManagement",
      "activity",
    ];
    expect(Object.keys(PAGE_PERMISSIONS).sort()).toEqual(
      expectedPages.sort(),
    );
  });

  it("every page lists at least one allowed access level", () => {
    for (const page of Object.keys(PAGE_PERMISSIONS) as Array<
      keyof typeof PAGE_PERMISSIONS
    >) {
      expect(PAGE_PERMISSIONS[page].length).toBeGreaterThan(0);
    }
  });
});

// -------------------------------------------------
// getDefaultPage
// -------------------------------------------------
describe("getDefaultPage", () => {
  it("returns /admin for ROOT", () => {
    expect(getDefaultPage(ROOT)).toBe("/admin");
  });

  it("returns /admin for SYSTEM_ADMIN", () => {
    expect(getDefaultPage(SYSTEM_ADMIN)).toBe("/admin");
  });

  it("returns /admin/students for TEACHER", () => {
    expect(getDefaultPage(TEACHER)).toBe("/admin/students");
  });

  it("returns /admin/results for OBSERVER", () => {
    expect(getDefaultPage(OBSERVER)).toBe("/admin/results");
  });

  it("returns /admin for unrecognized level (fallback)", () => {
    expect(getDefaultPage(99 as AccessLevel)).toBe("/admin");
  });
});

// -------------------------------------------------
// canCreateAdmin
// -------------------------------------------------
describe("canCreateAdmin", () => {
  it("ROOT can create any level", () => {
    for (const target of ALL_LEVELS) {
      expect(canCreateAdmin(ROOT, target)).toBe(true);
    }
  });

  it("SYSTEM_ADMIN can create TEACHER and OBSERVER only", () => {
    expect(canCreateAdmin(SYSTEM_ADMIN, ROOT)).toBe(false);
    expect(canCreateAdmin(SYSTEM_ADMIN, SYSTEM_ADMIN)).toBe(false);
    expect(canCreateAdmin(SYSTEM_ADMIN, TEACHER)).toBe(true);
    expect(canCreateAdmin(SYSTEM_ADMIN, OBSERVER)).toBe(true);
  });

  it("TEACHER cannot create any admin", () => {
    for (const target of ALL_LEVELS) {
      expect(canCreateAdmin(TEACHER, target)).toBe(false);
    }
  });

  it("OBSERVER cannot create any admin", () => {
    for (const target of ALL_LEVELS) {
      expect(canCreateAdmin(OBSERVER, target)).toBe(false);
    }
  });
});

// -------------------------------------------------
// getCreatableAccessLevels
// -------------------------------------------------
describe("getCreatableAccessLevels", () => {
  it("ROOT can create all 4 levels", () => {
    const levels = getCreatableAccessLevels(ROOT);
    expect(levels).toEqual([ROOT, SYSTEM_ADMIN, TEACHER, OBSERVER]);
  });

  it("SYSTEM_ADMIN can create TEACHER and OBSERVER", () => {
    const levels = getCreatableAccessLevels(SYSTEM_ADMIN);
    expect(levels).toEqual([TEACHER, OBSERVER]);
  });

  it("TEACHER gets an empty array", () => {
    expect(getCreatableAccessLevels(TEACHER)).toEqual([]);
  });

  it("OBSERVER gets an empty array", () => {
    expect(getCreatableAccessLevels(OBSERVER)).toEqual([]);
  });
});

// -------------------------------------------------
// canDeleteAdmin
// -------------------------------------------------
describe("canDeleteAdmin", () => {
  it("ROOT can delete any level", () => {
    for (const target of ALL_LEVELS) {
      expect(canDeleteAdmin(ROOT, target)).toBe(true);
    }
  });

  it("SYSTEM_ADMIN can delete TEACHER and OBSERVER only", () => {
    expect(canDeleteAdmin(SYSTEM_ADMIN, ROOT)).toBe(false);
    expect(canDeleteAdmin(SYSTEM_ADMIN, SYSTEM_ADMIN)).toBe(false);
    expect(canDeleteAdmin(SYSTEM_ADMIN, TEACHER)).toBe(true);
    expect(canDeleteAdmin(SYSTEM_ADMIN, OBSERVER)).toBe(true);
  });

  it("TEACHER cannot delete any admin", () => {
    for (const target of ALL_LEVELS) {
      expect(canDeleteAdmin(TEACHER, target)).toBe(false);
    }
  });

  it("OBSERVER cannot delete any admin", () => {
    for (const target of ALL_LEVELS) {
      expect(canDeleteAdmin(OBSERVER, target)).toBe(false);
    }
  });
});

// -------------------------------------------------
// canEditAdmin
// -------------------------------------------------
describe("canEditAdmin", () => {
  it("only ROOT can edit admins", () => {
    expect(canEditAdmin(ROOT)).toBe(true);
    expect(canEditAdmin(SYSTEM_ADMIN)).toBe(false);
    expect(canEditAdmin(TEACHER)).toBe(false);
    expect(canEditAdmin(OBSERVER)).toBe(false);
  });
});

// -------------------------------------------------
// canViewAdminManagement
// -------------------------------------------------
describe("canViewAdminManagement", () => {
  it("allows ROOT and SYSTEM_ADMIN", () => {
    expect(canViewAdminManagement(ROOT)).toBe(true);
    expect(canViewAdminManagement(SYSTEM_ADMIN)).toBe(true);
  });

  it("denies TEACHER and OBSERVER", () => {
    expect(canViewAdminManagement(TEACHER)).toBe(false);
    expect(canViewAdminManagement(OBSERVER)).toBe(false);
  });
});

// -------------------------------------------------
// canManageStudents
// -------------------------------------------------
describe("canManageStudents", () => {
  it("allows ROOT and SYSTEM_ADMIN", () => {
    expect(canManageStudents(ROOT)).toBe(true);
    expect(canManageStudents(SYSTEM_ADMIN)).toBe(true);
  });

  it("denies TEACHER and OBSERVER", () => {
    expect(canManageStudents(TEACHER)).toBe(false);
    expect(canManageStudents(OBSERVER)).toBe(false);
  });
});
