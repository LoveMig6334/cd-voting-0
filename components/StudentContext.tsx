"use client";

import {
  getAllStudents,
  getStudentStats,
  getUniqueClassrooms,
  initializeStudents,
  resetStudentData,
  addStudent as storeAddStudent,
  approveVotingRight as storeApproveVotingRight,
  bulkApproveVotingRights as storeBulkApproveVotingRights,
  bulkRevokeVotingRights as storeBulkRevokeVotingRights,
  deleteStudent as storeDeleteStudent,
  getStudentById as storeGetStudentById,
  importStudents as storeImportStudents,
  revokeVotingRight as storeRevokeVotingRight,
  updateStudent as storeUpdateStudent,
  subscribeToStudents,
  type CreateStudentData,
  type RawStudentData,
  type StudentRecord,
} from "@/lib/student-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ============================================
// Context Types
// ============================================

interface StudentContextType {
  students: StudentRecord[];
  loading: boolean;
  initialized: boolean;

  // CRUD operations
  getStudent: (id: number) => StudentRecord | null;
  addStudent: (data: CreateStudentData) => {
    success: boolean;
    error?: string;
    student?: StudentRecord;
  };
  updateStudent: (
    id: number,
    data: Partial<Omit<StudentRecord, "id" | "createdAt">>,
  ) => StudentRecord | null;
  deleteStudent: (id: number) => boolean;

  // Voting rights operations
  approveVotingRight: (studentId: number) => StudentRecord | null;
  revokeVotingRight: (studentId: number) => StudentRecord | null;
  bulkApproveVotingRights: (classroom: string) => number;
  bulkRevokeVotingRights: (classroom: string) => number;

  // Import operations
  importStudents: (
    rawData: RawStudentData[],
    options?: { overwrite?: boolean },
  ) => { imported: number; skipped: number; errors: string[] };

  // Utilities
  classrooms: string[];
  stats: ReturnType<typeof getStudentStats>;
  refresh: () => void;
  reset: () => void;
}

const StudentContext = createContext<StudentContextType | null>(null);

// ============================================
// Provider Component
// ============================================

export function StudentProvider({ children }: { children: React.ReactNode }) {
  // Start with empty state (same on server and client) to avoid hydration mismatch
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Refresh data from localStorage
  const refresh = useCallback(() => {
    setStudents(getAllStudents());
  }, []);

  // Reset all data and re-initialize
  const reset = useCallback(async () => {
    resetStudentData();
    setLoading(true);
    const newStudents = await initializeStudents();
    setStudents(newStudents);
    setLoading(false);
  }, []);

  // Load initial data and subscribe to changes
  useEffect(() => {
    const init = async () => {
      const data = await initializeStudents();
      setStudents(data);
      setInitialized(true);
      setLoading(false);
    };

    init();

    const unsubscribe = subscribeToStudents((updatedStudents) => {
      setStudents(updatedStudents);
    });

    return unsubscribe;
  }, []);

  // CRUD operations
  const getStudent = useCallback((id: number) => {
    return storeGetStudentById(id);
  }, []);

  const addStudent = useCallback(
    (data: CreateStudentData) => {
      const result = storeAddStudent(data);
      if (result.success) refresh();
      return result;
    },
    [refresh],
  );

  const updateStudent = useCallback(
    (id: number, data: Partial<Omit<StudentRecord, "id" | "createdAt">>) => {
      const updated = storeUpdateStudent(id, data);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const deleteStudent = useCallback(
    (id: number) => {
      const deleted = storeDeleteStudent(id);
      if (deleted) refresh();
      return deleted;
    },
    [refresh],
  );

  // Voting rights operations
  const approveVotingRight = useCallback(
    (studentId: number) => {
      const updated = storeApproveVotingRight(studentId);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const revokeVotingRight = useCallback(
    (studentId: number) => {
      const updated = storeRevokeVotingRight(studentId);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const bulkApproveVotingRights = useCallback(
    (classroom: string) => {
      const count = storeBulkApproveVotingRights(classroom);
      if (count > 0) refresh();
      return count;
    },
    [refresh],
  );

  const bulkRevokeVotingRights = useCallback(
    (classroom: string) => {
      const count = storeBulkRevokeVotingRights(classroom);
      if (count > 0) refresh();
      return count;
    },
    [refresh],
  );

  // Import operations
  const importStudents = useCallback(
    (rawData: RawStudentData[], options?: { overwrite?: boolean }) => {
      const result = storeImportStudents(rawData, options);
      if (result.imported > 0) refresh();
      return result;
    },
    [refresh],
  );

  // Computed values
  const classrooms = getUniqueClassrooms();
  const stats = getStudentStats();

  const value: StudentContextType = {
    students,
    loading,
    initialized,
    getStudent,
    addStudent,
    updateStudent,
    deleteStudent,
    approveVotingRight,
    revokeVotingRight,
    bulkApproveVotingRights,
    bulkRevokeVotingRights,
    importStudents,
    classrooms,
    stats,
    refresh,
    reset,
  };

  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to access student context
 */
export function useStudents() {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error("useStudents must be used within a StudentProvider");
  }
  return context;
}

/**
 * Hook to access a single student by ID
 */
export function useStudent(id: number) {
  const { students, ...rest } = useStudents();
  const student = students.find((s) => s.id === id) || null;
  return { student, ...rest };
}

/**
 * Hook to get students by classroom
 */
export function useStudentsByClassroom(classroom: string) {
  const { students, ...rest } = useStudents();
  const filtered = classroom
    ? students.filter((s) => s.classroom === classroom)
    : students;
  return { students: filtered, ...rest };
}

/**
 * Hook to get students by voting approval status
 */
export function useStudentsByVotingStatus(approved?: boolean) {
  const { students, ...rest } = useStudents();
  const filtered =
    approved === undefined
      ? students
      : students.filter((s) => s.votingApproved === approved);
  return { students: filtered, ...rest };
}

// Re-export types for convenience
export type { CreateStudentData, RawStudentData, StudentRecord };
