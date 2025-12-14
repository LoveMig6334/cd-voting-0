"use client";

import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-background-light text-slate-900 font-display">
      {/* Animated Gradient Background */}
      <div
        className="absolute inset-0 z-0 animate-gradient-shift opacity-90"
        style={{
          background:
            "linear-gradient(-45deg, #e8f4fc, #f0f7ff, #e6f0fa, #f5f9ff, #e0ecf8)",
          backgroundSize: "400% 400%",
        }}
      ></div>

      {/* Subtle Texture Overlay */}
      <div className="absolute inset-0 z-0 bg-[url('https://picsum.photos/800/800?grayscale')] bg-cover opacity-[0.02] mix-blend-overlay"></div>

      {/* Floating Decorative Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-float"
          style={{ top: "10%", left: "-5%" }}
        ></div>
        <div
          className="absolute w-96 h-96 rounded-full bg-accent-yellow/10 blur-3xl animate-float-slow"
          style={{ top: "50%", right: "-10%" }}
        ></div>
        <div
          className="absolute w-64 h-64 rounded-full bg-blue-400/10 blur-3xl animate-float-slower"
          style={{ bottom: "10%", left: "30%" }}
        ></div>
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center text-center gap-4 mb-16 animate-fade-in">
          {/* Logo Container with Glassmorphism and Pulse Glow */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 transform rotate-3 animate-pulse-glow"
            style={{
              background: "rgba(255, 255, 255, 0.7)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.8)",
            }}
          >
            <span className="material-symbols-outlined text-5xl text-primary drop-shadow-sm">
              how_to_vote
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-yellow-400 text-6xl font-black tracking-tight drop-shadow-sm leading-tight">
              CD
            </h1>
            <h1 className="text-blue-600 text-6xl font-black tracking-tight drop-shadow-sm leading-tight">
              VOTING
            </h1>
            <h1 className="text-gray-600 text-6xl font-black tracking-tight drop-shadow-sm leading-tight">
              0
            </h1>
          </div>
          <p className="text-xl font-medium text-slate-500 tracking-wide">
            Next Gen School Election
          </p>
        </div>

        <div
          className="w-full flex flex-col gap-5 items-center animate-slide-up"
          style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
        >
          {/* OCR Badge with Glass Effect */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm"
            style={{
              background: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
            }}
          >
            <span className="material-symbols-outlined text-[18px] text-accent-yellow">
              filter_center_focus
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              OCR Enabled
            </span>
          </div>

          {/* Enhanced Button with Shimmer Effect */}
          <button
            onClick={() => router.push("/register")}
            className="relative w-full group flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-white h-16 rounded-full px-6 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
          >
            {/* Shimmer Effect Overlay */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                animation: "shimmer 1.5s infinite",
              }}
            ></div>
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

      <footer
        className="relative z-10 flex flex-col gap-6 px-5 pb-8 pt-4 text-center w-full animate-fade-in"
        style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
      >
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
