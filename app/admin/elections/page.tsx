"use client";

import { useElections } from "@/components/ElectionContext";
import { logElectionChange } from "@/lib/activity-store";
import { ElectionEvent, ElectionType } from "@/lib/election-types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Status Badge Component
function StatusBadge({ status }: { status: ElectionEvent["status"] }) {
  const styles = {
    open: "bg-green-100 text-green-700",
    draft: "bg-slate-100 text-slate-600",
    closed: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<ElectionEvent["status"], string> = {
    open: "เปิด",
    draft: "ร่าง",
    closed: "ปิด",
  };

  return (
    <span
      className={`${styles[status]} px-2.5 py-1 rounded-full text-xs font-semibold uppercase`}
    >
      {statusLabels[status]}
    </span>
  );
}

// Format date for display
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ElectionManagement() {
  const router = useRouter();
  const { elections, createElection, updateElection, deleteElection } =
    useElections();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "open" | "closed"
  >("all");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "student-committee" as ElectionType,
    startDate: "",
    endDate: "",
  });
  const [formError, setFormError] = useState("");

  const filteredElections = elections.filter((election) => {
    const matchesSearch = election.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || election.status === statusFilter;
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

    // Create election
    const newElection = createElection({
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    });

    // Log activity
    logElectionChange("สร้างการเลือกตั้ง", newElection.title);

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
    router.push(`/admin/elections/${newElection.id}/candidates`);
  };

  const handleToggleStatus = (election: ElectionEvent) => {
    const isOpening = election.status !== "open";
    const action = isOpening ? "เปิด" : "ปิด";

    if (
      confirm(
        `คุณต้องการ${action}การเลือกตั้ง "${election.title}" ทันทีหรือไม่?\n\nการดำเนินการนี้จะปรับเปลี่ยนเวลาเริ่มต้น/สิ้นสุดของการเลือกตั้งโดยอัตโนมัติ`,
      )
    ) {
      const now = new Date();
      const updates: { startDate?: string; endDate?: string } = {};

      if (isOpening) {
        // Opening: Set start date to now
        updates.startDate = now.toISOString();

        // Ensure end date is in the future
        const currentEnd = new Date(election.endDate);
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

      updateElection(election.id, updates);
      logElectionChange(`${action}การเลือกตั้ง`, election.title);
    }
  };

  const handleDeleteElection = (id: string) => {
    const election = elections.find((e) => e.id === id);
    if (confirm("คุณต้องการลบการเลือกตั้งนี้หรือไม่?")) {
      deleteElection(id);
      // Log activity after successful deletion
      if (election) {
        logElectionChange("ลบการเลือกตั้ง", election.title);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            จัดการการเลือกตั้ง
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            สร้าง, แก้ไข และจัดการการเลือกตั้งทั้งหมดของโรงเรียน
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-xl">add</span>
          สร้างการเลือกตั้งใหม่
        </button>
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

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["all", "draft", "open", "closed"] as const).map((status) => {
              const labels = {
                all: "ทั้งหมด",
                draft: "ร่าง",
                open: "เปิด",
                closed: "ปิด",
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
              {filteredElections.map((election) => (
                <tr
                  key={election.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900">
                      {election.title}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={election.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {election.candidates.length} ผู้สมัคร
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {formatDate(election.startDate)} -{" "}
                    {formatDate(election.endDate)}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {election.totalVotes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/elections/${election.id}/candidates`}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="จัดการผู้สมัคร"
                      >
                        <span className="material-symbols-outlined text-xl">
                          group
                        </span>
                      </Link>
                      <Link
                        href={`/admin/elections/${election.id}/results`}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="ดูผลลัพธ์"
                      >
                        <span className="material-symbols-outlined text-xl">
                          bar_chart
                        </span>
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(election)}
                        className={`p-2 rounded-lg transition-colors ${
                          election.status === "open"
                            ? "text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                            : "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={
                          election.status === "open"
                            ? "ปิดการเลือกตั้ง"
                            : "เปิดการเลือกตั้ง"
                        }
                      >
                        <span className="material-symbols-outlined text-xl">
                          {election.status === "open"
                            ? "stop_circle"
                            : "play_circle"}
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteElection(election.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="ลบ"
                      >
                        <span className="material-symbols-outlined text-xl">
                          delete
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredElections.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              inbox
            </span>
            <p className="text-slate-500">ไม่พบการเลือกตั้ง</p>
            <p className="text-slate-400 text-sm mt-1">
              คลิก &quot;สร้างการเลือกตั้งใหม่&quot; เพื่อเริ่มต้น
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
                    setFormData({ ...formData, title: e.target.value })
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
                    setFormData({ ...formData, description: e.target.value })
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
                      type: e.target.value as ElectionType,
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
                      setFormData({ ...formData, startDate: e.target.value })
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
                      setFormData({ ...formData, endDate: e.target.value })
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
                className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                สร้างและจัดการผู้สมัคร
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
