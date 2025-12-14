"use client";

import CameraOverlay from "@/components/ocr/CameraOverlay";
import { useRouter } from "next/navigation";

export default function CameraOverlayPage() {
  const router = useRouter();

  const handleScanComplete = () => {
    // Simulate OCR result
    const mockOCRData = {
      studentId: "6312",
      name: "นายสมชาย ใจดี",
      classRoom: "ม.5/3",
    };

    // Redirect back to register with params
    const params = new URLSearchParams(mockOCRData).toString();
    router.push(`/register?${params}`);
  };

  return <CameraOverlay onScanComplete={handleScanComplete} />;
}
