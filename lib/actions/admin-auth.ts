"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { query, execute, AdminRow, AdminSessionRow } from "@/lib/db";

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
  formData: FormData
): Promise<AdminLoginResult> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // 1. Basic validation
  if (!username || !password) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  try {
    // 2. Query database for admin
    const admins = await query<AdminRow>(
      "SELECT * FROM admins WHERE username = ?",
      [username.trim()]
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
      [sessionId, admin.id, expiresAt]
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

    return {
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        displayName: admin.display_name,
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
    await execute("DELETE FROM admin_sessions WHERE id = ?", [sessionId.value]);
    cookieStore.delete("admin_session_id");
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
      [sessionId.value]
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
 * Create a new admin account (for initial setup)
 */
export async function createAdmin(
  username: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Check if username exists
    const existing = await query<AdminRow>(
      "SELECT id FROM admins WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return { success: false, message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin
    await execute(
      "INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)",
      [username, passwordHash, displayName || null]
    );

    return { success: true };
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
  newPassword: string
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
      admins[0].password_hash
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

    return { success: true };
  } catch (error) {
    console.error("Change password error:", error);
    return { success: false, message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" };
  }
}
