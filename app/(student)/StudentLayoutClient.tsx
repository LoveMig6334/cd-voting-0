"use client";

import { BottomNav } from "@/components/BottomNav";
import { createContext, useContext } from "react";

// User type for student context
export interface StudentUser {
  id: string;
  prefix: string | null;
  name: string;
  surname: string;
  classRoom: string;
  studentNo: number | null;
  votingApproved: boolean;
}

// Context
const StudentUserContext = createContext<StudentUser | null>(null);

// Hook to access user
export function useStudentUser() {
  const user = useContext(StudentUserContext);
  if (!user) {
    throw new Error("useStudentUser must be used within StudentLayoutClient");
  }
  return user;
}

// Client layout wrapper
export function StudentLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: StudentUser;
}) {
  return (
    <StudentUserContext.Provider value={user}>
      <div className="pb-24">{children}</div>
      <BottomNav />
    </StudentUserContext.Provider>
  );
}
