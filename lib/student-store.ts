// Student Data Store - localStorage-based mock backend
// This module provides CRUD operations for students and handles real-time sync

const STORAGE_KEY = "cd-voting-students";
const STORAGE_EVENT_NAME = "students-updated";
const INITIALIZED_KEY = "cd-voting-students-initialized";

// ============================================
// Types
// ============================================

export interface StudentRecord {
  id: number; // รหัสนักเรียน (4 หลัก)
  no: number; // เลขที่
  name: string; // ชื่อ
  surname: string; // นามสกุล
  classroom: string; // ห้อง (3/1, 3/2, 3/3)
  nationalId: string; // เลขประจำตัวประชาชน (13 หลัก)

  // ข้อมูลสิทธิ์การโหวต
  votingApproved: boolean; // ได้รับอนุมัติสิทธิ์โหวตหรือไม่
  votingApprovedAt?: string; // วันที่อนุมัติ (ISO date)
  votingApprovedBy?: string; // ผู้อนุมัติ (Admin name/id)

  // ข้อมูลการใช้งาน
  lastActive?: string; // ใช้งานล่าสุด (ISO date)
  votedIn: string[]; // รายการ election IDs ที่ลงคะแนนแล้ว

  // Metadata
  createdAt: string; // วันที่สร้าง record
  updatedAt: string; // วันที่แก้ไขล่าสุด
}

export interface RawStudentData {
  classroom: string;
  no: number;
  id: number;
  name: string;
  surname: string;
  nationalId: string;
}

export interface CreateStudentData {
  id: number;
  no: number;
  name: string;
  surname: string;
  classroom: string;
  nationalId: string;
}

// ============================================
// Helper Functions
// ============================================

function convertRawToRecord(raw: RawStudentData): StudentRecord {
  const now = new Date().toISOString();
  return {
    id: raw.id,
    no: raw.no,
    name: raw.name,
    surname: raw.surname,
    classroom: raw.classroom,
    nationalId: raw.nationalId,
    votingApproved: false,
    votedIn: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// Storage Operations
// ============================================

/**
 * Check if students have been initialized from data.json
 */
export function isInitialized(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INITIALIZED_KEY) === "true";
}

/**
 * Initialize students from data.json (first time only)
 */
export async function initializeStudents(): Promise<StudentRecord[]> {
  if (typeof window === "undefined") return [];

  // If already initialized, just return existing data
  if (isInitialized()) {
    return getAllStudents();
  }

  try {
    const response = await fetch("/data.json");
    if (!response.ok) {
      console.error("Failed to fetch student data");
      return [];
    }

    const rawStudents: RawStudentData[] = await response.json();
    const students = rawStudents.map(convertRawToRecord);

    // Save to localStorage
    saveStudents(students);
    localStorage.setItem(INITIALIZED_KEY, "true");

    return students;
  } catch (error) {
    console.error("Error initializing students:", error);
    return [];
  }
}

/**
 * Get all students from localStorage
 */
export function getAllStudents(): StudentRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    return JSON.parse(data) as StudentRecord[];
  } catch (error) {
    console.error("Failed to load students:", error);
    return [];
  }
}

/**
 * Get student by ID
 */
export function getStudentById(id: number): StudentRecord | null {
  const students = getAllStudents();
  return students.find((s) => s.id === id) || null;
}

/**
 * Save all students to localStorage
 */
function saveStudents(students: StudentRecord[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));

  // Dispatch custom event for real-time sync
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Add a new student
 */
export function addStudent(data: CreateStudentData): {
  success: boolean;
  error?: string;
  student?: StudentRecord;
} {
  const students = getAllStudents();

  // Check for duplicate ID
  if (students.some((s) => s.id === data.id)) {
    return { success: false, error: "รหัสนักเรียนนี้มีอยู่แล้วในระบบ" };
  }

  // Check for duplicate nationalId
  if (students.some((s) => s.nationalId === data.nationalId)) {
    return { success: false, error: "เลขประจำตัวประชาชนนี้มีอยู่แล้วในระบบ" };
  }

  const now = new Date().toISOString();
  const newStudent: StudentRecord = {
    ...data,
    votingApproved: false,
    votedIn: [],
    createdAt: now,
    updatedAt: now,
  };

  students.push(newStudent);
  saveStudents(students);

  return { success: true, student: newStudent };
}

/**
 * Update a student
 */
export function updateStudent(
  id: number,
  data: Partial<Omit<StudentRecord, "id" | "createdAt">>,
): StudentRecord | null {
  const students = getAllStudents();
  const index = students.findIndex((s) => s.id === id);

  if (index === -1) return null;

  const updated: StudentRecord = {
    ...students[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  students[index] = updated;
  saveStudents(students);

  return updated;
}

/**
 * Delete a student
 */
export function deleteStudent(id: number): boolean {
  const students = getAllStudents();
  const filtered = students.filter((s) => s.id !== id);

  if (filtered.length === students.length) return false;

  saveStudents(filtered);
  return true;
}

// ============================================
// Voting Rights Operations
// ============================================

/**
 * Approve voting right for a student
 */
export function approveVotingRight(
  studentId: number,
  approvedBy: string = "Admin",
): StudentRecord | null {
  return updateStudent(studentId, {
    votingApproved: true,
    votingApprovedAt: new Date().toISOString(),
    votingApprovedBy: approvedBy,
  });
}

/**
 * Revoke voting right for a student
 */
export function revokeVotingRight(studentId: number): StudentRecord | null {
  return updateStudent(studentId, {
    votingApproved: false,
    votingApprovedAt: undefined,
    votingApprovedBy: undefined,
  });
}

/**
 * Bulk approve voting rights for students in a classroom
 */
export function bulkApproveVotingRights(
  classroom: string,
  approvedBy: string = "Admin",
): number {
  const students = getAllStudents();
  let count = 0;
  const now = new Date().toISOString();

  const updated = students.map((student) => {
    if (student.classroom === classroom && !student.votingApproved) {
      count++;
      return {
        ...student,
        votingApproved: true,
        votingApprovedAt: now,
        votingApprovedBy: approvedBy,
        updatedAt: now,
      };
    }
    return student;
  });

  saveStudents(updated);
  return count;
}

/**
 * Bulk revoke voting rights for students in a classroom
 */
export function bulkRevokeVotingRights(classroom: string): number {
  const students = getAllStudents();
  let count = 0;
  const now = new Date().toISOString();

  const updated = students.map((student) => {
    if (student.classroom === classroom && student.votingApproved) {
      count++;
      return {
        ...student,
        votingApproved: false,
        votingApprovedAt: undefined,
        votingApprovedBy: undefined,
        updatedAt: now,
      };
    }
    return student;
  });

  saveStudents(updated);
  return count;
}

// ============================================
// Import Operations
// ============================================

/**
 * Import students from JSON array
 */
export function importStudents(
  rawData: RawStudentData[],
  options: { overwrite?: boolean } = {},
): { imported: number; skipped: number; errors: string[] } {
  const existingStudents = getAllStudents();
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  const existingIds = new Set(existingStudents.map((s) => s.id));
  const existingNationalIds = new Set(
    existingStudents.map((s) => s.nationalId),
  );

  const newStudents: StudentRecord[] = [...existingStudents];

  for (const raw of rawData) {
    // Validate required fields
    if (
      !raw.id ||
      !raw.name ||
      !raw.surname ||
      !raw.classroom ||
      !raw.nationalId
    ) {
      result.errors.push(`ข้อมูลไม่ครบถ้วนสำหรับ ID: ${raw.id || "unknown"}`);
      result.skipped++;
      continue;
    }

    // Check for duplicate
    if (existingIds.has(raw.id)) {
      if (options.overwrite) {
        // Find and update existing
        const index = newStudents.findIndex((s) => s.id === raw.id);
        if (index !== -1) {
          newStudents[index] = {
            ...newStudents[index],
            ...raw,
            updatedAt: new Date().toISOString(),
          };
          result.imported++;
        }
      } else {
        result.skipped++;
      }
      continue;
    }

    // Check for duplicate nationalId
    if (existingNationalIds.has(raw.nationalId)) {
      result.errors.push(
        `เลขประจำตัวประชาชนซ้ำสำหรับ "${raw.name} ${raw.surname}"`,
      );
      result.skipped++;
      continue;
    }

    // Add new student
    newStudents.push(convertRawToRecord(raw));
    existingIds.add(raw.id);
    existingNationalIds.add(raw.nationalId);
    result.imported++;
  }

  saveStudents(newStudents);
  return result;
}

// ============================================
// Filter Operations
// ============================================

/**
 * Get students by classroom
 */
export function getStudentsByClassroom(classroom: string): StudentRecord[] {
  const students = getAllStudents();
  return students.filter((s) => s.classroom === classroom);
}

/**
 * Get students by voting approval status
 */
export function getStudentsByVotingStatus(approved: boolean): StudentRecord[] {
  const students = getAllStudents();
  return students.filter((s) => s.votingApproved === approved);
}

/**
 * Get unique classrooms
 */
export function getUniqueClassrooms(): string[] {
  const students = getAllStudents();
  const classrooms = new Set(students.map((s) => s.classroom));
  return Array.from(classrooms).sort();
}

// ============================================
// Statistics
// ============================================

/**
 * Get student statistics
 */
export function getStudentStats(): {
  total: number;
  approved: number;
  pending: number;
  byClassroom: Record<string, { total: number; approved: number }>;
} {
  const students = getAllStudents();
  const byClassroom: Record<string, { total: number; approved: number }> = {};

  let approved = 0;

  for (const student of students) {
    if (student.votingApproved) approved++;

    if (!byClassroom[student.classroom]) {
      byClassroom[student.classroom] = { total: 0, approved: 0 };
    }
    byClassroom[student.classroom].total++;
    if (student.votingApproved) {
      byClassroom[student.classroom].approved++;
    }
  }

  return {
    total: students.length,
    approved,
    pending: students.length - approved,
    byClassroom,
  };
}

// ============================================
// Subscription for Real-time Sync
// ============================================

export type StudentListener = (students: StudentRecord[]) => void;

/**
 * Subscribe to student changes (for cross-tab sync via storage event)
 */
export function subscribeToStudents(listener: StudentListener): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(getAllStudents());
    }
  };

  const handleCustomEvent = () => {
    listener(getAllStudents());
  };

  // Listen for changes from other tabs
  window.addEventListener("storage", handleStorageChange);
  // Listen for changes from same tab
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  };
}

// ============================================
// Reset (for testing/development)
// ============================================

/**
 * Reset all student data (useful for testing or re-initializing)
 */
export function resetStudentData(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INITIALIZED_KEY);
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}
