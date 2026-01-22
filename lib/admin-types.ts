/**
 * Shared types and constants for Admin Access Levels
 * This file can be safely imported in both Server and Client Components
 */

// ============================================
// Access Level Types and Constants
// ============================================

// Access Level Constants
export const ACCESS_LEVELS = {
  ROOT: 0, // Root Admin - full access
  SYSTEM_ADMIN: 1, // System Admin - manage elections, create level 2-3
  TEACHER: 2, // Teacher - approve/revoke student voting rights only
  OBSERVER: 3, // Observer - view election results only
} as const;

export type AccessLevel = (typeof ACCESS_LEVELS)[keyof typeof ACCESS_LEVELS];

// Access Level Labels (for UI)
export const ACCESS_LEVEL_LABELS: { [key: number]: string } = {
  [ACCESS_LEVELS.ROOT]: "Root Admin",
  [ACCESS_LEVELS.SYSTEM_ADMIN]: "ผู้ดูแลระบบ",
  [ACCESS_LEVELS.TEACHER]: "คุณครูประจำชั้น",
  [ACCESS_LEVELS.OBSERVER]: "ผู้สังเกตการณ์",
};

// Helper function to get label safely
export function getAccessLevelLabel(level: number): string {
  return ACCESS_LEVEL_LABELS[level] || "ไม่ทราบ";
}

// ============================================
// Admin User Type (for Client Components)
// ============================================

export interface AdminUser {
  id: number;
  username: string;
  displayName: string | null;
  accessLevel: AccessLevel;
}
