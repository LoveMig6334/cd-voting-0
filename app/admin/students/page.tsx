import {
  getStudents,
  getStudentStats,
  getUniqueClassrooms,
  getStudentsVoteHistory,
} from "@/lib/actions/students";
import StudentsClient, { StudentWithHistory } from "./StudentsClient";

export default async function StudentManagementPage() {
  // Fetch all data in parallel
  const [students, stats, classrooms, voteHistory] = await Promise.all([
    getStudents(),
    getStudentStats(),
    getUniqueClassrooms(),
    getStudentsVoteHistory(),
  ]);

  // Combine students with vote history
  const studentsWithHistory: StudentWithHistory[] = students.map((s) => ({
    ...s,
    votedIn: voteHistory[s.id] || [],
  }));

  return (
    <StudentsClient
      students={studentsWithHistory}
      stats={stats}
      classrooms={classrooms}
    />
  );
}
