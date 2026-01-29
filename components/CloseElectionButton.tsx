"use client";

import { updateElectionStatus } from "@/lib/actions/elections";
import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

interface CloseElectionButtonProps {
  electionId: number;
}

export function CloseElectionButton({ electionId }: CloseElectionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (loading) return;
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const result = await updateElectionStatus(electionId, "CLOSED");
      if (!result.success) {
        alert(result.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-linear-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-red-500/25 flex items-center gap-2 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">
          {loading ? "hourglass_empty" : "block"}
        </span>
        {loading ? "กำลังปิด..." : "ปิดการเลือกตั้ง"}
      </button>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        title="ยืนยันการปิดการเลือกตั้ง"
        message="คุณแน่ใจหรือไม่ที่จะปิดการเลือกตั้งนี้? นักเรียนจะไม่สามารถลงคะแนนได้อีก"
        confirmText="ปิดการเลือกตั้ง"
        cancelText="ยกเลิก"
        variant="danger"
      />
    </>
  );
}
