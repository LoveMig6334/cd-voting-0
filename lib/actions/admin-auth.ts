"use server";

import {
  ACCESS_LEVELS,
  AccessLevel,
  getAccessLevelLabel,
} from "@/lib/admin-types";
import { AdminRow, AdminSessionRow, execute, query } from "@/lib/db";
import {
  canCreateAdmin,
  canDeleteAdmin,
  canEditAdmin,
} from "@/lib/permissions";
import { sanitizeInput } from "@/lib/validation";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { logSystemCheck } from "./activities";

// ==========================================
// Types
// ==========================================

export interface AdminLoginResult {
  success: boolean;
  message?: string;
  admin?: {
    id: number;
    username: string;
    displayName: string | null;
    accessLevel: AccessLevel;
  };
}

export interface AdminSessionData {
  adminId: number;
  admin: AdminRow;
}

// ==========================================
// Admin Authentication
// ==========================================

/**
 * Login action for admins
 * Validates username + password against database
 */
export async function adminLoginAction(
  formData: FormData,
): Promise<AdminLoginResult> {
  const rawUsername = formData.get("username") as string;
  const password = formData.get("password") as string;

  // 1. Basic validation
  if (!rawUsername || !password) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  // 2. Sanitize username (password is not sanitized to preserve all characters)
  const username = sanitizeInput(rawUsername);

  try {
    // 3. Query database for admin
    const admins = await query<AdminRow>(
      "SELECT * FROM admins WHERE username = ?",
      [username],
    );

    if (admins.length === 0) {
      return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }

    const admin = admins[0];

    // 3. Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
      return { success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }

    // 4. Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 3600000); // 8 hours for admin

    await execute(
      "INSERT INTO admin_sessions (id, admin_id, expires_at) VALUES (?, ?, ?)",
      [sessionId, admin.id, expiresAt],
    );

    // 5. Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("admin_session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      maxAge: 8 * 3600, // 8 hours
    });

    // Log activity
    await logSystemCheck(`Admin "${admin.username}" เข้าสู่ระบบ`);

    return {
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.display_name,
        accessLevel: admin.access_level,
      },
    };
  } catch (error) {
    console.error("Admin Login Error:", error);
    return { success: false, message: "ระบบขัดข้อง กรุณาลองใหม่" };
  }
}

/**
 * Logout action for admin
 */
export async function adminLogoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("admin_session_id");

  if (sessionId) {
    // Get admin info before deleting session
    const sessions = await query<AdminSessionRow>(
      "SELECT admin_id FROM admin_sessions WHERE id = ?",
      [sessionId.value],
    );

    await execute("DELETE FROM admin_sessions WHERE id = ?", [sessionId.value]);
    cookieStore.delete("admin_session_id");

    // Log activity
    if (sessions.length > 0) {
      const admin = await getAdminById(sessions[0].admin_id);
      if (admin) {
        await logSystemCheck(`Admin "${admin.username}" ออกจากระบบ`);
      }
    }
  }

  return { success: true };
}

/**
 * Get current admin session
 */
export async function getCurrentAdmin(): Promise<AdminSessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("admin_session_id");

  if (!sessionId) return null;

  try {
    // Check session validity
    const sessions = await query<AdminSessionRow>(
      "SELECT * FROM admin_sessions WHERE id = ? AND expires_at > NOW()",
      [sessionId.value],
    );

    if (sessions.length === 0) return null;

    // Get admin data
    const admins = await query<AdminRow>("SELECT * FROM admins WHERE id = ?", [
      sessions[0].admin_id,
    ]);

    if (admins.length === 0) return null;

    return {
      adminId: sessions[0].admin_id,
      admin: admins[0],
    };
  } catch (error) {
    console.error("Admin session check error:", error);
    return null;
  }
}

/**
 * Create a new admin account
 * @param accessLevel - Required access level (0-3)
 * @param creatorLevel - Access level of the creator (for permission check)
 */
export async function createAdmin(
  username: string,
  password: string,
  displayName?: string,
  accessLevel: AccessLevel = ACCESS_LEVELS.SYSTEM_ADMIN,
  creatorLevel?: AccessLevel,
): Promise<{ success: boolean; message?: string; adminId?: number }> {
  try {
    // Permission check (if creator level is provided)
    if (
      creatorLevel !== undefined &&
      !canCreateAdmin(creatorLevel, accessLevel)
    ) {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์สร้าง Admin ระดับนี้",
      };
    }

    // Sanitize username and display name
    const cleanUsername = sanitizeInput(username);
    const cleanDisplayName = displayName ? sanitizeInput(displayName) : null;

    // Check if username exists
    const existing = await query<AdminRow>(
      "SELECT id FROM admins WHERE username = ?",
      [cleanUsername],
    );

    if (existing.length > 0) {
      return { success: false, message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
    }

    // Validate password
    if (password.length < 6) {
      return { success: false, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin
    const result = await execute(
      "INSERT INTO admins (username, password_hash, display_name, access_level) VALUES (?, ?, ?, ?)",
      [cleanUsername, passwordHash, cleanDisplayName, accessLevel],
    );

    revalidatePath("/admin/admins");

    // Log activity
    await logSystemCheck(
      `สร้างผู้ดูแลระบบ "${cleanUsername}" (ระดับ: ${getAccessLevelLabel(accessLevel)})`,
    );

    return { success: true, adminId: result.insertId };
  } catch (error) {
    console.error("Create admin error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างบัญชี" };
  }
}

/**
 * Change admin password
 */
export async function changeAdminPassword(
  adminId: number,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get admin
    const admins = await query<AdminRow>("SELECT * FROM admins WHERE id = ?", [
      adminId,
    ]);

    if (admins.length === 0) {
      return { success: false, message: "ไม่พบบัญชีผู้ดูแลระบบ" };
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      currentPassword,
      admins[0].password_hash,
    );
    if (!isValid) {
      return { success: false, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" };
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await execute("UPDATE admins SET password_hash = ? WHERE id = ?", [
      newHash,
      adminId,
    ]);

    // Log activity
    const admin = await getAdminById(adminId);
    await logSystemCheck(
      `Admin "${admin?.username || "(ไม่ทราบชื่อ)"}" เปลี่ยนรหัสผ่าน`,
    );

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
  }
}

// ==========================================
// Admin Management Functions
// ==========================================

/**
 * Get all admins (excluding password hash)
 */
export async function getAllAdmins(): Promise<
  Omit<AdminRow, "password_hash">[]
> {
  const admins = await query<AdminRow>(
    "SELECT id, username, display_name, access_level, created_at FROM admins ORDER BY access_level ASC, id ASC",
  );
  return admins;
}

/**
 * Get admin by ID
 */
export async function getAdminById(
  id: number,
): Promise<Omit<AdminRow, "password_hash"> | null> {
  const admins = await query<AdminRow>(
    "SELECT id, username, display_name, access_level, created_at FROM admins WHERE id = ?",
    [id],
  );
  return admins[0] || null;
}

/**
 * Update admin details (display name, access level)
 * Only ROOT (level 0) can update other admins
 */
export async function updateAdmin(
  adminId: number,
  data: { displayName?: string; accessLevel?: AccessLevel },
  editorLevel: AccessLevel,
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get target admin to check their level
    const targetAdmin = await getAdminById(adminId);
    if (!targetAdmin) {
      return { success: false, message: "ไม่พบ Admin ที่ต้องการแก้ไข" };
    }

    // Permission check with target level
    if (!canEditAdmin(editorLevel, targetAdmin.access_level)) {
      return { success: false, message: "คุณไม่มีสิทธิ์แก้ไข Admin ระดับนี้" };
    }

    // SYSTEM_ADMIN can only set access levels they can create (level 2-3)
    if (
      editorLevel === ACCESS_LEVELS.SYSTEM_ADMIN &&
      data.accessLevel !== undefined &&
      data.accessLevel < ACCESS_LEVELS.TEACHER
    ) {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์ตั้งค่าระดับสิทธิ์นี้",
      };
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (data.displayName !== undefined) {
      updates.push("display_name = ?");
      params.push(data.displayName || null);
    }

    if (data.accessLevel !== undefined) {
      updates.push("access_level = ?");
      params.push(data.accessLevel);
    }

    if (updates.length === 0) {
      return { success: false, message: "ไม่มีข้อมูลที่ต้องอัพเดท" };
    }

    params.push(adminId);

    await execute(
      `UPDATE admins SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    revalidatePath("/admin/admins");

    // Log activity
    await logSystemCheck(`แก้ไขข้อมูลผู้ดูแลระบบ "${targetAdmin.username}"`);

    return { success: true };
  } catch (error) {
    console.error("Update admin error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการอัพเดท" };
  }
}

/**
 * Delete an admin
 * - ROOT (level 0): Can delete any admin except themselves
 * - SYSTEM_ADMIN (level 1): Can delete level 2-3 only
 */
export async function deleteAdmin(
  adminId: number,
  deleterId: number,
  deleterLevel: AccessLevel,
): Promise<{ success: boolean; message?: string }> {
  try {
    // Cannot delete yourself
    if (adminId === deleterId) {
      return { success: false, message: "ไม่สามารถลบบัญชีตัวเองได้" };
    }

    // Get target admin
    const targetAdmins = await query<AdminRow>(
      "SELECT id, access_level FROM admins WHERE id = ?",
      [adminId],
    );

    if (targetAdmins.length === 0) {
      return { success: false, message: "ไม่พบ Admin ที่ต้องการลบ" };
    }

    const targetLevel = targetAdmins[0].access_level;

    // Permission check
    if (!canDeleteAdmin(deleterLevel, targetLevel)) {
      return { success: false, message: "คุณไม่มีสิทธิ์ลบ Admin ระดับนี้" };
    }

    // Delete sessions first
    await execute("DELETE FROM admin_sessions WHERE admin_id = ?", [adminId]);

    // Delete admin
    await execute("DELETE FROM admins WHERE id = ?", [adminId]);

    revalidatePath("/admin/admins");

    // Log activity
    await logSystemCheck(`ลบผู้ดูแลระบบ ID: ${adminId}`);

    return { success: true };
  } catch (error) {
    console.error("Delete admin error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการลบ Admin" };
  }
}

/**
 * Reset admin password
 * - ROOT (0): Can reset any admin's password
 * - SYSTEM_ADMIN (1): Can reset level 2-3 admin's password
 */
export async function resetAdminPassword(
  adminId: number,
  newPassword: string,
  editorLevel: AccessLevel,
): Promise<{ success: boolean; message?: string }> {
  try {
    // Get target admin to check their level
    const targetAdmin = await getAdminById(adminId);
    if (!targetAdmin) {
      return {
        success: false,
        message: "ไม่พบ Admin ที่ต้องการรีเซ็ตรหัสผ่าน",
      };
    }

    // Permission check with target level
    if (!canEditAdmin(editorLevel, targetAdmin.access_level)) {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์รีเซ็ตรหัสผ่าน Admin ระดับนี้",
      };
    }

    if (newPassword.length < 6) {
      return { success: false, message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await execute("UPDATE admins SET password_hash = ? WHERE id = ?", [
      newHash,
      adminId,
    ]);

    // Log activity
    await logSystemCheck(`รีเซ็ตรหัสผ่าน Admin "${targetAdmin.username}"`);

    return { success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" };
  }
}
