"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function Profile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="bg-background-light text-slate-900 min-h-screen font-display">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden pb-24 max-w-md mx-auto">
        <div className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-50 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="text-slate-900 flex size-12 shrink-0 items-center justify-center cursor-pointer hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            Profile
          </h2>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-6 animate-fade-in">
          <div className="flex w-full flex-col gap-4 items-center mt-4">
            <div className="flex gap-3 flex-col items-center">
              <div className="relative">
                <div
                  className="bg-center bg-no-repeat bg-cover rounded-full h-28 w-28 border-4 border-white shadow-lg"
                  style={{
                    backgroundImage:
                      'url("https://picsum.photos/seed/alex/200/200")',
                  }}
                ></div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-slate-900 text-xl font-bold leading-tight tracking-[-0.015em] text-center">
                  {user ? `${user.name} ${user.surname}` : "Guest user"}
                </p>
                <p className="text-slate-500 text-sm font-medium leading-normal text-center mt-1">
                  Student ID: {user?.id}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full mx-auto">
            <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <button className="w-full flex items-center gap-4 px-4 py-4 justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                    <span className="material-symbols-outlined">
                      notifications
                    </span>
                  </div>
                  <p className="text-slate-900 text-base font-medium leading-normal flex-1 truncate text-left">
                    Notification Settings
                  </p>
                </div>
                <div className="shrink-0 text-gray-400">
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </div>
              </button>
              <button className="w-full flex items-center gap-4 px-4 py-4 justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                    <span className="material-symbols-outlined">help</span>
                  </div>
                  <p className="text-slate-900 text-base font-medium leading-normal flex-1 truncate text-left">
                    Help & Support
                  </p>
                </div>
                <div className="shrink-0 text-gray-400">
                  <span className="material-symbols-outlined">
                    chevron_right
                  </span>
                </div>
              </button>
            </div>

            <button
              onClick={() => logout()}
              className="bg-white w-full py-4 rounded-xl shadow-sm border border-gray-100 text-red-600 font-bold text-base hover:bg-red-50 transition-colors flex items-center justify-center gap-2 mt-4"
            >
              <span className="material-symbols-outlined">logout</span>
              Log Out
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
              App Version 1.0.4 (Build 202)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
