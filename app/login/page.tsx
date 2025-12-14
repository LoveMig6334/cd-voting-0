"use client";

import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-dark text-white font-display">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-linear-to-br from-primary via-[#2D9CDB] to-[#56CCF2]"></div>
      <div className="absolute inset-0 z-0 bg-[url('https://picsum.photos/800/800?grayscale')] bg-cover opacity-[0.05] mix-blend-overlay"></div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center text-center gap-4 mb-16 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg flex items-center justify-center shadow-lg border border-white/20 mb-4 transform rotate-3">
            <span className="material-symbols-outlined text-5xl text-white drop-shadow-md">
              how_to_vote
            </span>
          </div>
          <h1 className="text-6xl font-black tracking-tight text-white drop-shadow-sm leading-tight">
            CD Voting 0
          </h1>
          <p className="text-xl font-medium text-blue-50/90 tracking-wide">
            Next Gen School Election
          </p>
        </div>

        <div className="w-full flex flex-col gap-5 items-center animate-slide-up">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-accent-yellow">
              filter_center_focus
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              OCR Enabled
            </span>
          </div>

          <button
            onClick={() => router.push("/register")}
            className="relative w-full group flex items-center justify-center gap-3 bg-accent-yellow hover:bg-[#ffc933] text-background-dark h-16 rounded-full px-6 transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="flex items-center justify-center p-1 rounded-full bg-black/5">
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
          <button className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Help Center
          </button>
          <span className="text-white/30">•</span>
          <button className="text-white/70 hover:text-white text-sm font-medium transition-colors">
            Admin Login
          </button>
        </div>
        <p className="text-white/40 text-xs font-normal">CD Voting 0 © 2024</p>
      </footer>
    </div>
  );
}
