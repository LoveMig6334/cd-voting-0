"use client";

import { updateElectionStatus } from "@/lib/actions/elections";
import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

interface ElectionControlButtonsProps {
  electionId: number;
  currentStatus: string;
}

export function ElectionControlButtons({
  electionId,
  currentStatus,
}: ElectionControlButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"OPEN" | "CLOSED" | null>(
    null
  );

  const handleToggle = (newStatus: "OPEN" | "CLOSED") => {
    if (loading) return;
    setPendingStatus(newStatus);
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!pendingStatus || loading) return;

    setLoading(true);
    try {
      const result = await updateElectionStatus(electionId, pendingStatus);
      if (!result.success) {
        alert(result.error || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
      setPendingStatus(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {currentStatus !== "OPEN" ? (
          <button
            onClick={() => handleToggle("OPEN")}
            disabled={loading}
            className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "เปิด"}
          </button>
        ) : (
          <button
            onClick={() => handleToggle("CLOSED")}
            disabled={loading}
            className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "ปิด"}
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setPendingStatus(null);
        }}
        onConfirm={handleConfirm}
        title="ยืนยันการเปลี่ยนสถานะ"
        message={
          pendingStatus === "OPEN"
            ? "คุณแน่ใจหรือไม่ที่จะเปิดการเลือกตั้งนี้?"
            : "คุณแน่ใจหรือไม่ที่จะปิดการเลือกตั้งนี้?"
        }
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        variant={pendingStatus === "OPEN" ? "success" : "default"}
      />
    </>
  );
}
