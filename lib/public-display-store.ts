// Public Display Settings Store - localStorage-based mock backend
// This module manages public display settings for election results

const STORAGE_KEY = "cd-voting-public-display";
const STORAGE_EVENT_NAME = "public-display-updated";

// ============================================
// Types
// ============================================

/**
 * Status of a position winner determination
 */
export type WinnerStatus =
  | "winner" // มีผู้ชนะ
  | "abstain_wins" // Vote No ชนะ
  | "tie" // เสมอ
  | "no_candidates" // ไม่มีผู้สมัคร
  | "no_votes"; // ยังไม่มีคะแนน

/**
 * Display configuration for a single position
 */
export interface PositionDisplayConfig {
  positionId: string;
  showRawScore: boolean; // แสดงคะแนนดิบ
  showWinnerOnly: boolean; // แสดงเฉพาะผู้ชนะ
  skip: boolean; // ข้ามการแสดงผล
}

/**
 * Complete public display settings for an election
 */
export interface PublicDisplaySettings {
  electionId: string;
  isPublished: boolean; // เปิดเผยผลหรือยัง
  publishedAt?: string; // วันเวลาที่เผยแพร่
  positionConfigs: PositionDisplayConfig[];
  globalShowRawScore: boolean; // Default สำหรับทุกตำแหน่ง
  globalShowWinnerOnly: boolean; // Default สำหรับทุกตำแหน่ง
}

// ============================================
// Storage Operations
// ============================================

/**
 * Get all display settings from localStorage
 */
export function getAllDisplaySettings(): PublicDisplaySettings[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load display settings:", error);
    return [];
  }
}

/**
 * Save all display settings to localStorage
 */
function saveDisplaySettings(settings: PublicDisplaySettings[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

  // Dispatch custom event for real-time sync
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Get display settings for a specific election
 * Returns null if not found
 */
export function getDisplaySettings(
  electionId: string,
): PublicDisplaySettings | null {
  const allSettings = getAllDisplaySettings();
  return allSettings.find((s) => s.electionId === electionId) || null;
}

/**
 * Create default display settings for an election
 */
export function createDefaultSettings(
  electionId: string,
  positionIds: string[],
): PublicDisplaySettings {
  return {
    electionId,
    isPublished: false,
    positionConfigs: positionIds.map((positionId) => ({
      positionId,
      showRawScore: true,
      showWinnerOnly: false,
      skip: false,
    })),
    globalShowRawScore: true,
    globalShowWinnerOnly: false,
  };
}

/**
 * Get or create display settings for an election
 */
export function getOrCreateDisplaySettings(
  electionId: string,
  positionIds: string[],
): PublicDisplaySettings {
  const existing = getDisplaySettings(electionId);
  if (existing) {
    // Ensure all positions have configs (in case new positions were added)
    const existingPositionIds = new Set(
      existing.positionConfigs.map((c) => c.positionId),
    );
    const newPositionConfigs = positionIds
      .filter((id) => !existingPositionIds.has(id))
      .map((positionId) => ({
        positionId,
        showRawScore: existing.globalShowRawScore,
        showWinnerOnly: existing.globalShowWinnerOnly,
        skip: false,
      }));

    if (newPositionConfigs.length > 0) {
      return {
        ...existing,
        positionConfigs: [...existing.positionConfigs, ...newPositionConfigs],
      };
    }
    return existing;
  }

  // Create new settings
  const newSettings = createDefaultSettings(electionId, positionIds);
  const allSettings = getAllDisplaySettings();
  allSettings.push(newSettings);
  saveDisplaySettings(allSettings);

  return newSettings;
}

/**
 * Update display settings for an election
 */
export function updateDisplaySettings(
  electionId: string,
  updates: Partial<Omit<PublicDisplaySettings, "electionId">>,
): PublicDisplaySettings | null {
  const allSettings = getAllDisplaySettings();
  const index = allSettings.findIndex((s) => s.electionId === electionId);

  if (index === -1) return null;

  const updated: PublicDisplaySettings = {
    ...allSettings[index],
    ...updates,
  };

  allSettings[index] = updated;
  saveDisplaySettings(allSettings);

  return updated;
}

/**
 * Update a specific position's display config
 */
export function updatePositionConfig(
  electionId: string,
  positionId: string,
  updates: Partial<Omit<PositionDisplayConfig, "positionId">>,
): PublicDisplaySettings | null {
  const settings = getDisplaySettings(electionId);
  if (!settings) return null;

  const updatedConfigs = settings.positionConfigs.map((config) =>
    config.positionId === positionId ? { ...config, ...updates } : config,
  );

  return updateDisplaySettings(electionId, { positionConfigs: updatedConfigs });
}

/**
 * Publish election results
 */
export function publishResults(
  electionId: string,
): PublicDisplaySettings | null {
  return updateDisplaySettings(electionId, {
    isPublished: true,
    publishedAt: new Date().toISOString(),
  });
}

/**
 * Unpublish election results
 */
export function unpublishResults(
  electionId: string,
): PublicDisplaySettings | null {
  return updateDisplaySettings(electionId, {
    isPublished: false,
    publishedAt: undefined,
  });
}

/**
 * Apply global settings to all positions
 */
export function applyGlobalSettings(
  electionId: string,
  globalShowRawScore: boolean,
  globalShowWinnerOnly: boolean,
): PublicDisplaySettings | null {
  const settings = getDisplaySettings(electionId);
  if (!settings) return null;

  const updatedConfigs = settings.positionConfigs.map((config) => ({
    ...config,
    showRawScore: globalShowRawScore,
    showWinnerOnly: globalShowWinnerOnly,
  }));

  return updateDisplaySettings(electionId, {
    globalShowRawScore,
    globalShowWinnerOnly,
    positionConfigs: updatedConfigs,
  });
}

/**
 * Delete display settings for an election
 */
export function deleteDisplaySettings(electionId: string): boolean {
  const allSettings = getAllDisplaySettings();
  const filtered = allSettings.filter((s) => s.electionId !== electionId);

  if (filtered.length === allSettings.length) return false;

  saveDisplaySettings(filtered);
  return true;
}

// ============================================
// Subscription for Real-time Sync
// ============================================

export type DisplaySettingsListener = (
  settings: PublicDisplaySettings[],
) => void;

/**
 * Subscribe to display settings changes
 */
export function subscribeToDisplaySettings(
  listener: DisplaySettingsListener,
): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(getAllDisplaySettings());
    }
  };

  const handleCustomEvent = () => {
    listener(getAllDisplaySettings());
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  };
}

// ============================================
// Reset (for testing)
// ============================================

/**
 * Clear all display settings data
 */
export function resetDisplaySettings(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}
