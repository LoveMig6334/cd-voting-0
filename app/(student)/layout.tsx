import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/actions/auth";
import { StudentLayoutClient } from "./StudentLayoutClient";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // Pass user data to client layout wrapper
  const user = {
    id: session.student.id,
    prefix: session.student.prefix,
    name: session.student.name,
    surname: session.student.surname,
    classRoom: session.student.class_room,
    studentNo: session.student.student_no,
    votingApproved: session.student.voting_approved,
  };

  return <StudentLayoutClient user={user}>{children}</StudentLayoutClient>;
}
