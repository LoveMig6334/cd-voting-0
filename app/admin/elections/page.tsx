"use client";

import Link from "next/link";
import { useState } from "react";

// Types
interface Election {
  id: number;
  title: string;
  status: "draft" | "open" | "closed";
  candidates: number;
  startDate: string;
  endDate: string;
  votes: number;
}

// Mock Data
const mockElections: Election[] = [
  {
    id: 1,
    title: "Student Council 2025",
    status: "open",
    candidates: 4,
    startDate: "Oct 20, 2024",
    endDate: "Oct 24, 2024",
    votes: 843,
  },
  {
    id: 2,
    title: "Club Leadership Elections",
    status: "open",
    candidates: 12,
    startDate: "Oct 22, 2024",
    endDate: "Oct 28, 2024",
    votes: 156,
  },
  {
    id: 3,
    title: "Sports Captain Selection",
    status: "closed",
    candidates: 8,
    startDate: "Sep 15, 2024",
    endDate: "Sep 20, 2024",
    votes: 1204,
  },
  {
    id: 4,
    title: "Music President 2025",
    status: "draft",
    candidates: 3,
    startDate: "Nov 01, 2024",
    endDate: "Nov 05, 2024",
    votes: 0,
  },
];

// Status Badge Component
function StatusBadge({ status }: { status: Election["status"] }) {
  const styles = {
    open: "bg-green-100 text-green-700",
    draft: "bg-slate-100 text-slate-600",
    closed: "bg-red-100 text-red-700",
  };

  const statusLabels: Record<Election["status"], string> = {
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

export default function ElectionManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "open" | "closed"
  >("all");
  const [showModal, setShowModal] = useState(false);

  const filteredElections = mockElections.filter((election) => {
    const matchesSearch = election.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || election.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
                    {election.candidates} ผู้สมัคร
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-sm">
                    {election.startDate} - {election.endDate}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {election.votes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-xl">
                          edit
                        </span>
                      </button>
                      <Link
                        href={`/admin/elections/${election.id}/results`}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="View Results"
                      >
                        <span className="material-symbols-outlined text-xl">
                          bar_chart
                        </span>
                      </Link>
                      <button
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
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
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
              inbox
            </span>
            <p className="text-slate-500">ไม่พบการเลือกตั้ง</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                สร้างการเลือกตั้งใหม่
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ชื่อการเลือกตั้ง
                </label>
                <input
                  type="text"
                  placeholder="เช่น สภานักเรียน 2568"
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    วันเริ่มต้น
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    วันสิ้นสุด
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Candidates Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ผู้สมัคร
                </label>
                <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">
                    person_add
                  </span>
                  <p className="text-sm text-slate-500 mb-3">
                    ยังไม่มีผู้สมัคร
                  </p>
                  <button className="text-primary hover:text-primary-dark text-sm font-medium">
                    + เพิ่มผู้สมัคร
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                สร้างการเลือกตั้ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
