export interface StudentData {
  id: number;
  name: string;
  surname: string;
  classroom: string;
  no: number;
}

export async function getStudentById(
  id: string | number
): Promise<StudentData | null> {
  try {
    const response = await fetch("/data.json");
    if (!response.ok) {
      console.error("Failed to fetch student data");
      return null;
    }
    const students: StudentData[] = await response.json();

    // Ensure accurate string/number comparison
    const targetId = Number(id);
    return students.find((s) => s.id === targetId) || null;
  } catch (error) {
    console.error("Error searching student:", error);
    return null;
  }
}
