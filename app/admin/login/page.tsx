"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Mock admin credentials
const MOCK_ADMIN_CREDENTIALS = {
  username: "admin",
  password: "admin123",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Simulate login delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Validate credentials
    if (
      username === MOCK_ADMIN_CREDENTIALS.username &&
      password === MOCK_ADMIN_CREDENTIALS.password
    ) {
      // Successful login - redirect to admin dashboard
      router.push("/admin");
    } else {
      // Invalid credentials
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden mesh-gradient-bg font-display">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full bg-royal-blue/10 blur-[120px] animate-float"
          style={{ top: "-15%", right: "-10%" }}
        ></div>
        <div
          className="absolute w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[100px] animate-float-slow"
          style={{ bottom: "0%", left: "-10%" }}
        ></div>
        <div
          className="absolute w-[300px] h-[300px] rounded-full bg-vivid-yellow/10 blur-[80px] animate-float-slower"
          style={{ top: "40%", right: "10%" }}
        ></div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
        <div className="glass-card rounded-3xl p-8 md:p-10 relative overflow-hidden">
          {/* Top gradient bar like ticket-card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-royal-blue via-cyan-500 to-vivid-yellow"></div>

          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative flex items-center justify-center w-16 h-16 bg-linear-to-br from-royal-blue to-cyan-500 rounded-2xl mb-4 shadow-lg shadow-royal-blue/25">
              <span className="material-symbols-outlined text-white text-3xl">
                admin_panel_settings
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <h1 className="text-vivid-yellow text-3xl font-black tracking-tight leading-none drop-shadow-sm">
                CD
              </h1>
              <h1 className="text-royal-blue text-3xl font-black tracking-tight leading-none">
                VOTING
              </h1>
              <h1 className="text-cool-gray text-3xl font-black tracking-tight leading-none">
                0
              </h1>
            </div>
            <p className="text-sm font-semibold text-cool-gray uppercase tracking-[0.2em]">
              พอร์ทัลผู้ดูแลระบบ
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80 border border-red-200/50 backdrop-blur-sm flex items-start gap-3 animate-fade-in">
              <span className="material-symbols-outlined text-red-500 text-xl shrink-0 mt-0.5">
                error
              </span>
              <div>
                <p className="text-sm font-semibold text-red-600">
                  การยืนยันตัวตนล้มเหลว
                </p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-cool-gray uppercase ml-1 tracking-wider">
                ชื่อผู้ใช้
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cool-gray group-focus-within:text-royal-blue transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    person
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="กรอกชื่อผู้ใช้ผู้ดูแล"
                  className="w-full h-14 pl-12 pr-4 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue/50 focus:bg-white/70 transition-all text-dark-slate placeholder:text-cool-gray font-medium backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-cool-gray uppercase tracking-wider">
                  รหัสผ่าน
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-royal-blue hover:text-cyan-600 transition-colors"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cool-gray group-focus-within:text-royal-blue transition-colors">
                  <span className="material-symbols-outlined text-xl">
                    lock
                  </span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  className="w-full h-14 pl-12 pr-4 bg-white/50 border border-white/60 rounded-2xl outline-none focus:ring-2 focus:ring-royal-blue/20 focus:border-royal-blue/50 focus:bg-white/70 transition-all text-dark-slate placeholder:text-cool-gray backdrop-blur-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 mt-4 bg-linear-to-r from-royal-blue to-cyan-500 hover:from-royal-blue/90 hover:to-cyan-500/90 text-white font-bold rounded-2xl shadow-lg shadow-royal-blue/25 transition-all active:transform active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer inside card */}
          <div className="mt-8 pt-6 border-t border-slate-100/50 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-cool-gray hover:text-royal-blue flex items-center justify-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">
                arrow_back
              </span>
              กลับสู่พอร์ทัลนักเรียน
            </Link>
          </div>
        </div>

        {/* System copyright */}
        <div className="mt-8 text-center">
          <p className="glass-panel inline-block px-4 py-2 rounded-xl text-xs font-medium text-cool-gray">
            สำหรับผู้ดูแลระบบเท่านั้น
          </p>
          <p className="mt-3 text-xs text-dark-slate/50">
            CD Voting 0 &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
