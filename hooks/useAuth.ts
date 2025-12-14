import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface Student {
  classroom: string;
  no: number;
  id: number;
  name: string;
  surname: string;
}

export function useAuth() {
  const [user, setUser] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check localStorage on mount
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
        localStorage.removeItem("currentUser");
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    studentId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/data.json");
      if (!res.ok) throw new Error("Failed to load student data");
      const students: Student[] = await res.json();

      const found = students.find((s) => String(s.id) === studentId.trim());

      if (found) {
        localStorage.setItem("currentUser", JSON.stringify(found));
        setUser(found);
        router.push("/");
        return { success: true };
      } else {
        return { success: false, error: "Student ID not found." };
      }
    } catch (err) {
      console.error(err);
      return { success: false, error: "An error occurred during login." };
    }
  };

  const loginWithData = (studentData: Student) => {
    localStorage.setItem("currentUser", JSON.stringify(studentData));
    setUser(studentData);
    router.push("/");
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
    router.push("/login");
  };

  return { user, loading, login, loginWithData, logout };
}
