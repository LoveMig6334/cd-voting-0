"use client";

import { useRouter } from "next/navigation";

export default function VoteSuccess() {
  const router = useRouter();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative flex w-full flex-col overflow-hidden max-w-md mx-auto shadow-2xl bg-white dark:bg-background-dark rounded-2xl animate-scale-up">
        {/* Header */}
        <header className="flex items-center justify-between p-4 pt-6 z-10">
          <div className="w-8"></div>
          <h2 className="text-sm font-semibold tracking-widest uppercase text-gray-500 dark:text-gray-400">
            Election 2024
          </h2>
          <div className="w-8"></div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 -mt-4">
          <div className="mb-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative bg-background-light dark:bg-[#1e2832] p-6 rounded-full shadow-lg border-4 border-white dark:border-background-dark ring-4 ring-green-500/20">
              <span
                className="material-symbols-outlined text-green-500 text-6xl font-bold"
                style={{ fontSize: "64px" }}
              >
                check_circle
              </span>
            </div>
          </div>

          <div className="text-center mb-10 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Thank you for voting!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed max-w-[280px] mx-auto">
              Your ballot has been securely recorded on the student council
              ledger.
            </p>
          </div>

          {/* Ticket */}
          <div className="w-full max-w-[340px] relative group perspective-1000">
            <div className="bg-gray-50 dark:bg-[#1a232d] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden relative shadow-sm">
              <div className="h-2 bg-primary w-full"></div>
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-widest uppercase">
                    Vote Token ID
                  </span>
                  <div className="flex items-center gap-2 group/token cursor-pointer active:scale-95 transition-transform">
                    <span className="font-mono text-2xl font-bold tracking-wider select-all">
                      VOTE-9SG2-XQ11
                    </span>
                    <span className="material-symbols-outlined text-primary text-sm opacity-60 group-hover/token:opacity-100 transition-opacity">
                      content_copy
                    </span>
                  </div>
                </div>

                {/* Divider with notches */}
                <div className="w-full relative h-px bg-transparent my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-background-dark border-r border-gray-200 dark:border-gray-700"></div>
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-background-dark border-l border-gray-200 dark:border-gray-700"></div>
                </div>

                <div className="text-center space-y-2 pt-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    A confirmation email has been sent to{" "}
                    <span className="text-gray-900 dark:text-white font-medium">
                      student@school.edu
                    </span>
                    .
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full w-fit mx-auto">
                    <span className="material-symbols-outlined text-[12px]">
                      verified_user
                    </span>
                    <span>Cryptographically Verified</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 inset-x-4 h-4 bg-gray-200 dark:bg-gray-800 rounded-b-xl -z-10 opacity-60"></div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500 max-w-xs">
            Please save this token. It is the only way to verify your vote was
            counted correctly without revealing your identity.
          </p>
        </main>

        <footer className="p-6 pb-8 bg-white dark:bg-background-dark flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => router.push("/")}
            className="w-full h-12 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <span>Back to Home</span>
          </button>
          <button className="w-full h-12 flex items-center justify-center gap-2 bg-transparent border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg transition-all active:scale-[0.98]">
            <span className="material-symbols-outlined text-lg">
              screenshot_monitor
            </span>
            <span>Save Screenshot</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
