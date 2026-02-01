/**
 * Permission Helpers for Admin Access Control
 *
 * Access Levels:
 * - 0 (ROOT): Full access to everything
 * - 1 (SYSTEM_ADMIN): Manage elections, create/delete level 2-3 admins
 * - 2 (TEACHER): Approve/revoke student voting rights only
 * - 3 (OBSERVER): View election results only
 */

import { ACCESS_LEVELS, AccessLevel } from "./admin-types";

// ============================================
// Page Permissions
// ============================================

export const PAGE_PERMISSIONS = {
  dashboard: [ACCESS_LEVELS.ROOT, ACCESS_LEVELS.SYSTEM_ADMIN],
  elections: [ACCESS_LEVELS.ROOT, ACCESS_LEVELS.SYSTEM_ADMIN],
  students: [
    ACCESS_LEVELS.ROOT,
    ACCESS_LEVELS.SYSTEM_ADMIN,
    ACCESS_LEVELS.TEACHER,
  ],
  results: [
    ACCESS_LEVELS.ROOT,
    ACCESS_LEVELS.SYSTEM_ADMIN,
    ACCESS_LEVELS.OBSERVER,
  ],
  adminManagement: [ACCESS_LEVELS.ROOT, ACCESS_LEVELS.SYSTEM_ADMIN],
  activity: [ACCESS_LEVELS.ROOT, ACCESS_LEVELS.SYSTEM_ADMIN],
} as const;

export type PageName = keyof typeof PAGE_PERMISSIONS;

/**
 * Check if an access level can access a specific page
 */
export function canAccessPage(page: PageName, level: AccessLevel): boolean {
  const allowedLevels = PAGE_PERMISSIONS[page] as readonly number[];
  return allowedLevels.includes(level);
}

/**
 * Get the default redirect page for an access level
 */
export function getDefaultPage(level: AccessLevel): string {
  switch (level) {
    case ACCESS_LEVELS.ROOT:
    case ACCESS_LEVELS.SYSTEM_ADMIN:
      return "/admin";
    case ACCESS_LEVELS.TEACHER:
      return "/admin/students";
    case ACCESS_LEVELS.OBSERVER:
      return "/admin/results";
    default:
      return "/admin";
  }
}

// ============================================
// Admin Management Permissions
// ============================================

/**
 * Check if a creator can create an admin with a specific level
 * - ROOT (0): Can create any level (0, 1, 2, 3)
 * - SYSTEM_ADMIN (1): Can create level 2-3 only
 * - Others: Cannot create admins
 */
export function canCreateAdmin(
  creatorLevel: AccessLevel,
  targetLevel: AccessLevel,
): boolean {
  if (creatorLevel === ACCESS_LEVELS.ROOT) {
    return true;
  }
  if (creatorLevel === ACCESS_LEVELS.SYSTEM_ADMIN) {
    return targetLevel >= ACCESS_LEVELS.TEACHER; // Level 2-3 only
  }
  return false;
}

/**
 * Get available access levels that a creator can assign
 */
export function getCreatableAccessLevels(
  creatorLevel: AccessLevel,
): AccessLevel[] {
  if (creatorLevel === ACCESS_LEVELS.ROOT) {
    return [
      ACCESS_LEVELS.ROOT,
      ACCESS_LEVELS.SYSTEM_ADMIN,
      ACCESS_LEVELS.TEACHER,
      ACCESS_LEVELS.OBSERVER,
    ];
  }
  if (creatorLevel === ACCESS_LEVELS.SYSTEM_ADMIN) {
    return [ACCESS_LEVELS.TEACHER, ACCESS_LEVELS.OBSERVER];
  }
  return [];
}

/**
 * Check if a deleter can delete an admin with a specific level
 * - ROOT (0): Can delete any admin (except themselves)
 * - SYSTEM_ADMIN (1): Can delete level 2-3 only
 * - Others: Cannot delete admins
 */
export function canDeleteAdmin(
  deleterLevel: AccessLevel,
  targetLevel: AccessLevel,
): boolean {
  if (deleterLevel === ACCESS_LEVELS.ROOT) {
    return true;
  }
  if (deleterLevel === ACCESS_LEVELS.SYSTEM_ADMIN) {
    return targetLevel >= ACCESS_LEVELS.TEACHER; // Level 2-3 only
  }
  return false;
}

/**
 * Check if an editor can edit admin details
 * - ROOT (0): Can edit any admin
 * - SYSTEM_ADMIN (1): Can edit level 2-3 admins only
 * - Others: Cannot edit admins
 */
export function canEditAdmin(
  editorLevel: AccessLevel,
  targetLevel?: AccessLevel,
): boolean {
  if (editorLevel === ACCESS_LEVELS.ROOT) {
    return true;
  }
  if (editorLevel === ACCESS_LEVELS.SYSTEM_ADMIN) {
    // If targetLevel is provided, check if it's level 2-3
    if (targetLevel !== undefined) {
      return targetLevel >= ACCESS_LEVELS.TEACHER; // Level 2-3 only
    }
    // If targetLevel is not provided, SYSTEM_ADMIN can still access edit UI
    return true;
  }
  return false;
}

/**
 * Check if user can view admin management page
 */
export function canViewAdminManagement(level: AccessLevel): boolean {
  return level === ACCESS_LEVELS.ROOT || level === ACCESS_LEVELS.SYSTEM_ADMIN;
}

/**
 * Check if user can manage students (add, edit, delete, import)
 * - ROOT (0): Yes
 * - SYSTEM_ADMIN (1): Yes
 * - TEACHER (2): No
 * - OBSERVER (3): No
 */
export function canManageStudents(level: AccessLevel): boolean {
  return level === ACCESS_LEVELS.ROOT || level === ACCESS_LEVELS.SYSTEM_ADMIN;
}

/**
 * Check if user can approve/revoke student voting rights
 * - ROOT (0): Yes
 * - SYSTEM_ADMIN (1): Yes
 * - TEACHER (2): Yes (this is their primary function)
 * - OBSERVER (3): No
 */
export function canApproveVotingRights(level: AccessLevel): boolean {
  return (
    level === ACCESS_LEVELS.ROOT ||
    level === ACCESS_LEVELS.SYSTEM_ADMIN ||
    level === ACCESS_LEVELS.TEACHER
  );
}
