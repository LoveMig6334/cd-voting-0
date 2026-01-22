"use client";

import { ElectionWithDetails } from "@/lib/actions/elections";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useStudentUser } from "./StudentLayoutClient";

// Format date for display
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Election Card Component
function ElectionCard({ election }: { election: ElectionWithDetails }) {
  const router = useRouter();

  const enabledPositions = election.positions.filter((p) => p.enabled);
  const hasCandidates = election.candidates.length > 0;

  return (
    <article className="group relative flex flex-col bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center justify-center size-12 rounded-xl bg-blue-50 text-primary shrink-0">
          <span className="material-symbols-outlined filled">gavel</span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider border border-emerald-200">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          เปิด
        </span>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
        {election.title}
      </h2>
      <p className="text-sm text-slate-600 line-clamp-2 mb-4">
        {election.description || "ลงคะแนนเสียงของคุณเพื่อเลือกตัวแทน"}
      </p>
      <div className="space-y-2 mb-5">
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[16px] opacity-70">
            calendar_today
          </span>
          <span>
            เริ่ม:{" "}
            <span className="font-medium text-slate-700">
              {formatDate(election.start_date)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[16px] opacity-70">
            event_busy
          </span>
          <span>
            สิ้นสุด:{" "}
            <span className="font-medium text-slate-700">
              {formatDate(election.end_date)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[16px] opacity-70">
            groups
          </span>
          <span>
            {enabledPositions.length} ตำแหน่ง • {election.candidates.length}{" "}
            ผู้สมัคร
          </span>
        </div>
      </div>
      <div className="mt-auto">
        <button
          onClick={() => router.push(`/elections/${election.id}`)}
          disabled={!hasCandidates}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] ${
            hasCandidates
              ? "bg-primary hover:bg-accent-yellow hover:text-slate-900 active:bg-accent-yellow text-white shadow-sm shadow-primary/20 hover:shadow-accent-yellow/20"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <span>{hasCandidates ? "ลงคะแนนเลย" : "ยังไม่มีผู้สมัคร"}</span>
          {hasCandidates && (
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          )}
        </button>
      </div>
    </article>
  );
}

interface DashboardClientProps {
  elections: ElectionWithDetails[];
}

export function DashboardClient({ elections }: DashboardClientProps) {
  const router = useRouter();
  const user = useStudentUser();

  return (
    <div className="min-h-screen bg-background-light text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background-light/90 backdrop-blur-md border-b border-slate-200">
        <div className="px-4 py-3 flex items-center justify-between max-w-md mx-auto w-full">
          <div className="flex items-center gap-3">
            <div
              className="relative group cursor-pointer"
              onClick={() => router.push("/me")}
            >
              <div className="size-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-transparent group-hover:ring-primary transition-all">
                <Image
                  alt="Profile"
                  className="w-full h-full object-cover"
                  src="https://picsum.photos/seed/alex/200/200"
                  width={40}
                  height={40}
                  priority
                />
              </div>
              <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-medium text-slate-500">
                ยินดีต้อนรับกลับ,
              </p>
              <p className="text-sm font-bold leading-tight">
                {user ? `${user.name} ${user.surname}` : "ผู้เยี่ยมชม"}
              </p>
            </div>
          </div>
          <button className="flex items-center justify-center size-10 rounded-full hover:bg-slate-200 transition-colors text-slate-600">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-6 max-w-md mx-auto w-full animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            การเลือกตั้งที่เปิดอยู่
          </h1>
          <div className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
            {elections.length} รายการ
          </div>
        </div>

        {elections.length > 0 ? (
          <div className="grid grid-cols-1 gap-5">
            {elections.map((election) => (
              <ElectionCard key={election.id} election={election} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
              how_to_vote
            </span>
            <h3 className="text-lg font-semibold text-slate-700">
              ไม่มีการเลือกตั้งที่เปิดอยู่
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              กรุณารอจนกว่าจะมีการเลือกตั้งเปิดให้ลงคะแนน
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
