"use client";

import { updateElectionStatus } from "@/lib/actions/elections";
import { useState } from "react";

interface ElectionControlButtonsProps {
  electionId: number;
  currentStatus: string;
}

export function ElectionControlButtons({
  electionId,
  currentStatus,
}: ElectionControlButtonsProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (newStatus: "OPEN" | "CLOSED") => {
    if (loading) return;

    const confirmMsg =
      newStatus === "OPEN"
        ? "คุณแน่ใจหรือไม่ที่จะเปิดการเลือกตั้งนี้?"
        : "คุณแน่ใจหรือไม่ที่จะปิดการเลือกตั้งนี้?";

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const result = await updateElectionStatus(electionId, newStatus);
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
  );
}
