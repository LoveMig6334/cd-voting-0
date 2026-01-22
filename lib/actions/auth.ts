"use server";

import { cookies } from "next/headers";
import { query, execute, SessionRow, StudentRow } from "@/lib/db";

// ==========================================
// Types
// ==========================================

export interface LoginResult {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    prefix: string | null;
    name: string;
    surname: string;
    classRoom: string;
    studentNo: number | null;
  };
}

export interface SessionData {
  studentId: string;
  student: StudentRow;
}

// ==========================================
// Student Authentication
// ==========================================

/**
 * Login action for students
 * Validates student ID + national ID against database
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const studentId = formData.get("studentId") as string;
  const nationalId = formData.get("nationalId") as string;

  // 1. Basic validation
  if (!studentId || !nationalId) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  try {
    // 2. Query database
    const users = await query<StudentRow>(
      "SELECT * FROM students WHERE id = ? AND national_id = ?",
      [studentId.trim(), nationalId.trim()]
    );

    if (users.length === 0) {
      return { success: false, message: "ไม่พบข้อมูล หรือรหัสผิดพลาด" };
    }

    const user = users[0];

    // 3. Check voting rights
    if (!user.voting_approved) {
      return {
        success: false,
        message: "บัญชีนี้ยังไม่ได้รับอนุมัติสิทธิ์การลงคะแนน",
      };
    }

    // 4. Create session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await execute(
      "INSERT INTO sessions (id, student_id, expires_at) VALUES (?, ?, ?)",
      [sessionId, user.id, expiresAt]
    );

    // 5. Update last_active
    await execute("UPDATE students SET last_active = NOW() WHERE id = ?", [
      user.id,
    ]);

    // 6. Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      maxAge: 3600, // 1 hour
    });

    return {
      success: true,
      user: {
        id: user.id,
        prefix: user.prefix,
        name: user.name,
        surname: user.surname,
        classRoom: user.class_room,
        studentNo: user.student_no,
      },
    };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: "ระบบขัดข้อง กรุณาลองใหม่" };
  }
}

/**
 * Logout action - clears session
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id");

  if (sessionId) {
    await execute("DELETE FROM sessions WHERE id = ?", [sessionId.value]);
    cookieStore.delete("session_id");
  }

  return { success: true };
}

/**
 * Get current session and student data
 * Returns null if no valid session
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id");

  if (!sessionId) return null;

  try {
    // Check session validity
    const sessions = await query<SessionRow>(
      "SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()",
      [sessionId.value]
    );

    if (sessions.length === 0) return null;

    // Get student data
    const students = await query<StudentRow>(
      "SELECT * FROM students WHERE id = ?",
      [sessions[0].student_id]
    );

    if (students.length === 0) return null;

    return {
      studentId: sessions[0].student_id,
      student: students[0],
    };
  } catch (error) {
    console.error("Session check error:", error);
    return null;
  }
}

/**
 * Lookup student by ID and national ID (for auto-fill)
 */
export async function lookupStudent(
  studentId: string,
  nationalId: string
): Promise<{
  found: boolean;
  student?: { prefix: string | null; name: string; surname: string };
}> {
  try {
    const students = await query<StudentRow>(
      "SELECT prefix, name, surname FROM students WHERE id = ? AND national_id = ?",
      [studentId, nationalId]
    );

    if (students.length === 0) {
      return { found: false };
    }

    return {
      found: true,
      student: {
        prefix: students[0].prefix,
        name: students[0].name,
        surname: students[0].surname,
      },
    };
  } catch (error) {
    console.error("Lookup error:", error);
    return { found: false };
  }
}
