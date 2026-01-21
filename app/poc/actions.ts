'use server';

import { db } from "./lib/db";
import { cookies } from "next/headers";

// ==========================================
// 1. Authentication (Server-Side)
// ==========================================

export async function loginAction(formData: FormData) {
  const studentId = formData.get("studentId") as string;
  const nationalId = formData.get("nationalId") as string;

  // 1. Validation เบื้องต้น
  if (!studentId || !nationalId) {
    return { success: false, message: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  try {
    // 2. Query Database จริง (ไม่ใช่ data.json)
    // หมายเหตุ: ใน production ควร Hash nationalId ก่อนเทียบกับ DB
    const users = await db.query(
      "SELECT * FROM students WHERE id = ? AND national_id_hash = ?",
      [studentId, nationalId] // สมมติว่าส่ง hash มาหรือ hash ที่นี่
    );

    if (users.length === 0) {
      return { success: false, message: "ไม่พบข้อมูล หรือรหัสผิดพลาด" };
    }

    const user = users[0];

    // 3. Create Session (Secure Session ID)
    // สร้าง Session ID แบบสุ่ม แล้วเก็บใน Database แทนการส่งข้อมูล User ไปที่ Cookie
    const sessionId = "valid-session-id"; // ใน code จริงใช้ crypto.randomUUID()

    // บันทึก Session ลง Database
    await db.query(
      "INSERT INTO sessions (id, student_id, expires_at) VALUES (?, ?, ?)",
      [sessionId, user.id, new Date(Date.now() + 3600000)] // 1 hour
    );

    // Set Cookie เป็น Session ID เท่านั้น (Opaque Token)
    const cookieStore = await cookies();
    cookieStore.set('session_id', sessionId, {
        httpOnly: true,
        secure: true,
        path: '/',
        sameSite: 'strict'
    });

    return { success: true, user: { name: user.name, class: user.class_room } };

  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, message: "ระบบขัดข้อง กรุณาลองใหม่" };
  }
}

// ==========================================
// 2. Secure Voting (Transactional)
// ==========================================

export async function castVoteAction(electionId: number, candidateId: number | null) {
  // 1. Check Session (Authen)
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id');

  if (!sessionId) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อนลงคะแนน" };
  }

  // ตรวจสอบ Session ID กับ Database
  const sessions = await db.query("SELECT * FROM sessions WHERE id = ?", [sessionId.value]);
  if (sessions.length === 0) {
     return { success: false, message: "Session หมดอายุหรือไม่ถูกต้อง" };
  }

  const studentId = sessions[0].student_id;

  try {
    // ใช้ Transaction เพื่อความถูกต้องของข้อมูล (Atomicity)
    await db.transaction(async (conn) => {

      // 2. Check: เคยโหวตไปหรือยัง? (Double Voting Protection)
      const history = await conn.query(
        "SELECT 1 FROM vote_history WHERE student_id = ? AND election_id = ? FOR UPDATE",
        [studentId, electionId]
      );

      if (history.length > 0) {
        throw new Error("คุณได้ใช้สิทธิ์เลือกตั้งในรายการนี้ไปแล้ว");
      }

      // 3. Action A: บันทึกประวัติว่า "คนนี้มาใช้สิทธิ์แล้ว"
      await conn.query(
        "INSERT INTO vote_history (student_id, election_id, ip_address) VALUES (?, ?, ?)",
        [studentId, electionId, '127.0.0.1']
      );

      // 4. Action B: หย่อนบัตรลงหีบ (Anonymous)
      // สังเกตว่าไม่มี student_id ในตาราง votes
      if (candidateId) {
        await conn.query(
          "INSERT INTO votes (election_id, candidate_id) VALUES (?, ?)",
          [electionId, candidateId]
        );
      } else {
        // Vote No
        await conn.query(
          "INSERT INTO votes (election_id, is_no_vote) VALUES (?, TRUE)",
          [electionId]
        );
      }
    });

    return { success: true, message: "บันทึกคะแนนโหวตเรียบร้อยแล้ว" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Vote Error:", error);
    return { success: false, message: error.message || "เกิดข้อผิดพลาดในการบันทึกคะแนน" };
  }
}
