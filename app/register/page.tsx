"use client";

import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col items-center pt-2 pb-6 px-4">
      <div className="w-full max-w-md flex items-center justify-between py-4 mb-2 z-10">
        <button
          onClick={() => router.back()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center pr-10">
          Register
        </h2>
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-white dark:bg-[#1c242f] rounded-2xl shadow-sm dark:shadow-none ring-1 ring-black/5 dark:ring-white/10 p-6 flex flex-col gap-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Scan Student ID
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Align your ID card within the frame to auto-fill your details
              instantly.
            </p>
          </div>

          <div
            onClick={() => router.push("/camera-overlay")}
            className="relative group cursor-pointer"
          >
            <div className="absolute -inset-1 bg-linear-to-r from-primary to-blue-400 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#151b23] px-6 py-10 hover:border-primary/50 dark:hover:border-primary/50 transition-colors">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
                <span className="material-symbols-outlined text-3xl">
                  photo_camera
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <p className="text-base font-bold">Tap to Scan</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Upload photo or open camera
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 opacity-50 pointer-events-none select-none">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Student ID
              </label>
              <div className="relative">
                <input
                  className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111920] p-3.5 pr-10 text-base"
                  placeholder="Waiting for scan..."
                  readOnly
                />
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                  badge
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <input
                  className="block w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111920] p-3.5 text-base"
                  placeholder="Waiting for scan..."
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-4">
            <button className="relative w-full overflow-hidden rounded-xl bg-primary px-4 py-3.5 text-white shadow-lg shadow-primary/25 hover:bg-primary-dark active:scale-[0.98] transition-all duration-200 opacity-50 cursor-not-allowed">
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-bold tracking-wide">
                Confirm & Create Account
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </span>
            </button>
            <button className="text-xs font-medium text-slate-400 hover:text-primary transition-colors text-center">
              Having trouble?{" "}
              <span className="underline decoration-slate-400/50">
                Enter details manually
              </span>
            </button>
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
