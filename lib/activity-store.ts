// Activity Log Store - localStorage-based activity tracking
// This module provides operations for logging and retrieving system activities

import { generateId } from "./election-types";

const STORAGE_KEY = "cd-voting-activities";
const STORAGE_EVENT_NAME = "activities-updated";
const MAX_ACTIVITIES = 100; // Keep only last 100 activities

// ============================================
// Types
// ============================================

/**
 * Activity log type enumeration
 */
export type ActivityType =
  | "vote_cast"
  | "system_check"
  | "admin_action"
  | "election_change";

/**
 * Activity log record
 */
export interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string; // ISO string
  metadata?: Record<string, unknown>;
}

/**
 * Input data for creating a new activity log
 */
export interface CreateActivityData {
  type: ActivityType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Activity display format for UI
 */
export interface ActivityDisplayItem {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
}

// ============================================
// Activity Type Configuration
// ============================================

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

// ============================================
// Storage Operations
// ============================================

/**
 * Get all activities from localStorage
 */
export function getAllActivities(): ActivityLog[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    return JSON.parse(data) as ActivityLog[];
  } catch (error) {
    console.error("Failed to load activities:", error);
    return [];
  }
}

/**
 * Save all activities to localStorage
 */
function saveActivities(activities: ActivityLog[]): void {
  if (typeof window === "undefined") return;

  try {
    // Keep only the last MAX_ACTIVITIES
    const trimmedActivities = activities.slice(0, MAX_ACTIVITIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedActivities));

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
  } catch (error) {
    console.error("Failed to save activities:", error);
  }
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Log a new activity
 * @param data Activity data to log
 * @returns The created activity log
 */
export function logActivity(data: CreateActivityData): ActivityLog {
  const activities = getAllActivities();

  const newActivity: ActivityLog = {
    id: generateId(),
    type: data.type,
    title: data.title,
    description: data.description,
    timestamp: new Date().toISOString(),
    metadata: data.metadata,
  };

  // Add to the beginning (most recent first)
  activities.unshift(newActivity);
  saveActivities(activities);

  return newActivity;
}

/**
 * Get recent activities
 * @param limit Maximum number of activities to return (default: 5)
 * @returns Array of recent activities
 */
export function getRecentActivities(limit: number = 5): ActivityLog[] {
  const activities = getAllActivities();
  return activities.slice(0, limit);
}

/**
 * Get activities by type
 * @param type Activity type to filter by
 * @param limit Maximum number of activities to return
 * @returns Filtered activities
 */
export function getActivitiesByType(
  type: ActivityType,
  limit?: number,
): ActivityLog[] {
  const activities = getAllActivities().filter((a) => a.type === type);
  return limit ? activities.slice(0, limit) : activities;
}

/**
 * Clear all activities (for testing purposes)
 */
export function clearActivities(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}

// ============================================
// Time Formatting
// ============================================

/**
 * Format timestamp to Thai relative time string
 * @param timestamp ISO timestamp string
 * @returns Relative time string in Thai (e.g., "เมื่อสักครู่", "14 นาทีที่แล้ว")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
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
    // Format as Thai date
    return then.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}

// ============================================
// Display Helpers
// ============================================

/**
 * Convert ActivityLog to display format for UI
 * @param activity Activity log to convert
 * @returns Display-ready activity item
 */
export function toDisplayItem(activity: ActivityLog): ActivityDisplayItem {
  const config = ACTIVITY_CONFIG[activity.type];

  return {
    id: activity.id,
    icon: config.icon,
    iconBg: config.iconBg,
    iconColor: config.iconColor,
    title: activity.title,
    description: activity.description,
    time: formatRelativeTime(activity.timestamp),
  };
}

/**
 * Get recent activities formatted for display
 * @param limit Maximum number of activities to return
 * @returns Array of display-ready activity items
 */
export function getRecentActivitiesForDisplay(
  limit: number = 5,
): ActivityDisplayItem[] {
  return getRecentActivities(limit).map(toDisplayItem);
}

// ============================================
// Convenience Logging Functions
// ============================================

/**
 * Log a vote cast activity
 * @param studentId Student ID who voted
 * @param electionTitle Election title
 */
export function logVoteCast(
  studentId: number,
  electionTitle: string,
): ActivityLog {
  return logActivity({
    type: "vote_cast",
    title: "มีการลงคะแนนใหม่",
    description: `รหัสนักเรียน #${studentId} ลงคะแนนใน${electionTitle}`,
    metadata: { studentId, electionTitle },
  });
}

/**
 * Log a system check activity
 * @param message Check result message
 */
export function logSystemCheck(message: string): ActivityLog {
  return logActivity({
    type: "system_check",
    title: "ตรวจสอบระบบ",
    description: message,
  });
}

/**
 * Log an admin action activity
 * @param action Action description
 * @param target Target of the action
 */
export function logAdminAction(action: string, target: string): ActivityLog {
  return logActivity({
    type: "admin_action",
    title: action,
    description: target,
  });
}

/**
 * Log an election change activity
 * @param action Action type (created, updated, closed, etc.)
 * @param electionTitle Election title
 */
export function logElectionChange(
  action: string,
  electionTitle: string,
): ActivityLog {
  return logActivity({
    type: "election_change",
    title: action,
    description: `การเลือกตั้ง "${electionTitle}"`,
    metadata: { electionTitle },
  });
}

// ============================================
// Subscription for Real-time Sync
// ============================================

type ActivityListener = (activities: ActivityLog[]) => void;

/**
 * Subscribe to activity changes
 * @param listener Callback function when activities change
 * @returns Unsubscribe function
 */
export function subscribeToActivities(listener: ActivityListener): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(getAllActivities());
    }
  };

  const handleCustomEvent = () => {
    listener(getAllActivities());
  };

  // Listen for cross-tab changes
  window.addEventListener("storage", handleStorageChange);
  // Listen for same-tab changes
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  };
}
