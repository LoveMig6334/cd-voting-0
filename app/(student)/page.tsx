"use client";

import { BottomNav } from "@/components/BottomNav";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

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
                <img
                  alt="Profile"
                  className="w-full h-full object-cover"
                  src="https://picsum.photos/seed/alex/200/200"
                />
              </div>
              <div className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <p className="text-xs font-medium text-slate-500">
                Welcome back,
              </p>
              <p className="text-sm font-bold leading-tight">Alex Johnson</p>
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
            Active Elections
          </h1>
          <div className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
            3 Active
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          <button className="px-4 py-1.5 rounded-full bg-primary text-white text-sm font-medium whitespace-nowrap shadow-sm shadow-primary/20">
            All
          </button>
          <button className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium whitespace-nowrap hover:bg-slate-50">
            Student Council
          </button>
          <button className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium whitespace-nowrap hover:bg-slate-50">
            Clubs
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
                Open
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
              Student Council 2024
            </h2>
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              Cast your vote for the next student body representatives.
            </p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px] opacity-70">
                  calendar_today
                </span>
                <span>
                  Starts:{" "}
                  <span className="font-medium text-slate-700">
                    Oct 20, 8:00 AM
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px] opacity-70">
                  event_busy
                </span>
                <span>
                  Ends:{" "}
                  <span className="font-medium text-slate-700">
                    Oct 24, 5:00 PM
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => router.push("/elections/student-council")}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm shadow-primary/20"
              >
                <span>Vote Now</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </article>

          {/* Card 2 */}
          <article className="group relative flex flex-col bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center justify-center size-12 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <span className="material-symbols-outlined filled">person</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider border border-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Open
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
              Music President
            </h2>
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              Choose your leader for the music department activities.
            </p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px] opacity-70">
                  calendar_today
                </span>
                <span>
                  Starts:{" "}
                  <span className="font-medium text-slate-700">
                    Oct 21, 9:00 AM
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px] opacity-70">
                  event_busy
                </span>
                <span>
                  Ends:{" "}
                  <span className="font-medium text-slate-700">
                    Oct 25, 3:00 PM
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => router.push("/elections/music-president")}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-xl transition-all active:scale-[0.98] shadow-sm shadow-primary/20"
              >
                <span>Vote Now</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </button>
            </div>
          </article>

          {/* Card 3 (Closed) */}
          <article className="group relative flex flex-col bg-white rounded-2xl p-5 shadow-sm border border-slate-200 opacity-80 hover:opacity-100 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center justify-center size-12 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                <span className="material-symbols-outlined filled">flag</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold uppercase tracking-wider border border-rose-200">
                Closed
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-700 mb-1">
              Sports Captain Selection
            </h2>
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              Selection for the upcoming inter-school sports meet.
            </p>
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <span className="material-symbols-outlined text-[16px] opacity-70">
                  history
                </span>
                <span>
                  Ended:{" "}
                  <span className="font-medium text-slate-700">
                    Oct 20, 11:59 PM
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => router.push("/analytics")}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-medium py-3 px-4 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <span>View Results</span>
                <span className="material-symbols-outlined text-[18px]">
                  poll
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
