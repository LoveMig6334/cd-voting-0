"use server";

import { logAdminAction, logElectionChange } from "@/lib/actions/activities";
import { getCurrentAdmin } from "@/lib/actions/admin-auth";
import { ACCESS_LEVELS } from "@/lib/admin-types";
import {
  CandidateRow,
  ElectionRow,
  execute,
  PositionRow,
  query,
} from "@/lib/db";
import { revalidatePath } from "next/cache";

// ==========================================
// Types
// ==========================================

export type ElectionStatus = "PENDING" | "OPEN" | "CLOSED";

export interface ElectionWithDetails extends ElectionRow {
  positions: PositionRow[];
  candidates: CandidateRow[];
}

export interface CreateElectionData {
  title: string;
  description?: string;
  type?: string;
  startDate: string;
  endDate: string;
}

export interface CreatePositionData {
  id: string;
  title: string;
  icon?: string;
  enabled?: boolean;
  isCustom?: boolean;
  sortOrder?: number;
}

export interface CreateCandidateData {
  positionId: string;
  rank: number;
  name: string;
  slogan?: string;
  imageUrl?: string;
}

// Default positions for student committee
const DEFAULT_POSITIONS: Omit<CreatePositionData, "sortOrder">[] = [
  // ประธาน/รองประธาน ชาย-หญิง
  { id: "president", title: "ประธาน", icon: "person", enabled: true },
  {
    id: "vice-president",
    title: "รองประธาน",
    icon: "supervisor_account",
    enabled: true,
  },
  { id: "male-president", title: "ประธานชาย", icon: "man", enabled: true },
  {
    id: "male-vice-president",
    title: "รองประธานชาย",
    icon: "man_2",
    enabled: true,
  },
  { id: "female-president", title: "ประธานหญิง", icon: "woman", enabled: true },
  {
    id: "female-vice-president",
    title: "รองประธานหญิง",
    icon: "woman_2",
    enabled: true,
  },
  // เลขานุการ
  { id: "secretary", title: "เลขานุการ", icon: "edit_note", enabled: true },
  {
    id: "vice-secretary",
    title: "รองเลขานุการ",
    icon: "edit_document",
    enabled: true,
  },
  // เหรัญญิก
  { id: "treasurer", title: "เหรัญญิก", icon: "payments", enabled: true },
  {
    id: "vice-treasurer",
    title: "รองเหรัญญิก",
    icon: "account_balance_wallet",
    enabled: true,
  },
  // ประชาสัมพันธ์
  {
    id: "public-relations",
    title: "ประชาสัมพันธ์",
    icon: "campaign",
    enabled: true,
  },
  {
    id: "vice-public-relations",
    title: "รองประชาสัมพันธ์",
    icon: "record_voice_over",
    enabled: true,
  },
  // ชมรมดนตรี
  {
    id: "music-president",
    title: "ประธานดนตรี",
    icon: "music_note",
    enabled: true,
  },
  {
    id: "vice-music-president",
    title: "รองประธานดนตรี",
    icon: "library_music",
    enabled: true,
  },
  // ชมรมกีฬา
  {
    id: "sports-president",
    title: "ประธานกีฬา",
    icon: "sports_soccer",
    enabled: true,
  },
  {
    id: "vice-sports-president",
    title: "รองประธานกีฬา",
    icon: "sports",
    enabled: true,
  },
  // เชียร์
  {
    id: "cheer-president",
    title: "ประธานเชียร์",
    icon: "celebration",
    enabled: true,
  },
  {
    id: "vice-cheer-president",
    title: "รองประธานเชียร์",
    icon: "sentiment_very_satisfied",
    enabled: true,
  },
  // ระเบียบ
  {
    id: "discipline-president",
    title: "ประธานระเบียบ",
    icon: "gavel",
    enabled: true,
  },
  {
    id: "vice-discipline-president",
    title: "รองประธานระเบียบ",
    icon: "verified_user",
    enabled: true,
  },
  {
    id: "male-discipline-president",
    title: "ประธานระเบียบชาย",
    icon: "security",
    enabled: true,
  },
  {
    id: "female-discipline-president",
    title: "ประธานระเบียบหญิง",
    icon: "shield_person",
    enabled: true,
  },
];

// ==========================================
// Helper Functions
// ==========================================

/**
 * Calculate election status based on dates
 * Note: This is a helper function, not a server action
 */
function calculateStatus(
  startDate: Date | string,
  endDate: Date | string,
): ElectionStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return "PENDING";
  if (now >= start && now <= end) return "OPEN";
  return "CLOSED";
}

// ==========================================
// Read Operations
// ==========================================

/**
 * Get all elections (excludes archived)
 */
export async function getAllElections(): Promise<ElectionRow[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  return query<ElectionRow>(
    "SELECT * FROM elections WHERE is_active = TRUE AND is_archived = FALSE ORDER BY start_date DESC",
  );
}

/**
 * Get active/open elections (excludes archived)
 */
export async function getActiveElections(): Promise<ElectionRow[]> {
  // Update status based on current time
  const elections = await query<ElectionRow>(
    "SELECT * FROM elections WHERE is_active = TRUE AND is_archived = FALSE ORDER BY start_date ASC",
  );

  // Filter by calculated status
  return elections.filter((e) => {
    const status = calculateStatus(e.start_date, e.end_date);
    return status === "OPEN";
  });
}

/**
 * Get election by ID with positions and candidates
 */
export async function getElectionById(
  id: number,
): Promise<ElectionWithDetails | null> {
  const elections = await query<ElectionRow>(
    "SELECT * FROM elections WHERE id = ?",
    [id],
  );

  if (elections.length === 0) return null;

  const [positions, candidates] = await Promise.all([
    query<PositionRow>(
      "SELECT * FROM positions WHERE election_id = ? ORDER BY sort_order ASC",
      [id],
    ),
    query<CandidateRow>(
      "SELECT * FROM candidates WHERE election_id = ? ORDER BY position_id, rank ASC",
      [id],
    ),
  ]);

  return {
    ...elections[0],
    positions,
    candidates,
  };
}

/**
 * Get positions for an election
 */
export async function getPositionsByElection(
  electionId: number,
): Promise<PositionRow[]> {
  return query<PositionRow>(
    "SELECT * FROM positions WHERE election_id = ? AND enabled = TRUE ORDER BY sort_order ASC",
    [electionId],
  );
}

/**
 * Get candidates for a position
 */
export async function getCandidatesByPosition(
  electionId: number,
  positionId: string,
): Promise<CandidateRow[]> {
  return query<CandidateRow>(
    "SELECT * FROM candidates WHERE election_id = ? AND position_id = ? ORDER BY rank ASC",
    [electionId, positionId],
  );
}

// ==========================================
// Write Operations - Elections
// ==========================================

/**
 * Create a new election with default positions
 */
export async function createElection(
  data: CreateElectionData,
): Promise<{ success: boolean; electionId?: number; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const status = calculateStatus(data.startDate, data.endDate);

    // Insert election
    const result = await execute(
      `INSERT INTO elections (title, description, type, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.description || null,
        data.type || "student-committee",
        data.startDate,
        data.endDate,
        status,
      ],
    );

    const electionId = result.insertId;

    // Insert default positions in parallel
    if (data.type === "student-committee" || !data.type) {
      await Promise.all(
        DEFAULT_POSITIONS.map((pos, i) => {
          const posId = `${electionId}-${pos.id}`;
          return execute(
            `INSERT INTO positions (id, election_id, title, icon, enabled, is_custom, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              posId,
              electionId,
              pos.title,
              pos.icon || null,
              pos.enabled ?? true,
              pos.isCustom ?? false,
              i,
            ],
          );
        }),
      );
    }

    revalidatePath("/admin/elections");

    // Log activity
    await logElectionChange("สร้างการเลือกตั้งใหม่", data.title);

    return { success: true, electionId };
  } catch (error) {
    console.error("Create election error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้างการเลือกตั้ง" };
  }
}

/**
 * Update an election
 */
export async function updateElection(
  id: number,
  data: Partial<CreateElectionData>,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) {
      setClauses.push("title = ?");
      values.push(data.title);
    }
    if (data.description !== undefined) {
      setClauses.push("description = ?");
      values.push(data.description);
    }
    if (data.type !== undefined) {
      setClauses.push("type = ?");
      values.push(data.type);
    }
    if (data.startDate !== undefined) {
      setClauses.push("start_date = ?");
      values.push(data.startDate);
    }
    if (data.endDate !== undefined) {
      setClauses.push("end_date = ?");
      values.push(data.endDate);
    }

    // Recalculate status if dates changed
    if (data.startDate || data.endDate) {
      const election = await getElectionById(id);
      if (election) {
        const newStatus = calculateStatus(
          data.startDate || election.start_date,
          data.endDate || election.end_date,
        );
        setClauses.push("status = ?");
        values.push(newStatus);
      }
    }

    if (setClauses.length === 0) {
      return { success: false, error: "ไม่มีข้อมูลที่ต้องอัปเดต" };
    }

    values.push(id);
    await execute(
      `UPDATE elections SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    revalidatePath("/admin/elections");
    revalidatePath(`/admin/elections/${id}`);

    // Log activity
    await logElectionChange("แก้ไขการเลือกตั้ง", data.title || "(ไม่ระบุชื่อ)");

    return { success: true };
  } catch (error) {
    console.error("Update election error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไข" };
  }
}

/**
 * Delete an election (soft delete)
 */
export async function deleteElection(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // Get election title before delete
    const election = await getElectionById(id);

    await execute("UPDATE elections SET is_active = FALSE WHERE id = ?", [id]);
    revalidatePath("/admin/elections");

    // Log activity
    if (election) {
      await logElectionChange("ลบการเลือกตั้ง", election.title);
    }

    return { success: true };
  } catch (error) {
    console.error("Delete election error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบ" };
  }
}

// ==========================================
// Archive Operations
// ==========================================

/**
 * Check if current admin can archive/unarchive elections
 * Only ROOT (0) and SYSTEM_ADMIN (1) can archive
 */
async function canManageArchive(): Promise<boolean> {
  const session = await getCurrentAdmin();
  if (!session) return false;

  return (
    session.admin.access_level === ACCESS_LEVELS.ROOT ||
    session.admin.access_level === ACCESS_LEVELS.SYSTEM_ADMIN
  );
}

/**
 * Get all archived elections
 */
export async function getArchivedElections(): Promise<ElectionRow[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  return query<ElectionRow>(
    "SELECT * FROM elections WHERE is_active = TRUE AND is_archived = TRUE ORDER BY updated_at DESC",
  );
}

/**
 * Get election by ID including archived ones (for admin restore)
 */
export async function getElectionByIdIncludeArchived(
  id: number,
): Promise<ElectionWithDetails | null> {
  const session = await getCurrentAdmin();
  if (!session) return null;

  const elections = await query<ElectionRow>(
    "SELECT * FROM elections WHERE id = ? AND is_active = TRUE",
    [id],
  );

  if (elections.length === 0) return null;

  const [positions, candidates] = await Promise.all([
    query<PositionRow>(
      "SELECT * FROM positions WHERE election_id = ? ORDER BY sort_order ASC",
      [id],
    ),
    query<CandidateRow>(
      "SELECT * FROM candidates WHERE election_id = ? ORDER BY position_id, rank ASC",
      [id],
    ),
  ]);

  return {
    ...elections[0],
    positions,
    candidates,
  };
}

/**
 * Archive an election
 * Only ROOT (0) and SYSTEM_ADMIN (1) can archive
 */
export async function archiveElection(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Permission check
    if (!(await canManageArchive())) {
      return { success: false, error: "คุณไม่มีสิทธิ์เก็บถาวรการเลือกตั้ง" };
    }

    // Get election before archive
    const election = await getElectionById(id);
    if (!election) {
      return { success: false, error: "ไม่พบการเลือกตั้ง" };
    }

    // Check if election is already archived
    if (election.is_archived) {
      return { success: false, error: "การเลือกตั้งนี้ถูกเก็บถาวรแล้ว" };
    }

    await execute("UPDATE elections SET is_archived = TRUE WHERE id = ?", [id]);

    revalidatePath("/admin/elections");

    // Log activity
    await logElectionChange("เก็บถาวรการเลือกตั้ง", election.title);

    return { success: true };
  } catch (error) {
    console.error("Archive election error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการเก็บถาวร" };
  }
}

/**
 * Unarchive/restore an election
 * Only ROOT (0) and SYSTEM_ADMIN (1) can unarchive
 */
export async function unarchiveElection(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Permission check
    if (!(await canManageArchive())) {
      return { success: false, error: "คุณไม่มีสิทธิ์กู้คืนการเลือกตั้ง" };
    }

    // Get election before unarchive (must use include archived version)
    const election = await getElectionByIdIncludeArchived(id);
    if (!election) {
      return { success: false, error: "ไม่พบการเลือกตั้ง" };
    }

    // Check if election is not archived
    if (!election.is_archived) {
      return { success: false, error: "การเลือกตั้งนี้ไม่ได้ถูกเก็บถาวร" };
    }

    await execute("UPDATE elections SET is_archived = FALSE WHERE id = ?", [
      id,
    ]);

    revalidatePath("/admin/elections");

    // Log activity
    await logElectionChange("กู้คืนการเลือกตั้งจากถาวร", election.title);

    return { success: true };
  } catch (error) {
    console.error("Unarchive election error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการกู้คืน" };
  }
}

/**
 * Manually update election status (OPEN / CLOSED)
 * Adjusts dates to ensure status is reflected
 */
export async function updateElectionStatus(
  id: number,
  newStatus: "OPEN" | "CLOSED",
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const election = await getElectionById(id);
    if (!election) return { success: false, error: "ไม่พบการเลือกตั้ง" };

    const now = new Date();
    const setClauses: string[] = ["status = ?"];
    const values: unknown[] = [newStatus];

    if (newStatus === "OPEN") {
      setClauses.push("start_date = ?");
      values.push(now);
      // Ensure end_date is in the future if it's already passed
      if (new Date(election.end_date) <= now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        setClauses.push("end_date = ?");
        values.push(tomorrow);
      }
    } else {
      // CLOSED
      setClauses.push("end_date = ?");
      values.push(now);
    }

    values.push(id);
    await execute(
      `UPDATE elections SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    revalidatePath("/admin");
    revalidatePath("/admin/elections");
    revalidatePath(`/admin/elections/${id}`);

    // Log activity
    await logElectionChange(
      `${newStatus === "OPEN" ? "เปิด" : "ปิด"}การเลือกตั้งด้วยตนเอง`,
      election.title,
    );

    return { success: true };
  } catch (error) {
    console.error("Update status error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการปรับสถานะ" };
  }
}

// ==========================================
// Write Operations - Positions
// ==========================================

/**
 * Check if election is locked (OPEN or CLOSED)
 */
export async function isElectionLocked(electionId: number): Promise<boolean> {
  const session = await getCurrentAdmin();
  if (!session) return false;

  const election = await getElectionById(electionId);
  if (!election) return false;

  const status = calculateStatus(election.start_date, election.end_date);
  return status === "OPEN" || status === "CLOSED";
}

/**
 * Toggle position enabled status
 */
export async function togglePosition(
  electionId: number,
  positionId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    if (await isElectionLocked(electionId)) {
      return {
        success: false,
        error: "ไม่สามารถแก้ไขตำแหน่งได้เมื่อการเลือกตั้งเริ่มแล้ว",
      };
    }

    await execute(
      "UPDATE positions SET enabled = NOT enabled WHERE id = ? AND election_id = ?",
      [positionId, electionId],
    );

    revalidatePath(`/admin/elections/${electionId}`);
    return { success: true };
  } catch (error) {
    console.error("Toggle position error:", error);
    return { success: false, error: "เกิดข้อผิดพลาด" };
  }
}

/**
 * Add a custom position
 */
export async function addCustomPosition(
  electionId: number,
  title: string,
  icon: string = "star",
): Promise<{ success: boolean; positionId?: string; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    if (await isElectionLocked(electionId)) {
      return {
        success: false,
        error: "ไม่สามารถเพิ่มตำแหน่งได้เมื่อการเลือกตั้งเริ่มแล้ว",
      };
    }

    // Get max sort order
    const positions = await query<PositionRow>(
      "SELECT MAX(sort_order) as max_order FROM positions WHERE election_id = ?",
      [electionId],
    );
    const maxOrder = (positions[0] as unknown as { max_order: number | null })
      ?.max_order;
    const sortOrder = (maxOrder ?? -1) + 1;

    const positionId = `${electionId}-custom-${Date.now()}`;
    await execute(
      `INSERT INTO positions (id, election_id, title, icon, enabled, is_custom, sort_order)
       VALUES (?, ?, ?, ?, TRUE, TRUE, ?)`,
      [positionId, electionId, title, icon, sortOrder],
    );

    revalidatePath(`/admin/elections/${electionId}`);
    return { success: true, positionId };
  } catch (error) {
    console.error("Add position error:", error);
    return { success: false, error: "เกิดข้อผิดพลาด" };
  }
}

// ==========================================
// Write Operations - Candidates
// ==========================================

/**
 * Add a candidate
 */
export async function addCandidate(
  electionId: number,
  data: CreateCandidateData,
): Promise<{ success: boolean; candidateId?: number; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    if (await isElectionLocked(electionId)) {
      return {
        success: false,
        error: "ไม่สามารถเพิ่มผู้สมัครได้เมื่อการเลือกตั้งเริ่มแล้ว",
      };
    }

    // Check for duplicate name in same position
    const existing = await query<CandidateRow>(
      "SELECT id FROM candidates WHERE election_id = ? AND position_id = ? AND LOWER(name) = LOWER(?)",
      [electionId, data.positionId, data.name.trim()],
    );

    if (existing.length > 0) {
      return { success: false, error: "ผู้สมัครชื่อนี้มีอยู่แล้วในตำแหน่งนี้" };
    }

    const result = await execute(
      `INSERT INTO candidates (election_id, position_id, rank, name, slogan, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        electionId,
        data.positionId,
        data.rank,
        data.name.trim(),
        data.slogan || null,
        data.imageUrl || null,
      ],
    );

    revalidatePath(`/admin/elections/${electionId}`);
    revalidatePath(`/admin/elections/${electionId}/candidates`);

    // Log activity
    await logAdminAction("เพิ่มผู้สมัคร", `${data.name} (เบอร์ ${data.rank})`);

    return { success: true, candidateId: result.insertId };
  } catch (error) {
    console.error("Add candidate error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการเพิ่มผู้สมัคร" };
  }
}

/**
 * Update a candidate
 */
export async function updateCandidate(
  electionId: number,
  candidateId: number,
  data: Partial<CreateCandidateData>,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    if (await isElectionLocked(electionId)) {
      return {
        success: false,
        error: "ไม่สามารถแก้ไขผู้สมัครได้เมื่อการเลือกตั้งเริ่มแล้ว",
      };
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.rank !== undefined) {
      setClauses.push("rank = ?");
      values.push(data.rank);
    }
    if (data.name !== undefined) {
      setClauses.push("name = ?");
      values.push(data.name.trim());
    }
    if (data.slogan !== undefined) {
      setClauses.push("slogan = ?");
      values.push(data.slogan);
    }
    if (data.imageUrl !== undefined) {
      setClauses.push("image_url = ?");
      values.push(data.imageUrl);
    }

    if (setClauses.length === 0) {
      return { success: false, error: "ไม่มีข้อมูลที่ต้องอัปเดต" };
    }

    values.push(candidateId);
    await execute(
      `UPDATE candidates SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    revalidatePath(`/admin/elections/${electionId}`);
    revalidatePath(`/admin/elections/${electionId}/candidates`);

    // Log activity
    if (data.name) {
      await logAdminAction("แก้ไขผู้สมัคร", data.name);
    }

    return { success: true };
  } catch (error) {
    console.error("Update candidate error:", error);
    return { success: false, error: "เกิดข้อผิดพลาด" };
  }
}

/**
 * Delete a candidate
 */
export async function deleteCandidate(
  electionId: number,
  candidateId: number,
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentAdmin();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    if (await isElectionLocked(electionId)) {
      return {
        success: false,
        error: "ไม่สามารถลบผู้สมัครได้เมื่อการเลือกตั้งเริ่มแล้ว",
      };
    }

    // Get candidate name before delete
    const candidates = await query<CandidateRow>(
      "SELECT name FROM candidates WHERE id = ?",
      [candidateId],
    );
    const candidateName = candidates[0]?.name || "(ไม่ทราบชื่อ)";

    await execute("DELETE FROM candidates WHERE id = ?", [candidateId]);

    revalidatePath(`/admin/elections/${electionId}`);
    revalidatePath(`/admin/elections/${electionId}/candidates`);

    // Log activity
    await logAdminAction("ลบผู้สมัคร", candidateName);

    return { success: true };
  } catch (error) {
    console.error("Delete candidate error:", error);
    return { success: false, error: "เกิดข้อผิดพลาด" };
  }
}

/**
 * Get next candidate rank for a position
 */
export async function getNextCandidateRank(
  electionId: number,
  positionId: string,
): Promise<number> {
  const session = await getCurrentAdmin();
  if (!session) return 1;

  const candidates = await query<CandidateRow>(
    "SELECT MAX(rank) as max_rank FROM candidates WHERE election_id = ? AND position_id = ?",
    [electionId, positionId],
  );

  const maxRank = (candidates[0] as unknown as { max_rank: number | null })
    ?.max_rank;
  return (maxRank ?? 0) + 1;
}
