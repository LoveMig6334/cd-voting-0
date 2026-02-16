"use client";

import { ConfirmModal } from "@/components/ConfirmModal";
import {
  archiveElection,
  createElection,
  deleteElection,
  unarchiveElection,
  updateElection,
} from "@/lib/actions/elections";
import { ElectionRow } from "@/lib/db";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

// ============================================
// Types
// ============================================

type ElectionStatus = "PENDING" | "OPEN" | "CLOSED";
type StatusFilterType = "all" | "PENDING" | "OPEN" | "CLOSED";
type ViewMode = "active" | "archived";

export interface ElectionWithCandidates extends ElectionRow {
  candidateCount: number;
}

interface ElectionsClientProps {
  elections: ElectionWithCandidates[];
  archivedElections: ElectionWithCandidates[];
}

// ============================================
// Helper Functions
// ============================================

function calculateStatus(startDate: Date, endDate: Date): ElectionStatus {
  const now = new Date();
  if (now < startDate) return "PENDING";
  if (now >= startDate && now <= endDate) return "OPEN";
  return "CLOSED";
}

// ============================================
// Status Badge Component
// ============================================

// Hoisted constants to avoid re-creation on every render (rendering-hoist-jsx)
const STATUS_STYLES = {
  OPEN: "bg-green-100 text-green-700",
  PENDING: "bg-slate-100 text-slate-600",
  CLOSED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-amber-100 text-amber-700",
} as const;

const STATUS_LABELS: Record<ElectionStatus | "ARCHIVED", string> = {
  OPEN: "เปิด",
  PENDING: "ร่าง",
  CLOSED: "ปิด",
  ARCHIVED: "ถาวร",
} as const;

function StatusBadge({ status }: { status: ElectionStatus | "ARCHIVED" }) {
  return (
    <span
      className={`${STATUS_STYLES[status]} px-2.5 py-1 rounded-full text-xs font-semibold uppercase`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ============================================
// Format date for display
// ============================================

function formatDate(date: Date): string {
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================
// Main Component
// ============================================

export default function ElectionsClient({
  elections,
  archivedElections,
}: ElectionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [showModal, setShowModal] = useState(false);

  // Confirm modals state
  const [toggleConfirm, setToggleConfirm] = useState<{
    election: ElectionWithCandidates & { status: ElectionStatus };
    isOpening: boolean;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{
    id: number;
    title: string;
    isArchived: boolean;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "student-committee",
    startDate: "",
    endDate: "",
  });
  const [formError, setFormError] = useState("");

  // Calculate status for each election (non-archived)
  const electionsWithStatus = elections.map((e) => ({
    ...e,
    displayStatus: calculateStatus(
      new Date(e.start_date),
      new Date(e.end_date),
    ) as ElectionStatus | "ARCHIVED",
  }));

  // Add archived elections with ARCHIVED status
  const archivedElectionsWithStatus = archivedElections.map((e) => ({
    ...e,
    displayStatus: "ARCHIVED" as const,
  }));

  // Combine and filter based on current view mode and status filter
  const allElections =
    viewMode === "archived" ? archivedElectionsWithStatus : electionsWithStatus;

  const filteredElections = allElections.filter((election) => {
    const matchesSearch = election.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      viewMode === "archived" ||
      statusFilter === "all" ||
      election.displayStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateElection = () => {
    // Validate form
    if (!formData.title.trim()) {
      setFormError("กรุณากรอกชื่อการเลือกตั้ง");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setFormError("กรุณาระบุวันเริ่มต้นและวันสิ้นสุด");
      return;
    }
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setFormError("วันสิ้นสุดต้องมากกว่าวันเริ่มต้น");
      return;
    }

    startTransition(async () => {
      const result = await createElection({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });

      if (result.success && result.electionId) {
        // Reset form
        setFormData({
          title: "",
          description: "",
          type: "student-committee",
          startDate: "",
          endDate: "",
        });
        setFormError("");
        setShowModal(false);

        // Redirect to candidate management
        router.push(`/admin/elections/${result.electionId}/candidates`);
      } else {
        setFormError(result.error || "เกิดข้อผิดพลาดในการสร้างการเลือกตั้ง");
      }
    });
  };

  const handleToggleStatus = (
    election: ElectionWithCandidates & {
      displayStatus: ElectionStatus | "ARCHIVED";
    },
  ) => {
    const isOpening = election.displayStatus !== "OPEN";
    setToggleConfirm({
      election: election as ElectionWithCandidates & { status: ElectionStatus },
      isOpening,
    });
  };

  const confirmToggleStatus = () => {
    if (!toggleConfirm) return;

    const { election, isOpening } = toggleConfirm;

    startTransition(async () => {
      const now = new Date();
      const updates: { startDate?: string; endDate?: string } = {};

      if (isOpening) {
        // Opening: Set start date to now
        updates.startDate = now.toISOString();

        // Ensure end date is in the future
        const currentEnd = new Date(election.end_date);
        if (currentEnd <= now) {
          // Default to 24 hours from now if end date is passed
          const tomorrow = new Date(now);
          tomorrow.setHours(tomorrow.getHours() + 24);
          updates.endDate = tomorrow.toISOString();
        }
      } else {
        // Closing: Set end date to now
        updates.endDate = now.toISOString();
      }

      await updateElection(election.id, updates);
      router.refresh();
    });
  };

  const handleDeleteElection = (id: number, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const confirmDeleteElection = () => {
    if (!deleteConfirm) return;
    startTransition(async () => {
      await deleteElection(deleteConfirm.id);
      router.refresh();
    });
  };

  const handleArchiveElection = (
    id: number,
    title: string,
    isArchived: boolean,
  ) => {
    setArchiveConfirm({ id, title, isArchived });
  };

  const confirmArchiveElection = () => {
    if (!archiveConfirm) return;
    startTransition(async () => {
      if (archiveConfirm.isArchived) {
        await unarchiveElection(archiveConfirm.id);
      } else {
        await archiveElection(archiveConfirm.id);
      }
      setArchiveConfirm(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            {viewMode === "archived"
              ? "การเลือกตั้งที่เก็บถาวร"
              : "จัดการการเลือกตั้ง"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {viewMode === "archived"
              ? "รายการการเลือกตั้งที่ถูกเก็บถาวร สามารถกู้คืนได้"
              : "สร้าง, แก้ไข และจัดการการเลือกตั้งทั้งหมดของโรงเรียน"}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Archive Toggle Button */}
          <button
            onClick={() =>
              setViewMode(viewMode === "archived" ? "active" : "archived")
            }
            className={`p-2.5 rounded-lg transition-colors relative ${
              viewMode === "archived"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
            title={
              viewMode === "archived"
                ? "กลับไปรายการปกติ"
                : "ดูการเลือกตั้งที่เก็บถาวร"
            }
          >
            <span className="material-symbols-outlined text-xl">
              {viewMode === "archived" ? "inventory_2" : "archive"}
            </span>
            {viewMode === "active" && archivedElections.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {archivedElections.length}
              </span>
            )}
          </button>

          {/* Create Button - only show in active view */}
          {viewMode === "active" && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              สร้างการเลือกตั้งใหม่
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              type="text"
              placeholder="ค้นหาการเลือกตั้ง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
            />
          </div>

          {/* Status Filter - only show in active view */}
          {viewMode === "active" && (
            <div className="flex gap-2 flex-wrap">
              {(["all", "PENDING", "OPEN", "CLOSED"] as const).map((status) => {
                const labels: Record<StatusFilterType, string> = {
                  all: "ทั้งหมด",
                  PENDING: "ร่าง",
                  OPEN: "เปิด",
                  CLOSED: "ปิด",
                };
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ชื่อ
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ผู้สมัคร
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  ช่วงเวลา
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  คะแนน
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  การดำเนินการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredElections.map((election) => {
                const isArchived = election.displayStatus === "ARCHIVED";
                return (
                  <tr
                    key={election.id}
                    className={`hover:bg-slate-50 transition-colors ${isArchived ? "opacity-75" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {election.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={election.displayStatus} />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {election.candidateCount} ผู้สมัคร
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {formatDate(new Date(election.start_date))} -{" "}
                      {formatDate(new Date(election.end_date))}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {election.total_votes.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Status - only for non-archived */}
                        {!isArchived && (
                          <button
                            onClick={() => handleToggleStatus(election)}
                            disabled={isPending}
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                              election.displayStatus === "OPEN"
                                ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={
                              election.displayStatus === "OPEN"
                                ? "ปิดการเลือกตั้ง"
                                : "เปิดการเลือกตั้ง"
                            }
                          >
                            <span className="material-symbols-outlined text-xl">
                              {election.displayStatus === "OPEN"
                                ? "stop_circle"
                                : "play_circle"}
                            </span>
                          </button>
                        )}

                        {/* Archive / Unarchive */}
                        <button
                          onClick={() =>
                            handleArchiveElection(
                              election.id,
                              election.title,
                              isArchived,
                            )
                          }
                          disabled={isPending}
                          className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                            isArchived
                              ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                              : "text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                          }`}
                          title={isArchived ? "กู้คืน" : "เก็บถาวร"}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {isArchived ? "unarchive" : "archive"}
                          </span>
                        </button>

                        {/* View Candidates */}
                        <Link
                          href={`/admin/elections/${election.id}/candidates`}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="จัดการผู้สมัคร"
                        >
                          <span className="material-symbols-outlined text-xl">
                            group
                          </span>
                        </Link>

                        {/* View Results */}
                        <Link
                          href={`/admin/elections/${election.id}/results`}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="ดูผลลัพธ์"
                        >
                          <span className="material-symbols-outlined text-xl">
                            bar_chart
                          </span>
                        </Link>

                        {/* Delete - only for non-archived */}
                        {!isArchived && (
                          <button
                            onClick={() =>
                              handleDeleteElection(election.id, election.title)
                            }
                            disabled={isPending}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="ลบ"
                          >
                            <span className="material-symbols-outlined text-xl">
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredElections.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              {viewMode === "archived" ? "inventory_2" : "inbox"}
            </span>
            <p className="text-slate-500">
              {viewMode === "archived"
                ? "ไม่มีการเลือกตั้งที่ถูกเก็บถาวร"
                : "ไม่พบการเลือกตั้ง"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {viewMode === "archived"
                ? "การเลือกตั้งที่ถูกเก็บถาวรจะแสดงที่นี่"
                : 'คลิก "สร้างการเลือกตั้งใหม่" เพื่อเริ่มต้น'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                สร้างการเลือกตั้งใหม่
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError("");
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Error Message */}
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ชื่อการเลือกตั้ง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น คณะกรรมการนักเรียน 2568"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  รายละเอียด
                </label>
                <textarea
                  rows={3}
                  placeholder="อธิบายการเลือกตั้งนี้..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Election Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ประเภทการเลือกตั้ง <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="student-committee">คณะกรรมการนักเรียน</option>
                  <option value="custom">อื่นๆ (กำหนดเอง)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  {formData.type === "student-committee"
                    ? "จะสร้างตำแหน่งเริ่มต้น: ประธาน, รองประธาน, เลขานุการ, เหรัญญิก ฯลฯ"
                    : "คุณจะต้องเพิ่มตำแหน่งเองในหน้าจัดการผู้สมัคร"}
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    วันเริ่มต้น <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    วันสิ้นสุด <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormError("");
                }}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreateElection}
                disabled={isPending}
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isPending ? "กำลังสร้าง..." : "สร้างและจัดการผู้สมัคร"}
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation */}
      <ConfirmModal
        isOpen={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        onConfirm={confirmToggleStatus}
        title={`ยืนยันการ${toggleConfirm?.isOpening ? "เปิด" : "ปิด"}การเลือกตั้ง`}
        message={`คุณแน่ใจหรือไม่ที่จะ${toggleConfirm?.isOpening ? "เปิด" : "ปิด"}การเลือกตั้ง "${toggleConfirm?.election.title}" ทันที?\n\nการดำเนินการนี้จะปรับเปลี่ยนเวลาเริ่มต้น/สิ้นสุดของการเลือกตั้งโดยอัตโนมัติ`}
        confirmText={toggleConfirm?.isOpening ? "เปิดเลย" : "ปิดเลย"}
        cancelText="ยกเลิก"
        variant={toggleConfirm?.isOpening ? "success" : "default"}
      />

      {/* Delete Election Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDeleteElection}
        title="ยืนยันการลบการเลือกตั้ง"
        message={`คุณแน่ใจหรือไม่ที่จะลบการเลือกตั้ง "${deleteConfirm?.title}"? การดำเนินการนี้จะลบผู้สมัคร คะแนนโหวต และข้อมูลทั้งหมดที่เกี่ยวข้อง และไม่สามารถย้อนกลับได้`}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        variant="danger"
      />

      {/* Archive/Unarchive Election Confirmation */}
      <ConfirmModal
        isOpen={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        onConfirm={confirmArchiveElection}
        title={`ยืนยันการ${archiveConfirm?.isArchived ? "กู้คืน" : "เก็บถาวร"}การเลือกตั้ง`}
        message={
          archiveConfirm?.isArchived
            ? `คุณแน่ใจหรือไม่ที่จะกู้คืนการเลือกตั้ง "${archiveConfirm?.title}" กลับมาแสดงในรายการ?`
            : `คุณแน่ใจหรือไม่ที่จะเก็บถาวรการเลือกตั้ง "${archiveConfirm?.title}"?\n\nการเลือกตั้งที่ถูกเก็บถาวรจะไม่แสดงในหน้า Dashboard ของนักเรียน แต่ยังสามารถกู้คืนได้`
        }
        confirmText={archiveConfirm?.isArchived ? "กู้คืน" : "เก็บถาวร"}
        cancelText="ยกเลิก"
        variant={archiveConfirm?.isArchived ? "success" : "default"}
      />
    </div>
  );
}
