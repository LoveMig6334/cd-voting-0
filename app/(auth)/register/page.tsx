"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithData } = useAuth();

  const id = searchParams.get("studentId");
  const scannedName = searchParams.get("name");
  const scannedSurname = searchParams.get("surname");

  const [studentId, setStudentId] = useState(id || "");
  const [name, setName] = useState(scannedName || "");
  const [surname, setSurname] = useState(scannedSurname || "");
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Sync if search params change after initial load
    if (id && id !== studentId) setStudentId(id);
    if (scannedName && scannedName !== name) setName(scannedName);
    if (scannedSurname && scannedSurname !== surname)
      setSurname(scannedSurname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, scannedName, scannedSurname]);

  interface Student {
    classroom: string;
    no: number;
    id: number;
    name: string;
    surname: string;
  }

  const handleRegister = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/data.json");
      if (!res.ok) throw new Error("Failed to load student data");
      const students: Student[] = await res.json();

      const found = students.find(
        (s) =>
          String(s.id) === studentId.trim() &&
          s.name.trim() === name.trim() &&
          s.surname.trim() === surname.trim()
      );

      if (found) {
        // Success -> Auto Login
        loginWithData(found);
      } else {
        setError(
          "Student not found or details mismatch. Please check your inputs."
        );
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during validation.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    studentId.length > 0 && name.length > 0 && surname.length > 0;

  return (
    <div className="min-h-screen bg-background-light text-slate-900 flex flex-col items-center pt-2 pb-6 px-4">
      <div className="w-full max-w-md flex items-center justify-between py-4 mb-2 z-10">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-10">
          Register
        </h2>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 p-6 flex flex-col gap-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Scan Student ID
            </h1>
            <p className="text-slate-500 text-sm">
              Align your ID card within the frame to auto-fill your details
              instantly.
            </p>
          </div>

          <div
            onClick={() => router.push("/camera-overlay")}
            className="relative group cursor-pointer"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-primary to-blue-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 hover:border-primary/50 transition-colors">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
                <span className="material-symbols-outlined text-3xl">
                  photo_camera
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-base font-bold">Tap to Scan</p>
                <p className="text-slate-500 text-sm">
                  Upload photo or open camera
                </p>
              </div>
            </div>
          </div>

          <div
            className={`space-y-5 transition-opacity duration-300 ${
              !isManual && !studentId
                ? "opacity-50 pointer-events-none"
                : "opacity-100"
            }`}
          >
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-500">
                Student ID
              </label>
              <div className="relative">
                <input
                  className={`block w-full rounded-lg border-slate-200 bg-slate-50 p-3.5 pr-10 text-base focus:bg-white focus:border-primary focus:ring-primary ${
                    isManual ? "" : "read-only:bg-slate-100"
                  }`}
                  placeholder="Waiting for scan..."
                  value={studentId}
                  readOnly={!isManual}
                  onChange={(e) => setStudentId(e.target.value)}
                />
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  badge
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-500">Name</label>
              <div className="relative">
                <input
                  className={`block w-full rounded-lg border-slate-200 bg-slate-50 p-3.5 text-base focus:bg-white focus:border-primary focus:ring-primary ${
                    isManual ? "" : "read-only:bg-slate-100"
                  }`}
                  placeholder="Waiting for scan..."
                  value={name}
                  readOnly={!isManual}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-500">
                Surname
              </label>
              <div className="relative">
                <input
                  className={`block w-full rounded-lg border-slate-200 bg-slate-50 p-3.5 text-base focus:bg-white focus:border-primary focus:ring-primary ${
                    isManual ? "" : "read-only:bg-slate-100"
                  }`}
                  placeholder="Surname"
                  value={surname}
                  readOnly={!isManual}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <button
              onClick={handleRegister}
              disabled={!isFormValid || loading}
              className="relative w-full overflow-hidden rounded-xl bg-primary px-4 py-3.5 text-white shadow-lg shadow-primary/25 hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-bold tracking-wide">
                {loading ? "Verifying..." : "Confirm & Create Account"}
                {!loading && (
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                )}
              </span>
            </button>

            {!isManual && (
              <button
                onClick={() => setIsManual(true)}
                className="text-xs font-medium text-slate-400 hover:text-primary transition-colors text-center"
              >
                Having trouble?{" "}
                <span className="underline decoration-yellow-600 text-yellow-500">
                  Enter details manually
                </span>
              </button>
            )}
            {isManual && (
              <button
                onClick={() => setIsManual(false)}
                className="text-xs font-medium text-slate-400 hover:text-primary transition-colors text-center"
              >
                Return to Scan Mode
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 px-8">
          By creating an account, you agree to our{" "}
          <a className="text-primary hover:underline" href="#">
            Terms of Service
          </a>{" "}
          and{" "}
          <a className="text-primary hover:underline" href="#">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
