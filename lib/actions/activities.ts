"use server";

import {
  ActivityDisplayItem,
  ActivityRow,
  ActivityType,
  execute,
  query,
} from "@/lib/db";

// ==========================================
// Types
// ==========================================

/**
 * Input data for creating a new activity log
 */
interface CreateActivityData {
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ==========================================
// Activity Type Configuration
// ==========================================

const ACTIVITY_CONFIG: Record<
  ActivityType,
  { icon: string; iconBg: string; iconColor: string }
> = {
  vote_cast: {
    icon: "how_to_reg",
    iconBg: "bg-royal-blue",
    iconColor: "text-white",
  },
  system_check: {
    icon: "check_circle",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
  },
  admin_action: {
    icon: "edit",
    iconBg: "bg-vivid-yellow",
    iconColor: "text-dark-slate",
  },
  election_change: {
    icon: "how_to_vote",
    iconBg: "bg-violet-500",
    iconColor: "text-white",
  },
};

// ==========================================
// Time Formatting
// ==========================================

/**
 * Format timestamp to Thai relative time string
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "เมื่อสักครู่";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} นาทีที่แล้ว`;
  } else if (diffHours < 24) {
    return `${diffHours} ชั่วโมงที่แล้ว`;
  } else if (diffDays === 1) {
    return "เมื่อวาน";
  } else if (diffDays < 7) {
    return `${diffDays} วันที่แล้ว`;
  } else {
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

/**
 * Convert ActivityRow to display format for UI
 */
function toDisplayItem(activity: ActivityRow): ActivityDisplayItem {
  const config = ACTIVITY_CONFIG[activity.type];

  return {
    id: activity.id,
    icon: config.icon,
    iconBg: config.iconBg,
    iconColor: config.iconColor,
    title: activity.title,
    description: activity.description,
    time: formatRelativeTime(activity.created_at),
  };
}

// ==========================================
// CRUD Operations
// ==========================================

/**
 * Log a new activity
 */
export async function logActivity(data: CreateActivityData): Promise<number> {
  const result = await execute(
    `INSERT INTO activities (type, title, description, metadata) VALUES (?, ?, ?, ?)`,
    [
      data.type,
      data.title,
      data.description,
      data.metadata ? JSON.stringify(data.metadata) : null,
    ],
  );
  return result.insertId;
}

/**
 * Get recent activities
 */
export async function getRecentActivities(
  limit: number = 5,
): Promise<ActivityRow[]> {
  return query<ActivityRow>(
    `SELECT * FROM activities ORDER BY created_at DESC LIMIT ?`,
    [limit],
  );
}

/**
 * Get recent activities formatted for display
 */
export async function getRecentActivitiesForDisplay(
  limit: number = 5,
): Promise<ActivityDisplayItem[]> {
  const activities = await getRecentActivities(limit);
  return activities.map(toDisplayItem);
}

/**
 * Get all activities formatted for display (max 100)
 */
export async function getAllActivitiesForDisplay(): Promise<
  ActivityDisplayItem[]
> {
  const activities = await query<ActivityRow>(
    `SELECT * FROM activities ORDER BY created_at DESC LIMIT 100`,
    [],
  );
  return activities.map(toDisplayItem);
}

/**
 * Get activities by type formatted for display
 */
export async function getActivitiesByTypeForDisplay(
  type: ActivityType,
): Promise<ActivityDisplayItem[]> {
  const activities = await getActivitiesByType(type);
  return activities.map(toDisplayItem);
}

/**
 * Get activities by type
 */
export async function getActivitiesByType(
  type: ActivityType,
  limit?: number,
): Promise<ActivityRow[]> {
  if (limit) {
    return query<ActivityRow>(
      `SELECT * FROM activities WHERE type = ? ORDER BY created_at DESC LIMIT ?`,
      [type, limit],
    );
  }
  return query<ActivityRow>(
    `SELECT * FROM activities WHERE type = ? ORDER BY created_at DESC`,
    [type],
  );
}

// ==========================================
// Convenience Logging Functions
// ==========================================

/**
 * Log a vote cast activity
 */
export async function logVoteCast(
  studentId: string,
  electionTitle: string,
): Promise<number> {
  return logActivity({
    type: "vote_cast",
    title: "มีการลงคะแนนใหม่",
    description: `รหัสนักเรียน #${studentId} ลงคะแนนใน${electionTitle}`,
    metadata: { studentId, electionTitle },
  });
}

/**
 * Log a system check activity
 */
export async function logSystemCheck(message: string): Promise<number> {
  return logActivity({
    type: "system_check",
    title: "ตรวจสอบระบบ",
    description: message,
  });
}

/**
 * Log an admin action activity
 */
export async function logAdminAction(
  action: string,
  target: string,
): Promise<number> {
  return logActivity({
    type: "admin_action",
    title: action,
    description: target,
  });
}

/**
 * Log an election change activity
 */
export async function logElectionChange(
  action: string,
  electionTitle: string,
): Promise<number> {
  return logActivity({
    type: "election_change",
    title: action,
    description: `การเลือกตั้ง "${electionTitle}"`,
    metadata: { electionTitle },
  });
}
