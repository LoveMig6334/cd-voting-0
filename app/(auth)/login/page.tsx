"use client";

import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light text-slate-900 font-display">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-linear-to-br from-blue-50 via-white to-blue-100 opacity-80"></div>
      <div className="absolute inset-0 z-0 bg-[url('https://picsum.photos/800/800?grayscale')] bg-cover opacity-[0.03] mix-blend-overlay"></div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center text-center gap-4 mb-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-slate-100 mb-4 transform rotate-3">
            <span className="material-symbols-outlined text-5xl text-primary drop-shadow-sm">
              how_to_vote
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-yellow-400 text-6xl font-black tracking-tight text-slate-900 drop-shadow-sm leading-tight">
              CD
            </h1>
            <h1 className="text-6xl font-black tracking-tight text-slate-900 drop-shadow-sm leading-tight">
              VOTING
            </h1>
            <h1 className="text-6xl font-black tracking-tight text-slate-900 drop-shadow-sm leading-tight">
              0
            </h1>
          </div>
          <p className="text-xl font-medium text-slate-500 tracking-wide">
            Next Gen School Election
          </p>
        </div>

        <div className="w-full flex flex-col gap-5 items-center animate-slide-up">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-accent-yellow">
              filter_center_focus
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              OCR Enabled
            </span>
          </div>

          <button
            onClick={() => router.push("/register")}
            className="relative w-full group flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-white h-16 rounded-full px-6 transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="flex items-center justify-center p-1 rounded-full bg-white/10">
              <span className="material-symbols-outlined text-[24px]">
                perm_identity
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight truncate">
              Login / Register
            </span>
            <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300">
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </button>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col gap-6 px-5 pb-8 pt-4 text-center w-full">
        <div className="flex items-center justify-center gap-6">
          <button className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
            Help Center
          </button>
          <span className="text-slate-300">•</span>
          <button className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
            Admin Login
          </button>
        </div>
        <p className="text-slate-400 text-xs font-normal">CD Voting 0 © 2024</p>
      </footer>
    </div>
  );
}
