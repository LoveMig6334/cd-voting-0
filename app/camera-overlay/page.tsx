"use client";

import CameraOverlay from "@/components/ocr/CameraOverlay";
import { StudentData } from "@/lib/student-data";
import { useRouter } from "next/navigation";

export default function CameraOverlayPage() {
  const router = useRouter();

  const handleScanComplete = (data: StudentData) => {
    // Redirect back to register with parsed student data
    const params = new URLSearchParams({
      studentId: data.id.toString(),
      name: data.name,
      surname: data.surname,
      classRoom: data.classroom || "",
    }).toString();
    router.push(`/register?${params}`);
  };

  return <CameraOverlay onScanComplete={handleScanComplete} />;
}
