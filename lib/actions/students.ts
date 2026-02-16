"use server";

import { execute, query, StudentRow } from "@/lib/db";
import { canApproveVotingRights, canManageStudents } from "@/lib/permissions";
import {
  isValidStudentId,
  isValidNationalId,
  sanitizeInput,
} from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { logAdminAction } from "./activities";
import { getCurrentAdmin } from "./admin-auth";

// ==========================================
// Types
// ==========================================

export interface CreateStudentData {
  id: string;
  nationalId: string;
  prefix?: string;
  name: string;
  surname: string;
  studentNo?: number;
  classRoom: string;
}

export interface UpdateStudentData {
  prefix?: string;
  name?: string;
  surname?: string;
  studentNo?: number;
  classRoom?: string;
}

export interface StudentStats {
  total: number;
  approved: number;
  pending: number;
  byClassroom: Record<string, { total: number; approved: number }>;
}

// ==========================================
// Read Operations
// ==========================================

/**
 * Get all students
 */
export async function getStudents(): Promise<StudentRow[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  return query<StudentRow>(
    "SELECT * FROM students ORDER BY class_room, student_no",
  );
}

/**
 * Get student by ID
 */
export async function getStudentById(id: string): Promise<StudentRow | null> {
  const session = await getCurrentAdmin();
  if (!session) return null;

  const students = await query<StudentRow>(
    "SELECT * FROM students WHERE id = ?",
    [id],
  );
  return students[0] || null;
}

/**
 * Get students by classroom
 */
export async function getStudentsByClassroom(
  classroom: string,
): Promise<StudentRow[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  return query<StudentRow>(
    "SELECT * FROM students WHERE class_room = ? ORDER BY student_no",
    [classroom],
  );
}

/**
 * Get unique classrooms
 */
export async function getUniqueClassrooms(): Promise<string[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  const results = await query<{ class_room: string } & StudentRow>(
    "SELECT DISTINCT class_room FROM students ORDER BY class_room",
  );
  return results.map((r) => r.class_room);
}

/**
 * Get student statistics
 */
export async function getStudentStats(): Promise<StudentStats> {
  const session = await getCurrentAdmin();
  if (!session) return { total: 0, approved: 0, pending: 0, byClassroom: {} };

  const students = await getStudents();

  const byClassroom: Record<string, { total: number; approved: number }> = {};
  let approved = 0;

  for (const student of students) {
    if (student.voting_approved) approved++;

    if (!byClassroom[student.class_room]) {
      byClassroom[student.class_room] = { total: 0, approved: 0 };
    }
    byClassroom[student.class_room].total++;
    if (student.voting_approved) {
      byClassroom[student.class_room].approved++;
    }
  }

  return {
    total: students.length,
    approved,
    pending: students.length - approved,
    byClassroom,
  };
}

// ==========================================
// Write Operations
// ==========================================

/**
 * Create a new student
 */
export async function createStudent(
  data: CreateStudentData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (!adminSession || !canManageStudents(adminSession.admin.access_level)) {
      return { success: false, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    // Sanitize inputs
    data.id = sanitizeInput(data.id);
    data.nationalId = sanitizeInput(data.nationalId);
    data.name = sanitizeInput(data.name);
    data.surname = sanitizeInput(data.surname);
    if (data.prefix) data.prefix = sanitizeInput(data.prefix);
    if (data.classRoom) data.classRoom = sanitizeInput(data.classRoom);

    // Validate ID formats
    if (!isValidStudentId(data.id)) {
      return { success: false, error: "รหัสนักเรียนต้องเป็นตัวเลข 4 หลัก" };
    }
    if (!isValidNationalId(data.nationalId)) {
      return {
        success: false,
        error: "เลขประจำตัวประชาชนต้องเป็นตัวเลข 13 หลัก",
      };
    }

    // Check for duplicate ID and national ID in parallel
    const [existingId, existingNationalId] = await Promise.all([
      query<StudentRow>("SELECT id FROM students WHERE id = ?", [data.id]),
      query<StudentRow>("SELECT id FROM students WHERE national_id = ?", [data.nationalId]),
    ]);
    if (existingId.length > 0) {
      return { success: false, error: "รหัสนักเรียนนี้มีอยู่แล้วในระบบ" };
    }
    if (existingNationalId.length > 0) {
      return { success: false, error: "เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ" };
    }

    // Insert student
    await execute(
      `INSERT INTO students (id, national_id, prefix, name, surname, student_no, class_room)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.id,
        data.nationalId,
        data.prefix || null,
        data.name,
        data.surname,
        data.studentNo || null,
        data.classRoom,
      ],
    );

    revalidatePath("/admin/students");

    // Log activity (non-blocking)
    after(() => logAdminAction(
      "เพิ่มนักเรียนใหม่",
      `#${data.id} ${data.name} ${data.surname} (ห้อง ${data.classRoom})`,
    ));

    return { success: true };
  } catch (error) {
    console.error("Create student error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการเพิ่มนักเรียน" };
  }
}

/**
 * Update a student
 */
export async function updateStudent(
  id: string,
  data: UpdateStudentData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (!adminSession || !canManageStudents(adminSession.admin.access_level)) {
      return { success: false, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (data.prefix !== undefined) {
      setClauses.push("prefix = ?");
      values.push(data.prefix);
    }
    if (data.name !== undefined) {
      setClauses.push("name = ?");
      values.push(data.name);
    }
    if (data.surname !== undefined) {
      setClauses.push("surname = ?");
      values.push(data.surname);
    }
    if (data.studentNo !== undefined) {
      setClauses.push("student_no = ?");
      values.push(data.studentNo);
    }
    if (data.classRoom !== undefined) {
      setClauses.push("class_room = ?");
      values.push(data.classRoom);
    }

    if (setClauses.length === 0) {
      return { success: false, error: "ไม่มีข้อมูลที่ต้องอัปเดต" };
    }

    values.push(id);
    await execute(
      `UPDATE students SET ${setClauses.join(", ")} WHERE id = ?`,
      values,
    );

    revalidatePath("/admin/students");
    return { success: true };
  } catch (error) {
    console.error("Update student error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" };
  }
}

/**
 * Delete a student
 */
export async function deleteStudent(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (!adminSession || !canManageStudents(adminSession.admin.access_level)) {
      return { success: false, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    const result = await execute("DELETE FROM students WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return { success: false, error: "ไม่พบนักเรียนที่ต้องการลบ" };
    }

    revalidatePath("/admin/students");

    // Log activity
    after(() => logAdminAction("ลบนักเรียน", `#${id}`));

    return { success: true };
  } catch (error) {
    console.error("Delete student error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูล" };
  }
}

// ==========================================
// Voting Rights Operations
// ==========================================

/**
 * Approve voting right for a student
 */
export async function approveVotingRight(
  studentId: string,
  approvedBy: string = "Admin",
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (
      !adminSession ||
      !canApproveVotingRights(adminSession.admin.access_level)
    ) {
      return { success: false, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    await execute(
      `UPDATE students
       SET voting_approved = TRUE, voting_approved_at = NOW(), voting_approved_by = ?
       WHERE id = ?`,
      [approvedBy, studentId],
    );

    revalidatePath("/admin/students");

    // Log activity
    after(() => logAdminAction("อนุมัติสิทธิ์โหวต", `นักเรียน #${studentId}`));

    return { success: true };
  } catch (error) {
    console.error("Approve voting error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการอนุมัติสิทธิ์" };
  }
}

/**
 * Revoke voting right for a student
 */
export async function revokeVotingRight(
  studentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (
      !adminSession ||
      !canApproveVotingRights(adminSession.admin.access_level)
    ) {
      return { success: false, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    await execute(
      `UPDATE students
       SET voting_approved = FALSE, voting_approved_at = NULL, voting_approved_by = NULL
       WHERE id = ?`,
      [studentId],
    );

    revalidatePath("/admin/students");

    // Log activity
    after(() => logAdminAction("ถอนสิทธิ์โหวต", `นักเรียน #${studentId}`));

    return { success: true };
  } catch (error) {
    console.error("Revoke voting error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการยกเลิกสิทธิ์" };
  }
}

/**
 * Bulk approve voting rights for students in a classroom
 */
export async function bulkApproveVotingRights(
  classroom: string,
  approvedBy: string = "Admin",
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (
      !adminSession ||
      !canApproveVotingRights(adminSession.admin.access_level)
    ) {
      return { success: false, count: 0, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    const result = await execute(
      `UPDATE students
       SET voting_approved = TRUE, voting_approved_at = NOW(), voting_approved_by = ?
       WHERE class_room = ? AND voting_approved = FALSE`,
      [approvedBy, classroom],
    );

    revalidatePath("/admin/students");

    // Log activity
    if (result.affectedRows > 0) {
      after(() => logAdminAction(
        "อนุมัติสิทธิ์โหวตทั้งห้อง",
        `ห้อง ${classroom} (${result.affectedRows} คน)`,
      ));
    }

    return { success: true, count: result.affectedRows };
  } catch (error) {
    console.error("Bulk approve error:", error);
    return { success: false, count: 0, error: "เกิดข้อผิดพลาดในการอนุมัติ" };
  }
}

/**
 * Bulk revoke voting rights for students in a classroom
 */
export async function bulkRevokeVotingRights(
  classroom: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const adminSession = await getCurrentAdmin();
    if (
      !adminSession ||
      !canApproveVotingRights(adminSession.admin.access_level)
    ) {
      return { success: false, count: 0, error: "ไม่มีสิทธิ์ดำเนินการนี้" };
    }

    const result = await execute(
      `UPDATE students
       SET voting_approved = FALSE, voting_approved_at = NULL, voting_approved_by = NULL
       WHERE class_room = ? AND voting_approved = TRUE`,
      [classroom],
    );

    revalidatePath("/admin/students");

    // Log activity
    if (result.affectedRows > 0) {
      after(() => logAdminAction(
        "ถอนสิทธิ์โหวตทั้งห้อง",
        `ห้อง ${classroom} (${result.affectedRows} คน)`,
      ));
    }

    return { success: true, count: result.affectedRows };
  } catch (error) {
    console.error("Bulk revoke error:", error);
    return { success: false, count: 0, error: "เกิดข้อผิดพลาดในการยกเลิก" };
  }
}

// ==========================================
// Import Operations
// ==========================================

export interface ImportStudentData {
  id: string;
  nationalId: string;
  prefix?: string;
  name: string;
  surname: string;
  studentNo?: number;
  classRoom: string;
}

/**
 * Import students from array
 */
/**
 * Get vote history for a student (which elections they voted in)
 */
export async function getStudentVoteHistory(
  studentId: string,
): Promise<number[]> {
  const session = await getCurrentAdmin();
  if (!session) return [];

  const results = await query<{ election_id: number } & StudentRow>(
    "SELECT election_id FROM vote_history WHERE student_id = ?",
    [studentId],
  );
  return results.map((r) => r.election_id);
}

/**
 * Get vote history for multiple students
 */
export async function getStudentsVoteHistory(): Promise<
  Record<string, number[]>
> {
  const session = await getCurrentAdmin();
  if (!session) return {};

  const results = await query<
    { student_id: string; election_id: number } & StudentRow
  >("SELECT student_id, election_id FROM vote_history");

  const history: Record<string, number[]> = {};
  for (const row of results) {
    if (!history[row.student_id]) {
      history[row.student_id] = [];
    }
    history[row.student_id].push(row.election_id);
  }
  return history;
}

export async function importStudents(
  students: ImportStudentData[],
  options: { overwrite?: boolean } = {},
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  const adminSession = await getCurrentAdmin();
  if (!adminSession || !canManageStudents(adminSession.admin.access_level)) {
    return {
      imported: 0,
      skipped: students.length,
      errors: ["ไม่มีสิทธิ์ดำเนินการนี้"],
    };
  }

  for (const student of students) {
    // Sanitize all text fields
    student.id = sanitizeInput(student.id ?? "");
    student.nationalId = sanitizeInput(student.nationalId ?? "");
    student.name = sanitizeInput(student.name ?? "");
    student.surname = sanitizeInput(student.surname ?? "");
    if (student.prefix) student.prefix = sanitizeInput(student.prefix);
    if (student.classRoom) student.classRoom = sanitizeInput(student.classRoom);

    // Validate required fields
    if (
      !student.id ||
      !student.name ||
      !student.surname ||
      !student.classRoom ||
      !student.nationalId
    ) {
      result.errors.push(
        `ข้อมูลไม่ครบถ้วนสำหรับ ID: ${student.id || "unknown"}`,
      );
      result.skipped++;
      continue;
    }

    // Validate ID formats
    if (!isValidStudentId(student.id)) {
      result.errors.push(
        `รหัสนักเรียนไม่ถูกต้อง (ต้องเป็นตัวเลข 4 หลัก): ${student.id}`,
      );
      result.skipped++;
      continue;
    }
    if (!isValidNationalId(student.nationalId)) {
      result.errors.push(
        `เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องเป็นตัวเลข 13 หลัก): ID ${student.id}`,
      );
      result.skipped++;
      continue;
    }

    try {
      // Check if exists
      const existing = await query<StudentRow>(
        "SELECT id FROM students WHERE id = ?",
        [student.id],
      );

      if (existing.length > 0) {
        if (options.overwrite) {
          // Update existing
          await execute(
            `UPDATE students SET national_id = ?, prefix = ?, name = ?, surname = ?,
             student_no = ?, class_room = ? WHERE id = ?`,
            [
              student.nationalId,
              student.prefix || null,
              student.name,
              student.surname,
              student.studentNo || null,
              student.classRoom,
              student.id,
            ],
          );
          result.imported++;
        } else {
          result.skipped++;
        }
      } else {
        // Insert new
        await execute(
          `INSERT INTO students (id, national_id, prefix, name, surname, student_no, class_room)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            student.id,
            student.nationalId,
            student.prefix || null,
            student.name,
            student.surname,
            student.studentNo || null,
            student.classRoom,
          ],
        );
        result.imported++;
      }
    } catch (error) {
      result.errors.push(`Error importing ${student.id}: ${error}`);
      result.skipped++;
    }
  }

  revalidatePath("/admin/students");

  // Log activity (non-blocking)
  if (result.imported > 0) {
    after(() => logAdminAction(
      "Import นักเรียน",
      `นำเข้า ${result.imported} คน, ข้าม ${result.skipped} คน`,
    ));
  }

  return result;
}
