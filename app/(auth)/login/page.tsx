"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Student {
  classroom: string;
  no: number;
  id: number;
  name: string;
  surname: string;
  nationalId: string;
}

export default function Login() {
  const router = useRouter();
  const { loginWithData } = useAuth();

  const [studentId, setStudentId] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/data.json");
      if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลนักเรียนได้");
      const students: Student[] = await res.json();

      const found = students.find(
        (s) =>
          String(s.id) === studentId.trim() &&
          s.nationalId === nationalId.trim() &&
          s.name.trim() === name.trim() &&
          s.surname.trim() === surname.trim()
      );

      if (found) {
        // Success -> Login
        loginWithData(found);
      } else {
        setError("ไม่พบนักเรียนหรือข้อมูลไม่ตรงกัน กรุณาตรวจสอบข้อมูลอีกครั้ง");
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดระหว่างการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    studentId.length > 0 &&
    nationalId.length === 13 &&
    name.length > 0 &&
    surname.length > 0;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light text-slate-900 font-display">
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
        <div className="flex flex-col items-center text-center gap-4 mb-8 animate-fade-in">
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
            <h1 className="text-yellow-400 text-5xl font-black tracking-tight drop-shadow-sm leading-tight">
              CD
            </h1>
            <h1 className="text-blue-600 text-5xl font-black tracking-tight drop-shadow-sm leading-tight">
              VOTING
            </h1>
            <h1 className="text-gray-600 text-5xl font-black tracking-tight drop-shadow-sm leading-tight">
              0
            </h1>
          </div>
          <p className="text-lg font-medium text-slate-500 tracking-wide">
            ระบบเลือกตั้งโรงเรียนยุคใหม่
          </p>
        </div>

        {/* Login Form */}
        <div
          className="w-full animate-slide-up"
          style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
        >
          <div
            className="rounded-2xl p-6 shadow-lg"
            style={{
              background: "rgba(255, 255, 255, 0.8)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.9)",
            }}
          >
            <div className="flex flex-col gap-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-500">
                  รหัสนักเรียน
                </label>
                <div className="relative">
                  <input
                    className="block w-full rounded-lg border-slate-200 bg-white/70 p-3.5 pr-10 text-base focus:bg-white focus:border-primary focus:ring-primary transition-colors"
                    placeholder="กรอกรหัสนักเรียน"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    badge
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-500">
                  เลขประจำตัวประชาชน
                </label>
                <div className="relative">
                  <input
                    className="block w-full rounded-lg border-slate-200 bg-white/70 p-3.5 pr-10 text-base focus:bg-white focus:border-primary focus:ring-primary transition-colors"
                    placeholder="เลขประจำตัวประชาชน 13 หลัก"
                    value={nationalId}
                    maxLength={13}
                    onChange={(e) =>
                      setNationalId(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    id_card
                  </span>
                </div>
                {nationalId.length > 0 && nationalId.length < 13 && (
                  <p className="text-xs text-amber-500">
                    ต้องการอีก {13 - nationalId.length} หลัก
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-500">
                  ชื่อ
                </label>
                <div className="relative">
                  <input
                    className="block w-full rounded-lg border-slate-200 bg-white/70 p-3.5 pr-10 text-base focus:bg-white focus:border-primary focus:ring-primary transition-colors"
                    placeholder="กรอกชื่อของคุณ"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    person
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-500">
                  นามสกุล
                </label>
                <div className="relative">
                  <input
                    className="block w-full rounded-lg border-slate-200 bg-white/70 p-3.5 pr-10 text-base focus:bg-white focus:border-primary focus:ring-primary transition-colors"
                    placeholder="กรอกนามสกุลของคุณ"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    person
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={!isFormValid || loading}
                className="relative w-full group flex items-center justify-center gap-3 bg-primary hover:bg-primary-dark text-white h-14 rounded-xl px-6 transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg mt-2"
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
                <span className="text-base font-bold tracking-tight">
                  {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </span>
                {!loading && (
                  <span className="material-symbols-outlined text-[20px]">
                    arrow_forward
                  </span>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4 px-4">
            บัญชีของคุณถูกตั้งค่าไว้ล่วงหน้าโดยฝ่ายบริหารโรงเรียน
          </p>
        </div>
      </main>

      <footer
        className="relative z-10 flex flex-col gap-6 px-5 pb-8 pt-4 text-center w-full animate-fade-in"
        style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
      >
        <div className="flex items-center justify-center gap-6">
          <button className="text-slate-500 hover:text-primary text-sm font-medium transition-colors">
            ศูนย์ช่วยเหลือ
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => router.push("/admin/login")}
            className="text-slate-500 hover:text-primary text-sm font-medium transition-colors"
          >
            เข้าสู่ระบบผู้ดูแล
          </button>
        </div>
        <p className="text-slate-400 text-xs font-normal">CD Voting 0 © 2026</p>
      </footer>
    </div>
  );
}
