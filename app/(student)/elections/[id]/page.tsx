"use client";

import { BottomNav } from "@/components/BottomNav";
import { Candidate } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const candidatesData: Record<string, Candidate[]> = {
  "student-council": [
    {
      id: "1",
      name: "Sarah Jenkins",
      slogan:
        "Fostering a united campus community through inclusive events and transparent leadership.",
      imageUrl: "https://picsum.photos/seed/sarah/200/200",
      rank: 1,
    },
    {
      id: "2",
      name: "Michael Chen",
      slogan:
        "Driving innovation in student resources and enhancing academic support systems.",
      imageUrl: "https://picsum.photos/seed/michael/200/200",
      rank: 2,
    },
    {
      id: "3",
      name: "Jessica Alvarez",
      slogan:
        "Building bridges between student groups and administration for real change.",
      imageUrl: "https://picsum.photos/seed/jessica/200/200",
      rank: 3,
    },
  ],
  "music-president": [
    {
      id: "4",
      name: "Sarah Jenkins",
      slogan:
        "More practice rooms, new instrument rentals, and quarterly student showcases.",
      imageUrl: "https://picsum.photos/seed/sarah/200/200",
      rank: 1,
    },
    {
      id: "5",
      name: "Michael Chen",
      slogan:
        "Digital music production workshops and upgrading the auditorium sound system.",
      imageUrl: "https://picsum.photos/seed/michael2/200/200",
      rank: 2,
    },
  ],
};

export default function CandidateSelection() {
  const params = useParams();
  const electionId = params.id as string;
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const candidates = electionId ? candidatesData[electionId] : [];
  // Fallback if no data found
  if (!candidates && electionId) {
    // In a real app we might fetch or show 404
    // For prototype, let's just show empty or default
  }

  const title =
    electionId === "student-council" ? "Student President" : "Music President";
  const subtitle =
    electionId === "student-council"
      ? "Select one candidate"
      : "Select one candidate to continue";

  const handleVoteClick = (id: string) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const handleConfirmVote = () => {
    router.push("/vote-success");
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white flex flex-col">
      <header className="sticky top-0 z-10 flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push("/")}
          className="flex size-12 shrink-0 items-center justify-start hover:opacity-70"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center">
          Student Council
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-end">
          <span className="material-symbols-outlined">more_vert</span>
        </div>
      </header>

      {/* Countdown Timer (Visual Only) */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 px-4">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
          Voting closes in
        </p>
        <div className="flex gap-3 w-full max-w-sm justify-center">
          {["02", "14", "32", "15"].map((val, i) => (
            <div
              key={i}
              className="flex grow basis-0 flex-col items-center gap-2"
            >
              <div
                className={`flex h-12 w-full items-center justify-center rounded-lg ${
                  i === 2
                    ? "bg-primary/20 border border-primary/30 text-primary"
                    : "bg-slate-200 dark:bg-[#1e293b] text-slate-900 dark:text-white"
                }`}
              >
                <p className="text-xl font-bold">{val}</p>
              </div>
              <p
                className={`${
                  i === 2
                    ? "text-primary"
                    : "text-slate-500 dark:text-slate-400"
                } text-xs`}
              >
                {["Days", "Hours", "Mins", "Secs"][i]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 pb-32 space-y-8 max-w-md mx-auto w-full">
        <div>
          <div className="mb-4 pl-1">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          <div
            className={`grid grid-cols-1 ${
              candidates && candidates.length > 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-2"
            } gap-4`}
          >
            {candidates &&
              candidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="relative flex flex-col rounded-xl bg-white dark:bg-[#16202a] p-5 gap-4 shadow-sm border border-slate-200 dark:border-slate-800 transition-all"
                >
                  {selectedId === candidate.id && (
                    <div className="absolute top-4 right-4 z-20">
                      <div className="bg-primary text-white rounded-full p-1 shadow-sm animate-fade-in">
                        <span className="material-symbols-outlined text-sm font-bold block">
                          check
                        </span>
                      </div>
                    </div>
                  )}
                  <div
                    className={`absolute inset-0 rounded-xl border-2 border-primary transition-opacity pointer-events-none ${
                      selectedId === candidate.id ? "opacity-100" : "opacity-0"
                    }`}
                  ></div>

                  <div className="flex flex-col items-center gap-3 pt-2">
                    <div className="relative">
                      <div
                        className="h-28 w-28 rounded-full bg-cover bg-center shadow-md border-4 border-slate-50 dark:border-slate-700"
                        style={{
                          backgroundImage: `url(${candidate.imageUrl})`,
                        }}
                      ></div>
                      <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100 rounded-lg px-2 py-0.5 text-lg font-bold border border-amber-200 dark:border-amber-800 shadow-sm">
                          #{candidate.rank}
                        </span>
                      </div>
                    </div>
                    <div className="text-center mt-2 w-full">
                      <h3 className="text-xl font-bold leading-tight">
                        {candidate.name}
                      </h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm font-normal leading-relaxed text-center line-clamp-3 px-2">
                      &quot;{candidate.slogan}&quot;
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 mt-auto pt-2 z-20">
                    <button className="flex w-full items-center justify-center rounded-full h-11 px-4 bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      View Policy
                    </button>
                    <button
                      onClick={() => handleVoteClick(candidate.id)}
                      className={`flex w-full items-center justify-center rounded-full h-11 px-4 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] ${
                        selectedId === candidate.id
                          ? "bg-blue-700"
                          : "bg-primary hover:bg-blue-600"
                      }`}
                    >
                      Vote
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </main>

      {/* Floating Action for Next if Student Council, else just padding */}
      {electionId === "student-council" && (
        <div className="fixed bottom-16 left-0 w-full px-4 pb-4 z-20 bg-linear-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark pt-8 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => router.push("/election/music-president")}
              className="flex w-full items-center justify-center rounded-xl h-14 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-lg font-bold shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all active:scale-[0.98] gap-2"
            >
              Next Position
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background-dark/60 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-[360px] bg-white dark:bg-[#1a2632] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
            <div className="flex justify-center pt-8 pb-2">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500">
                <span className="material-symbols-outlined text-[32px]">
                  lock
                </span>
              </div>
            </div>
            <div className="px-6 pb-2">
              <h2 className="text-[#111418] dark:text-white tracking-tight text-2xl font-bold leading-tight text-center pb-3 pt-2">
                Confirm Your Vote
              </h2>
              <p className="text-[#617589] dark:text-gray-400 text-sm font-normal leading-normal text-center">
                You are about to vote for{" "}
                <strong className="text-[#111418] dark:text-white font-semibold">
                  {candidates
                    ? candidates.find((c) => c.id === selectedId)?.name
                    : ""}
                </strong>
                . This action cannot be undone once submitted.
              </p>
            </div>
            <div className="px-6 py-4">
              <label className="flex flex-col w-full">
                <p className="text-[#111418] dark:text-white text-sm font-medium leading-normal pb-2">
                  Student ID Verification
                </p>
                <div className="flex w-full items-stretch rounded-xl shadow-sm">
                  <input
                    autoFocus
                    className="flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-[#dbe0e6] dark:border-gray-600 bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 focus:border-primary h-12 placeholder:text-[#9aabb8] p-[15px] text-base font-normal leading-normal transition-all"
                    placeholder="Enter your Student ID"
                    type="text"
                  />
                </div>
              </label>
            </div>
            <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
              <button
                onClick={handleConfirmVote}
                className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-primary hover:bg-primary-dark transition-colors text-white text-base font-bold leading-normal shadow-md shadow-primary/20"
              >
                <span className="truncate">Confirm & Submit Vote</span>
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex w-full cursor-pointer items-center justify-center rounded-xl h-10 px-5 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 text-[#617589] dark:text-gray-400 text-sm font-semibold leading-normal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
      <div className="h-20"></div>
    </div>
  );
}
