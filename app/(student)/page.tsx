"use client";

import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background-light text-slate-900 pb-24">
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
            1 รายการ
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <button className="px-4 py-1.5 rounded-full bg-primary text-white text-sm font-medium whitespace-nowrap shadow-sm shadow-primary/20">
            ทั้งหมด
          </button>
          <button className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium whitespace-nowrap hover:bg-slate-50">
            สภานักเรียน
          </button>
          <button className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium whitespace-nowrap hover:bg-slate-50">
            ชมรม
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {/* Card 1 */}
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
              สภานักเรียน 2568
            </h2>
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              ลงคะแนนเสียงของคุณเพื่อเลือกตัวแทนสภานักเรียนชุดใหม่
            </p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px] opacity-70">
                  calendar_today
                </span>
                <span>
                  เริ่ม:{" "}
                  <span className="font-medium text-slate-700">
                    20 ต.ค. 08:00 น.
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
                    24 ต.ค. 17:00 น.
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => router.push("/elections/student-council")}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-accent-yellow hover:text-slate-900 active:bg-accent-yellow text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm shadow-primary/20 hover:shadow-accent-yellow/20"
              >
                <span>ลงคะแนนเลย</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </article>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
