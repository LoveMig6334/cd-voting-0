"use client";

import { useRouter } from "next/navigation";

export default function VoteSuccess() {
  const router = useRouter();

  return (
    <div className="mesh-gradient-bg font-display text-dark-slate min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative flex w-full flex-col overflow-hidden max-w-md mx-auto glass-card rounded-2xl animate-scale-up border border-white/60 shadow-xl">
        {/* Header */}
        <header className="flex items-center justify-between p-4 pt-6 z-10"></header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8 -mt-4">
          <div className="mb-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-green-500/10 rounded-full blur-2xl animate-pulse"></div>
            <div className="relative bg-white/80 backdrop-blur-md p-6 rounded-full shadow-lg border-4 border-white ring-4 ring-green-500/10">
              <span
                className="material-symbols-outlined text-green-500 text-6xl font-bold"
                style={{ fontSize: "64px" }}
              >
                check_circle
              </span>
            </div>
          </div>

          <div className="text-center mb-10 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-dark-slate">
              Thank you for voting!
            </h1>
            <p className="text-cool-gray text-base leading-relaxed max-w-[280px] mx-auto">
              Your ballot has been securely recorded on the student council
              ledger.
            </p>
          </div>

          {/* Ticket */}
          <div className="w-full max-w-[340px] relative group perspective-1000">
            <div className="ticket-card border border-white/70 rounded-xl overflow-hidden relative shadow-md">
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-cool-gray tracking-widest uppercase">
                    Vote Token ID
                  </span>
                  <div className="flex items-center gap-2 group/token cursor-pointer active:scale-95 transition-transform">
                    <span className="font-mono text-2xl font-bold tracking-wider select-all text-dark-slate">
                      VOTE-9SG2-XQ11
                    </span>
                    <span className="material-symbols-outlined text-royal-blue text-sm opacity-60 group-hover/token:opacity-100 transition-opacity">
                      content_copy
                    </span>
                  </div>
                </div>

                {/* Divider with notches */}
                <div className="w-full relative h-px bg-transparent my-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-dashed border-gray-200"></div>
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background-light border-r border-gray-200"></div>
                  <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background-light border-l border-gray-200"></div>
                </div>

                <div className="text-center space-y-2 pt-1">
                  <p className="text-xs text-cool-gray leading-relaxed">
                    A confirmation email has been sent to{" "}
                    <span className="text-dark-slate font-medium">
                      student@school.edu
                    </span>
                    .
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full w-fit mx-auto border border-emerald-100 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[12px]">
                      verified_user
                    </span>
                    <span>CRYPTOGRAPHICALLY VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-2 inset-x-4 h-4 bg-white/40 backdrop-blur-sm rounded-b-xl -z-10 opacity-60 border border-white/50"></div>
          </div>

          <p className="mt-8 text-center text-xs text-cool-gray font-medium max-w-xs">
            Please save this token. It is the only way to verify your vote was
            counted correctly without revealing your identity.
          </p>
        </main>

        <footer className="p-6 pb-8 bg-white/50 backdrop-blur-md flex flex-col gap-3 border-t border-white/60">
          <button
            onClick={() => router.push("/")}
            className="w-full h-12 flex items-center justify-center gap-2 bg-royal-blue hover:bg-royal-blue/90 text-white font-bold rounded-xl shadow-lg shadow-royal-blue/20 transition-all active:scale-[0.98]"
          >
            <span>Back to Home</span>
          </button>
          <button className="w-full h-12 flex items-center justify-center gap-2 bg-white/80 border border-gray-200 hover:bg-gray-50 text-dark-slate font-bold rounded-xl transition-all active:scale-[0.98] shadow-sm">
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
