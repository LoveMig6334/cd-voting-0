"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // For now, redirect to admin dashboard
    router.push("/admin");
    setIsSubmitting(false);
  };

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-slate-50 font-display">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[100px] animate-float"
          style={{ top: "-10%", right: "-5%" }}
        ></div>
        <div
          className="absolute w-[400px] h-[400px] rounded-full bg-yellow-50/50 blur-[80px] animate-float-slow"
          style={{ bottom: "5%", left: "-5%" }}
        ></div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        <div
          className="rounded-3xl p-8 md:p-10 shadow-2xl shadow-slate-200/50"
          style={{
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 1)",
          }}
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-baseline gap-2 mb-2">
              <h1 className="text-yellow-500 text-4xl font-black tracking-tight leading-none">
                CD
              </h1>
              <h1 className="text-blue-600 text-4xl font-black tracking-tight leading-none">
                VOTING
              </h1>
              <h1 className="text-slate-400 text-4xl font-black tracking-tight leading-none">
                0
              </h1>
            </div>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em]">
              Management Portal
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase ml-1 tracking-wider">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    person
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full h-14 pl-12 pr-4 bg-slate-100/50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    lock
                  </span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 pl-12 pr-4 bg-slate-100/50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              Back to Student Portal
            </Link>
          </div>
        </div>

        {/* System copyright */}
        <p className="mt-8 text-center text-xs font-medium text-slate-400">
          SECURE ADMINISTRATIVE ACCESS ONLY
          <br />
          CD Voting 0 &copy; 2024
        </p>
      </div>
    </div>
  );
}
