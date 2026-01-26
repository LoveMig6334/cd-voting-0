"use server";

import { PoolConnection } from "mysql2/promise";
import {
  execute,
  PositionDisplayConfigRow,
  PublicDisplaySettingsRow,
  query,
  transaction,
} from "@/lib/db";

// ============================================
// Types
// ============================================

export interface PositionDisplayConfig {
  positionId: string;
  showRawScore: boolean;
  showWinnerOnly: boolean;
  skip: boolean;
}

export interface PublicDisplaySettings {
  electionId: string;
  isPublished: boolean;
  publishedAt?: string;
  positionConfigs: PositionDisplayConfig[];
  globalShowRawScore: boolean;
  globalShowWinnerOnly: boolean;
}

// ============================================
// Query Functions
// ============================================

/**
 * Get display settings for a specific election
 */
export async function getDisplaySettings(
  electionId: number,
): Promise<PublicDisplaySettings | null> {
  try {
    // Get main settings
    const settings = await query<PublicDisplaySettingsRow>(
      "SELECT * FROM public_display_settings WHERE election_id = ?",
      [electionId],
    );

    if (settings.length === 0) return null;

    const setting = settings[0];

    // Get position configs
    const configs = await query<PositionDisplayConfigRow>(
      "SELECT * FROM position_display_configs WHERE election_id = ? ORDER BY position_id",
      [electionId],
    );

    return {
      electionId: electionId.toString(),
      isPublished: setting.is_published,
      publishedAt: setting.published_at
        ? setting.published_at.toISOString()
        : undefined,
      globalShowRawScore: setting.global_show_raw_score,
      globalShowWinnerOnly: setting.global_show_winner_only,
      positionConfigs: configs.map((c) => ({
        positionId: c.position_id,
        showRawScore: c.show_raw_score,
        showWinnerOnly: c.show_winner_only,
        skip: c.skip,
      })),
    };
  } catch (error) {
    console.error("Error getting display settings:", error);
    return null;
  }
}

/**
 * Get or create display settings for an election
 */
export async function getOrCreateDisplaySettings(
  electionId: number,
  positionIds: string[],
): Promise<PublicDisplaySettings> {
  try {
    // Try to get existing settings
    const existing = await getDisplaySettings(electionId);
    if (existing) {
      // Check if we need to add new positions
      const existingPositionIds = new Set(
        existing.positionConfigs.map((c) => c.positionId),
      );
      const newPositionIds = positionIds.filter(
        (id) => !existingPositionIds.has(id),
      );

      if (newPositionIds.length > 0) {
        // Add missing positions
        for (const positionId of newPositionIds) {
          await execute(
            `INSERT INTO position_display_configs
             (election_id, position_id, show_raw_score, show_winner_only, skip)
             VALUES (?, ?, ?, ?, ?)`,
            [
              electionId,
              positionId,
              existing.globalShowRawScore,
              existing.globalShowWinnerOnly,
              false,
            ],
          );
        }

        // Return updated settings
        return (await getDisplaySettings(electionId))!;
      }

      return existing;
    }

    // Create new settings using transaction
    await transaction(async (conn: PoolConnection) => {
      // Insert main settings
      await conn.execute(
        `INSERT INTO public_display_settings
         (election_id, is_published, global_show_raw_score, global_show_winner_only)
         VALUES (?, FALSE, TRUE, FALSE)`,
        [electionId],
      );

      // Insert position configs
      for (const positionId of positionIds) {
        await conn.execute(
          `INSERT INTO position_display_configs
           (election_id, position_id, show_raw_score, show_winner_only, skip)
           VALUES (?, ?, TRUE, FALSE, FALSE)`,
          [electionId, positionId],
        );
      }
    });

    // Return created settings
    return (await getDisplaySettings(electionId))!;
  } catch (error) {
    console.error("Error getting or creating display settings:", error);
    throw error;
  }
}

/**
 * Update global display settings
 */
export async function updateDisplaySettings(
  electionId: number,
  updates: {
    globalShowRawScore?: boolean;
    globalShowWinnerOnly?: boolean;
  },
): Promise<PublicDisplaySettings | null> {
  try {
    const setParts: string[] = [];
    const params: unknown[] = [];

    if (updates.globalShowRawScore !== undefined) {
      setParts.push("global_show_raw_score = ?");
      params.push(updates.globalShowRawScore);
    }

    if (updates.globalShowWinnerOnly !== undefined) {
      setParts.push("global_show_winner_only = ?");
      params.push(updates.globalShowWinnerOnly);
    }

    if (setParts.length === 0) {
      return await getDisplaySettings(electionId);
    }

    params.push(electionId);

    await execute(
      `UPDATE public_display_settings SET ${setParts.join(", ")} WHERE election_id = ?`,
      params,
    );

    return await getDisplaySettings(electionId);
  } catch (error) {
    console.error("Error updating display settings:", error);
    return null;
  }
}

/**
 * Update a specific position's display config
 */
export async function updatePositionConfig(
  electionId: number,
  positionId: string,
  updates: {
    showRawScore?: boolean;
    showWinnerOnly?: boolean;
    skip?: boolean;
  },
): Promise<PublicDisplaySettings | null> {
  try {
    const setParts: string[] = [];
    const params: unknown[] = [];

    if (updates.showRawScore !== undefined) {
      setParts.push("show_raw_score = ?");
      params.push(updates.showRawScore);
    }

    if (updates.showWinnerOnly !== undefined) {
      setParts.push("show_winner_only = ?");
      params.push(updates.showWinnerOnly);
    }

    if (updates.skip !== undefined) {
      setParts.push("skip = ?");
      params.push(updates.skip);
    }

    if (setParts.length === 0) {
      return await getDisplaySettings(electionId);
    }

    params.push(electionId, positionId);

    await execute(
      `UPDATE position_display_configs SET ${setParts.join(", ")} WHERE election_id = ? AND position_id = ?`,
      params,
    );

    return await getDisplaySettings(electionId);
  } catch (error) {
    console.error("Error updating position config:", error);
    return null;
  }
}

/**
 * Publish election results
 */
export async function publishResults(
  electionId: number,
): Promise<PublicDisplaySettings | null> {
  try {
    await execute(
      `UPDATE public_display_settings
       SET is_published = TRUE, published_at = NOW()
       WHERE election_id = ?`,
      [electionId],
    );

    return await getDisplaySettings(electionId);
  } catch (error) {
    console.error("Error publishing results:", error);
    return null;
  }
}

/**
 * Unpublish election results
 */
export async function unpublishResults(
  electionId: number,
): Promise<PublicDisplaySettings | null> {
  try {
    await execute(
      `UPDATE public_display_settings
       SET is_published = FALSE, published_at = NULL
       WHERE election_id = ?`,
      [electionId],
    );

    return await getDisplaySettings(electionId);
  } catch (error) {
    console.error("Error unpublishing results:", error);
    return null;
  }
}

/**
 * Delete display settings for an election
 */
export async function deleteDisplaySettings(
  electionId: number,
): Promise<boolean> {
  try {
    // CASCADE delete will remove position configs automatically
    const result = await execute(
      "DELETE FROM public_display_settings WHERE election_id = ?",
      [electionId],
    );

    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting display settings:", error);
    return false;
  }
}
