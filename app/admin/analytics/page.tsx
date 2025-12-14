"use client";

import { BottomNav } from "@/components/BottomNav";
import { useRouter } from "next/navigation";

export default function Analytics() {
  const router = useRouter();

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-sm pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors group"
          >
            <span className="material-symbols-outlined text-primary text-[24px]">
              arrow_back_ios_new
            </span>
            <span className="text-primary text-base ml-1 font-medium group-hover:underline decoration-primary/50">
              Back
            </span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] absolute left-1/2 -translate-x-1/2">
            Analytics
          </h2>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 px-4 py-6 space-y-8 animate-fade-in">
          {/* Participation Chart */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Participation
              </h3>
              <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                Final Count
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col items-center justify-center gap-6">
                <div className="relative flex items-center justify-center size-48">
                  <div
                    className="w-full h-full rounded-full shadow-inner transition-all duration-500"
                    style={{
                      background:
                        "conic-gradient(#137fec 0% 85%, #e2e8f0 85% 100%)",
                    }}
                  ></div>
                  <div className="absolute inset-4 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center shadow-sm">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                      85%
                    </span>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                      Turnout
                    </span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-2xl font-bold text-primary">425</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-1">
                      Votes Cast
                    </span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <span className="text-2xl font-bold text-slate-400 dark:text-slate-500">
                      500
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mt-1">
                      Total Voters
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Results List */}
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between px-1">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Student Council
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Presidential Election Results
                </p>
              </div>
              <span
                className="material-symbols-outlined text-slate-400"
                title="Poll Closed"
              >
                how_to_vote
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-6">
              {/* Winner */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div
                        className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-yellow-400"
                        style={{
                          backgroundImage:
                            'url("https://picsum.photos/seed/sarah/200/200")',
                        }}
                      ></div>
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 border-2 border-white dark:border-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[10px] font-bold">
                          emoji_events
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        Sarah Jenkins
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          WINNER
                        </span>
                      </p>
                      <p className="text-xs text-primary font-medium">
                        450 Votes
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    65%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full animate-slide-up"
                    style={{ width: "65%" }}
                  ></div>
                </div>
              </div>

              {/* Runner Up */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-600 grayscale opacity-80"
                      style={{
                        backgroundImage:
                          'url("https://picsum.photos/seed/michael/200/200")',
                      }}
                    ></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Mike Ross
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        180 Votes
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-500 dark:text-slate-400">
                    26%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full animate-slide-up"
                    style={{ width: "26%" }}
                  ></div>
                </div>
              </div>

              {/* Third Place */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center border border-slate-200 dark:border-slate-600 grayscale opacity-80"
                      style={{
                        backgroundImage:
                          'url("https://picsum.photos/seed/jessica/200/200")',
                      }}
                    ></div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Jessica Pearson
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        62 Votes
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-500 dark:text-slate-400">
                    9%
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/30 rounded-full animate-slide-up"
                    style={{ width: "9%" }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-4 flex justify-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">
                info
              </span>
              Results are certified by the Student Board.
            </p>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
