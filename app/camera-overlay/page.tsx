"use client";

import CameraOverlay from "@/components/ocr/CameraOverlay";
import { useRouter } from "next/navigation";

export default function CameraOverlayPage() {
  const router = useRouter();

  const handleScanComplete = (data: {
    id: number;
    name: string;
    surname: string;
    classroom: string;
  }) => {
    // Redirect back to register with params
    const params = new URLSearchParams({
      studentId: data.id.toString(),
      name: `${data.name} ${data.surname}`,
      classRoom: data.classroom,
    }).toString();
    router.push(`/register?${params}`);
  };

  return <CameraOverlay onScanComplete={handleScanComplete} />;
}
