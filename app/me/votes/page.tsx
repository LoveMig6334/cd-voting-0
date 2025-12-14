"use client";

import { BottomNav } from "@/components/BottomNav";
import { useRouter } from "next/navigation";

export default function MyVotes() {
  const router = useRouter();

  return (
    <div className="bg-background-light dark:bg-background-dark text-[#111418] dark:text-white min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-xl pb-24">
        {/* Header */}
        <div className="flex items-center bg-white dark:bg-[#1a2632] p-4 pb-2 sticky top-0 z-10 shadow-sm dark:border-b dark:border-gray-800">
          <button
            onClick={() => router.back()}
            className="text-[#111418] dark:text-white flex size-12 shrink-0 items-center justify-start hover:opacity-70 transition-opacity"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            My Votes
          </h2>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-3 p-4 overflow-x-auto no-scrollbar bg-background-light dark:bg-background-dark sticky top-[60px] z-10">
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary px-5 shadow-sm transition-transform active:scale-95">
            <p className="text-white text-sm font-medium leading-normal">
              All Votes
            </p>
          </button>
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-gray-700 px-5 shadow-sm transition-transform active:scale-95">
            <p className="text-[#111418] dark:text-gray-300 text-sm font-medium leading-normal">
              Verified
            </p>
          </button>
          <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-gray-700 px-5 shadow-sm transition-transform active:scale-95">
            <p className="text-[#111418] dark:text-gray-300 text-sm font-medium leading-normal">
              Pending
            </p>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-8">
          {/* Card 1 */}
          <div className="flex flex-col rounded-lg bg-white dark:bg-[#1a2632] p-4 shadow-sm dark:shadow-none dark:border dark:border-gray-800">
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <div className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30">
                    <span
                      className="material-symbols-outlined mr-1"
                      style={{ fontSize: "14px" }}
                    >
                      check_circle
                    </span>
                    Verified
                  </div>
                </div>
                <h3 className="text-base font-bold leading-tight">
                  Student Council 2024
                </h3>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-normal leading-normal">
                  Oct 24, 2023 • 2:45 PM
                </p>
              </div>
              <div
                className="w-16 h-16 shrink-0 bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100 dark:border-gray-700"
                style={{
                  backgroundImage:
                    'url("https://picsum.photos/seed/college/200/200")',
                }}
              ></div>
            </div>
            <div className="mt-4">
              <button className="group flex w-full max-w-[240px] cursor-pointer items-center justify-between overflow-hidden rounded-md bg-[#f0f2f4] dark:bg-gray-800 px-3 py-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Token
                  </span>
                  <span className="truncate font-mono text-sm">
                    VOTE-9SG2-88XA
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform"
                  style={{ fontSize: "18px" }}
                >
                  content_copy
                </span>
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col rounded-lg bg-white dark:bg-[#1a2632] p-4 shadow-sm dark:shadow-none dark:border dark:border-gray-800">
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <div className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30">
                    <span
                      className="material-symbols-outlined mr-1"
                      style={{ fontSize: "14px" }}
                    >
                      check_circle
                    </span>
                    Verified
                  </div>
                </div>
                <h3 className="text-base font-bold leading-tight">
                  Annual Board Election
                </h3>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-normal leading-normal">
                  Nov 12, 2023 • 09:30 AM
                </p>
              </div>
              <div
                className="w-16 h-16 shrink-0 bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100 dark:border-gray-700"
                style={{
                  backgroundImage:
                    'url("https://picsum.photos/seed/board/200/200")',
                }}
              ></div>
            </div>
            <div className="mt-4">
              <button className="group flex w-full max-w-[240px] cursor-pointer items-center justify-between overflow-hidden rounded-md bg-[#f0f2f4] dark:bg-gray-800 px-3 py-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Token
                  </span>
                  <span className="truncate font-mono text-sm">
                    VOTE-882A-XYZ9
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform"
                  style={{ fontSize: "18px" }}
                >
                  content_copy
                </span>
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col rounded-lg bg-white dark:bg-[#1a2632] p-4 shadow-sm dark:shadow-none dark:border dark:border-gray-800">
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <div className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-500/30">
                    <span
                      className="material-symbols-outlined mr-1"
                      style={{ fontSize: "14px" }}
                    >
                      check_circle
                    </span>
                    Verified
                  </div>
                </div>
                <h3 className="text-base font-bold leading-tight">
                  Class Representative 2024
                </h3>
                <p className="text-[#617589] dark:text-gray-400 text-xs font-normal leading-normal">
                  Sep 05, 2023 • 11:15 AM
                </p>
              </div>
              <div
                className="w-16 h-16 shrink-0 bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100 dark:border-gray-700"
                style={{
                  backgroundImage:
                    'url("https://picsum.photos/seed/books/200/200")',
                }}
              ></div>
            </div>
            <div className="mt-4">
              <button className="group flex w-full max-w-[240px] cursor-pointer items-center justify-between overflow-hidden rounded-md bg-[#f0f2f4] dark:bg-gray-800 px-3 py-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Token
                  </span>
                  <span className="truncate font-mono text-sm">
                    VOTE-12B9-QQ2W
                  </span>
                </div>
                <span
                  className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform"
                  style={{ fontSize: "18px" }}
                >
                  content_copy
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
