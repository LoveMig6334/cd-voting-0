"use client";

import { StudentVoteRecord } from "@/lib/actions/student-votes";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MyVotesClientProps {
  initialVotes: StudentVoteRecord[];
}

type FilterStatus = "all" | "pending" | "confirmed";

// Format date to Thai format
function formatThaiDate(date: Date): string {
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const d = new Date(date);
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543; // Convert to Buddhist Era
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} • ${hours}:${minutes} น.`;
}

// Copy to clipboard
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Filter chip component - moved outside to avoid recreation
function FilterChip({
  status,
  label,
  currentFilter,
  onFilterChange,
}: {
  status: FilterStatus;
  label: string;
  currentFilter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
}) {
  return (
    <button
      onClick={() => onFilterChange(status)}
      className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 shadow-sm transition-transform active:scale-95 ${
        currentFilter === status
          ? "bg-primary"
          : "bg-white border border-gray-200"
      }`}
    >
      <p
        className={`text-sm font-medium leading-normal ${
          currentFilter === status ? "text-white" : "text-slate-900"
        }`}
      >
        {label}
      </p>
    </button>
  );
}

// Status badge component - moved outside to avoid recreation
function StatusBadge({ status }: { status: "pending" | "confirmed" }) {
  return status === "confirmed" ? (
    <div className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      <span
        className="material-symbols-outlined mr-1"
        style={{ fontSize: "14px" }}
      >
        check_circle
      </span>
      ยืนยันแล้ว
    </div>
  ) : (
    <div className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
      <span
        className="material-symbols-outlined mr-1"
        style={{ fontSize: "14px" }}
      >
        hourglass_top
      </span>
      รอดำเนินการ
    </div>
  );
}

export default function MyVotesClient({ initialVotes }: MyVotesClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Filter votes based on selected filter
  const filteredVotes = initialVotes.filter((vote) => {
    if (filter === "all") return true;
    return vote.status === filter;
  });

  // Handle copy token
  const handleCopyToken = async (token: string) => {
    const success = await copyToClipboard(token);
    if (success) {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  return (
    <div className="bg-background-light text-slate-900 min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto bg-background-light shadow-xl pb-24">
        {/* Header */}
        <div className="flex items-center bg-white p-4 pb-2 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => router.back()}
            className="text-slate-900 flex size-12 shrink-0 items-center justify-start hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            การลงคะแนนของฉัน
          </h2>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar bg-background-light sticky top-[60px] z-10">
          <FilterChip
            status="all"
            label="ทั้งหมด"
            currentFilter={filter}
            onFilterChange={setFilter}
          />
          <FilterChip
            status="confirmed"
            label="ยืนยันแล้ว"
            currentFilter={filter}
            onFilterChange={setFilter}
          />
          <FilterChip
            status="pending"
            label="รอดำเนินการ"
            currentFilter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* Vote Cards */}
        <div className="flex flex-col gap-4 px-4 pb-8">
          {filteredVotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span
                className="material-symbols-outlined text-slate-300 mb-4"
                style={{ fontSize: "64px" }}
              >
                how_to_vote
              </span>
              <p className="text-slate-500 text-base font-medium">
                {filter === "all"
                  ? "ยังไม่มีประวัติการลงคะแนน"
                  : filter === "pending"
                    ? "ไม่มีรายการที่รอดำเนินการ"
                    : "ไม่มีรายการที่ยืนยันแล้ว"}
              </p>
            </div>
          ) : (
            filteredVotes.map((vote) => (
              <div
                key={vote.id}
                className="flex flex-col rounded-lg bg-white p-4 shadow-sm"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <StatusBadge status={vote.status} />
                    </div>
                    <h3 className="text-base font-bold leading-tight">
                      {vote.electionTitle}
                    </h3>
                    <p className="text-slate-500 text-xs font-normal leading-normal">
                      {formatThaiDate(vote.votedAt)}
                    </p>
                  </div>
                  <div className="w-16 h-16 shrink-0 bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-primary"
                      style={{ fontSize: "28px" }}
                    >
                      how_to_vote
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleCopyToken(vote.token)}
                    className="group flex w-full max-w-[240px] cursor-pointer items-center justify-between overflow-hidden rounded-md bg-slate-50 px-3 py-2 transition-colors hover:bg-gray-200"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Token
                      </span>
                      <span className="truncate font-mono text-sm">
                        {vote.token}
                      </span>
                    </div>
                    <span
                      className={`material-symbols-outlined transition-transform ${
                        copiedToken === vote.token
                          ? "text-green-600"
                          : "text-primary group-hover:scale-110"
                      }`}
                      style={{ fontSize: "18px" }}
                    >
                      {copiedToken === vote.token ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
