"use server";

import { PoolConnection } from "mysql2/promise";
import { cookies } from "next/headers";
import {
  CandidateRow,
  ElectionRow,
  execute,
  PositionRow,
  query,
  SessionRow,
  StudentRow,
  transaction,
} from "./lib/db";

// ==========================================
// 1. Authentication (Server-Side)
// ==========================================

interface LoginResult {
  success: boolean;
  message?: string;
  user?: {
    id: string;
    prefix: string | null;
    name: string;
    surname: string;
    classRoom: string;
  };
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const studentId = formData.get("studentId") as string;
  const nationalId = formData.get("nationalId") as string;

  // 1. Validation เบื้องต้น
  if (!studentId || !nationalId) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  try {
    // 2. Query Database (Plain text comparison)
    const users = await query<StudentRow>(
      "SELECT * FROM students WHERE id = ? AND national_id = ?",
      [studentId, nationalId],
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

    // 4. Create Session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await execute(
      "INSERT INTO sessions (id, student_id, expires_at) VALUES (?, ?, ?)",
      [sessionId, user.id, expiresAt],
    );

    // 5. Update last_active
    await execute("UPDATE students SET last_active = NOW() WHERE id = ?", [
      user.id,
    ]);

    // 6. Set Cookie (HttpOnly, Secure)
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
      },
    };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: "ระบบขัดข้อง กรุณาลองใหม่" };
  }
}

export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id");

  if (sessionId) {
    await execute("DELETE FROM sessions WHERE id = ?", [sessionId.value]);
    cookieStore.delete("session_id");
  }

  return { success: true };
}

// ==========================================
// 2. Session Helpers
// ==========================================

export async function getCurrentSession(): Promise<{
  studentId: string;
  student: StudentRow;
} | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id");

  if (!sessionId) return null;

  const sessions = await query<SessionRow>(
    "SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()",
    [sessionId.value],
  );

  if (sessions.length === 0) return null;

  const students = await query<StudentRow>(
    "SELECT * FROM students WHERE id = ?",
    [sessions[0].student_id],
  );

  if (students.length === 0) return null;

  return { studentId: sessions[0].student_id, student: students[0] };
}

// ==========================================
// 3. Election Queries
// ==========================================

export async function getActiveElections(): Promise<ElectionRow[]> {
  return query<ElectionRow>(
    "SELECT * FROM elections WHERE is_active = TRUE AND status = 'OPEN' ORDER BY start_date ASC",
  );
}

export async function getElectionById(id: number): Promise<ElectionRow | null> {
  const results = await query<ElectionRow>(
    "SELECT * FROM elections WHERE id = ?",
    [id],
  );
  return results[0] || null;
}

export async function getPositionsByElection(
  electionId: number,
): Promise<PositionRow[]> {
  return query<PositionRow>(
    "SELECT * FROM positions WHERE election_id = ? AND enabled = TRUE ORDER BY sort_order ASC",
    [electionId],
  );
}

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
// 4. Secure Voting (Transactional)
// ==========================================

interface VoteResult {
  success: boolean;
  message: string;
  token?: string;
}

interface VoteChoice {
  positionId: string;
  candidateId: number | null; // null = No Vote
}

export async function castVoteAction(
  electionId: number,
  choices: VoteChoice[],
): Promise<VoteResult> {
  // 1. Check Session
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนลงคะแนน" };
  }

  const studentId = session.studentId;

  try {
    // 2. Use Transaction for atomicity
    const voteToken = await transaction(async (conn: PoolConnection) => {
      // 3. Check: Already voted? (with row lock)
      const [history] = await conn.execute(
        "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ? FOR UPDATE",
        [studentId, electionId],
      );

      if ((history as unknown[]).length > 0) {
        throw new Error("คุณได้ใช้สิทธิ์เลือกตั้งในรายการนี้ไปแล้ว");
      }

      // 4. Record vote history (who voted)
      await conn.execute(
        "INSERT INTO vote_history (student_id, election_id, ip_address) VALUES (?, ?, ?)",
        [studentId, electionId, "127.0.0.1"],
      );

      // 5. Insert votes (anonymous - no student_id)
      for (const choice of choices) {
        if (choice.candidateId) {
          await conn.execute(
            "INSERT INTO votes (election_id, position_id, candidate_id) VALUES (?, ?, ?)",
            [electionId, choice.positionId, choice.candidateId],
          );
        } else {
          await conn.execute(
            "INSERT INTO votes (election_id, position_id, is_no_vote) VALUES (?, ?, TRUE)",
            [electionId, choice.positionId],
          );
        }
      }

      // 6. Update total votes count
      await conn.execute(
        "UPDATE elections SET total_votes = total_votes + 1 WHERE id = ?",
        [electionId],
      );

      // 7. Generate vote token (for verification receipt)
      return crypto.randomUUID().slice(0, 8).toUpperCase();
    });

    return {
      success: true,
      message: "บันทึกคะแนนโหวตเรียบร้อยแล้ว",
      token: voteToken,
    };
  } catch (error: unknown) {
    console.error("Vote Error:", error);
    const message =
      error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการบันทึกคะแนน";
    return { success: false, message };
  }
}

// ==========================================
// 5. Check Voting Status
// ==========================================

export async function hasVoted(electionId: number): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;

  const results = await query(
    "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ?",
    [session.studentId, electionId],
  );

  return results.length > 0;
}

// ==========================================
// 6. Student Lookup (for auto-fill)
// ==========================================

export async function lookupStudent(
  studentId: string,
  nationalId: string,
): Promise<{
  found: boolean;
  student?: { prefix: string | null; name: string; surname: string };
}> {
  const students = await query<StudentRow>(
    "SELECT prefix, name, surname FROM students WHERE id = ? AND national_id = ?",
    [studentId, nationalId],
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
}
