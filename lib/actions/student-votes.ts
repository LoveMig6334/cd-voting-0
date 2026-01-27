"use server";

import { query, VoteTokenRow } from "@/lib/db";
import { RowDataPacket } from "mysql2/promise";
import { getCurrentSession } from "./auth";

// ==========================================
// Types
// ==========================================

export interface StudentVoteRecord {
  id: number;
  electionId: number;
  electionTitle: string;
  electionType: string | null;
  votedAt: Date;
  token: string;
  status: "pending" | "confirmed";
  electionEndDate: Date;
}

// ==========================================
// Query Functions
// ==========================================

/**
 * Get vote history for current student with tokens and status
 */
export async function getStudentVoteHistory(): Promise<StudentVoteRecord[]> {
  const session = await getCurrentSession();
  if (!session) {
    return [];
  }

  interface VoteHistoryWithElection extends RowDataPacket {
    id: number;
    election_id: number;
    voted_at: Date;
    title: string;
    type: string | null;
    end_date: Date;
    token: string | null;
  }

  const results = await query<VoteHistoryWithElection>(
    `SELECT 
      vh.id,
      vh.election_id,
      vh.voted_at,
      e.title,
      e.type,
      e.end_date,
      vt.token
    FROM vote_history vh
    JOIN elections e ON vh.election_id = e.id
    LEFT JOIN vote_tokens vt ON vh.student_id = vt.student_id AND vh.election_id = vt.election_id
    WHERE vh.student_id = ?
    ORDER BY vh.voted_at DESC`,
    [session.studentId],
  );

  const now = new Date();

  return results.map((row) => ({
    id: row.id,
    electionId: row.election_id,
    electionTitle: row.title,
    electionType: row.type,
    votedAt: row.voted_at,
    token: row.token || "N/A",
    status: new Date(row.end_date) <= now ? "confirmed" : "pending",
    electionEndDate: row.end_date,
  }));
}

/**
 * Get vote history filtered by status
 */
export async function getStudentVoteHistoryByStatus(
  status: "all" | "pending" | "confirmed",
): Promise<StudentVoteRecord[]> {
  const allRecords = await getStudentVoteHistory();

  if (status === "all") {
    return allRecords;
  }

  return allRecords.filter((record) => record.status === status);
}

/**
 * Verify that a vote token belongs to the current student for a specific election
 */
export async function verifyVoteToken(
  electionId: number,
  token: string,
): Promise<{ valid: boolean; message: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { valid: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  }

  // Check if token exists and belongs to this student + election
  const results = await query<VoteTokenRow>(
    `SELECT * FROM vote_tokens 
     WHERE student_id = ? AND election_id = ? AND token = ?`,
    [session.studentId, electionId, token.toUpperCase().trim()],
  );

  if (results.length === 0) {
    return {
      valid: false,
      message: "Token ไม่ถูกต้องหรือไม่ตรงกับการเลือกตั้งนี้",
    };
  }

  return { valid: true, message: "Token ถูกต้อง" };
}

/**
 * Check if student has a token for specific election (for access control)
 */
export async function hasTokenForElection(
  electionId: number,
): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) {
    return false;
  }

  const results = await query<VoteTokenRow>(
    "SELECT 1 FROM vote_tokens WHERE student_id = ? AND election_id = ?",
    [session.studentId, electionId],
  );

  return results.length > 0;
}

/**
 * Get student's token for specific election
 */
export async function getStudentToken(
  electionId: number,
): Promise<string | null> {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const results = await query<VoteTokenRow>(
    "SELECT token FROM vote_tokens WHERE student_id = ? AND election_id = ?",
    [session.studentId, electionId],
  );

  return results[0]?.token || null;
}
