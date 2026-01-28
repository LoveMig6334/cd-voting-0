/**
 * Database Connection Layer for CD Voting System
 *
 * สำหรับ Development: ใช้ MySQL จาก XAMPP (localhost:3306)
 * สำหรับ Production: ใช้ MySQL ของ รร. (ผ่าน LAN)
 *
 * การใช้งาน:
 * 1. ติดตั้ง mysql2: `npm install mysql2`
 * 2. สร้างไฟล์ .env.local และกำหนดค่า DATABASE_*
 * 3. Import และใช้งาน: `import { query, execute, transaction } from '@/lib/db'`
 */

import mysql, {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import type { AccessLevel } from "./admin-types";

// ============================================
// Configuration
// ============================================

interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

function getDBConfig(): DBConfig {
  return {
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "3306", 10),
    user: process.env.DATABASE_USER || "root",
    password: process.env.DATABASE_PASSWORD || "",
    database: process.env.DATABASE_NAME || "cd_voting",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

// ============================================
// Connection Pool (Singleton)
// ============================================

let pool: Pool | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(getDBConfig());
    console.log("[DB] Connection pool created");
  }
  return pool;
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("[DB] Connection pool closed");
  }
}

// ============================================
// Query Helpers
// ============================================

/**
 * Execute a query and return rows
 * ใช้สำหรับ SELECT statements
 *
 * @example
 * const students = await query<StudentRow>('SELECT * FROM students WHERE class_room = ?', ['3/1']);
 */
export async function query<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = getPool();
  const [rows] = await db.execute<T[]>(sql, params);
  return rows;
}

/**
 * Execute a statement (INSERT, UPDATE, DELETE)
 * ใช้สำหรับ statements ที่เปลี่ยนแปลงข้อมูล
 *
 * @example
 * const result = await execute('INSERT INTO students (id, name) VALUES (?, ?)', ['1234', 'สมชาย']);
 * console.log(result.insertId, result.affectedRows);
 */
export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<ResultSetHeader> {
  const db = getPool();
  const [result] = await db.execute<ResultSetHeader>(sql, params);
  return result;
}

/**
 * Execute a query within a transaction
 * ใช้สำหรับ operations ที่ต้อง atomic (เช่น การลงคะแนน)
 *
 * @example
 * await transaction(async (conn) => {
 *   await conn.execute('INSERT INTO vote_history (student_id, election_id) VALUES (?, ?)', [studentId, electionId]);
 *   await conn.execute('INSERT INTO votes (election_id, position_id, candidate_id) VALUES (?, ?, ?)', [electionId, positionId, candidateId]);
 * });
 */
export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const db = getPool();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// ============================================
// Type Definitions for Database Rows
// ============================================

export interface StudentRow extends RowDataPacket {
  id: string;
  national_id: string;
  prefix: string | null;
  name: string;
  surname: string;
  student_no: number | null;
  class_room: string;
  role: "STUDENT" | "ADMIN";
  voting_approved: boolean;
  voting_approved_at: Date | null;
  voting_approved_by: string | null;
  last_active: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ElectionRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  type: string | null;
  start_date: Date;
  end_date: Date;
  status: "PENDING" | "OPEN" | "CLOSED";
  is_active: boolean;
  total_votes: number;
  created_at: Date;
  updated_at: Date;
}

export interface PositionRow extends RowDataPacket {
  id: string;
  election_id: number;
  title: string;
  icon: string | null;
  enabled: boolean;
  is_custom: boolean;
  sort_order: number;
}

export interface CandidateRow extends RowDataPacket {
  id: number;
  election_id: number;
  position_id: string;
  rank: number;
  name: string;
  slogan: string | null;
  image_url: string | null;
  created_at: Date;
}

export interface VoteHistoryRow extends RowDataPacket {
  id: number;
  student_id: string;
  election_id: number;
  voted_at: Date;
  ip_address: string | null;
  user_agent: string | null;
}

export interface VoteRow extends RowDataPacket {
  id: number;
  election_id: number;
  position_id: string;
  candidate_id: number | null;
  is_no_vote: boolean;
  created_at: Date;
}

export interface VoteTokenRow extends RowDataPacket {
  id: number;
  student_id: string;
  election_id: number;
  token: string;
  created_at: Date;
}

export interface SessionRow extends RowDataPacket {
  id: string;
  student_id: string;
  expires_at: Date;
  created_at: Date;
}

export interface AdminRow extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  display_name: string | null;
  access_level: AccessLevel;
  created_at: Date;
}

export interface AdminSessionRow extends RowDataPacket {
  id: string;
  admin_id: number;
  expires_at: Date;
  created_at: Date;
}

// Activity Types
export type ActivityType =
  | "vote_cast"
  | "system_check"
  | "admin_action"
  | "election_change";

export interface ActivityRow extends RowDataPacket {
  id: number;
  type: ActivityType;
  title: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

/**
 * Activity display format for UI
 */
export interface ActivityDisplayItem {
  id: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
}

// ============================================
// Public Display Settings Types
// ============================================

export interface PublicDisplaySettingsRow extends RowDataPacket {
  id: number;
  election_id: number;
  is_published: boolean;
  published_at: Date | null;
  global_show_raw_score: boolean;
  global_show_winner_only: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PositionDisplayConfigRow extends RowDataPacket {
  id: number;
  election_id: number;
  position_id: string;
  show_raw_score: boolean;
  show_winner_only: boolean;
  skip: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Export db object for compatibility
// ============================================

export const db = {
  query,
  execute,
  transaction,
  getPool,
  closePool,
};

export default db;
