"use client";

import { BottomNav } from "@/components/BottomNav";
import { Candidate } from "@/types";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

// Define all positions in the student council
const positions = [
  {
    id: "student-council-president",
    title: "ประธานสภานักเรียน",
    icon: "person",
  },
  {
    id: "vice-student-president",
    title: "รองประธานสภานักเรียน",
    icon: "supervisor_account",
  },
  { id: "secretary", title: "เลขานุการ", icon: "edit_note" },
  { id: "treasurer", title: "เหรัญญิก", icon: "payments" },
  {
    id: "public-relations-officer",
    title: "ประชาสัมพันธ์",
    icon: "campaign",
  },
  { id: "music-president", title: "ประธานชมรมดนตรี", icon: "music_note" },
  { id: "sports-president", title: "ประธานชมรมกีฬา", icon: "sports_soccer" },
  {
    id: "cheerleading-president",
    title: "ประธานเชียร์",
    icon: "celebration",
  },
  { id: "discipline-president", title: "ประธานระเบียบ", icon: "gavel" },
];

// Sample candidates for each position
const candidatesData: Record<string, Candidate[]> = {
  "student-council-president": [
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
  "vice-student-president": [
    {
      id: "4",
      name: "David Kim",
      slogan:
        "Supporting student initiatives and ensuring effective communication between departments.",
      imageUrl: "https://picsum.photos/seed/david/200/200",
      rank: 1,
    },
    {
      id: "5",
      name: "Emily Rodriguez",
      slogan:
        "Creating a bridge between students and leadership for better representation.",
      imageUrl: "https://picsum.photos/seed/emily/200/200",
      rank: 2,
    },
  ],
  secretary: [
    {
      id: "6",
      name: "Anna Thompson",
      slogan:
        "Organized records and transparent communication for all student activities.",
      imageUrl: "https://picsum.photos/seed/anna/200/200",
      rank: 1,
    },
    {
      id: "7",
      name: "James Wilson",
      slogan:
        "Efficient documentation and timely updates for the student body.",
      imageUrl: "https://picsum.photos/seed/james/200/200",
      rank: 2,
    },
  ],
  treasurer: [
    {
      id: "8",
      name: "Robert Martinez",
      slogan:
        "Responsible budget management and transparent financial reporting.",
      imageUrl: "https://picsum.photos/seed/robert/200/200",
      rank: 1,
    },
    {
      id: "9",
      name: "Lisa Park",
      slogan:
        "Maximizing student funds for impactful campus events and programs.",
      imageUrl: "https://picsum.photos/seed/lisa/200/200",
      rank: 2,
    },
  ],
  "public-relations-officer": [
    {
      id: "10",
      name: "Kevin Brown",
      slogan:
        "Amplifying student voices through effective media and outreach strategies.",
      imageUrl: "https://picsum.photos/seed/kevin/200/200",
      rank: 1,
    },
    {
      id: "11",
      name: "Michelle Lee",
      slogan:
        "Building our school's reputation through positive community engagement.",
      imageUrl: "https://picsum.photos/seed/michelle/200/200",
      rank: 2,
    },
  ],
  "music-president": [
    {
      id: "12",
      name: "Daniel Harris",
      slogan:
        "More practice rooms, new instrument rentals, and quarterly student showcases.",
      imageUrl: "https://picsum.photos/seed/daniel/200/200",
      rank: 1,
    },
    {
      id: "13",
      name: "Sophia Clark",
      slogan:
        "Digital music production workshops and upgrading the auditorium sound system.",
      imageUrl: "https://picsum.photos/seed/sophia/200/200",
      rank: 2,
    },
  ],
  "sports-president": [
    {
      id: "14",
      name: "Tyler Johnson",
      slogan:
        "Expanding intramural programs and improving sports facilities for all students.",
      imageUrl: "https://picsum.photos/seed/tyler/200/200",
      rank: 1,
    },
    {
      id: "15",
      name: "Amanda White",
      slogan:
        "Promoting fitness and teamwork through inclusive athletic programs.",
      imageUrl: "https://picsum.photos/seed/amanda/200/200",
      rank: 2,
    },
  ],
  "cheerleading-president": [
    {
      id: "16",
      name: "Brittany Adams",
      slogan:
        "Boosting school spirit and creating memorable pep rallies and events.",
      imageUrl: "https://picsum.photos/seed/brittany/200/200",
      rank: 1,
    },
    {
      id: "17",
      name: "Nicole Garcia",
      slogan:
        "Uniting the student body through enthusiasm and positive energy.",
      imageUrl: "https://picsum.photos/seed/nicole/200/200",
      rank: 2,
    },
  ],
  "discipline-president": [
    {
      id: "18",
      name: "Marcus Taylor",
      slogan: "Fair enforcement of rules while advocating for student rights.",
      imageUrl: "https://picsum.photos/seed/marcus/200/200",
      rank: 1,
    },
    {
      id: "19",
      name: "Rachel Scott",
      slogan:
        "Creating a safe and respectful environment for everyone on campus.",
      imageUrl: "https://picsum.photos/seed/rachel/200/200",
      rank: 2,
    },
  ],
};

export default function CandidateSelection() {
  const params = useParams();
  const electionId = params.id as string;
  const router = useRouter();

  // Track current position index
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);

  // Track votes for each position: { positionId: candidateId }
  const [votes, setVotes] = useState<Record<string, string>>({});

  const currentPosition = positions[currentPositionIndex];
  const candidates = candidatesData[currentPosition.id] || [];
  const selectedCandidateId = votes[currentPosition.id] || null;
  const hasVoted = !!selectedCandidateId;

  const handleVoteToggle = (candidateId: string) => {
    setVotes((prev) => {
      const currentVote = prev[currentPosition.id];
      if (currentVote === candidateId) {
        // Unvote - remove the vote
        const { [currentPosition.id]: _, ...rest } = prev;
        return rest;
      } else {
        // Vote for this candidate
        return { ...prev, [currentPosition.id]: candidateId };
      }
    });
  };

  const handleNext = () => {
    if (currentPositionIndex < positions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
    } else {
      // Last position, go to success page
      router.push("/vote-success");
    }
  };

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Light mode header */}
      <header className="sticky top-0 z-10 flex items-center bg-white p-4 pb-2 justify-between border-b border-gray-200">
        <button
          onClick={() => router.push("/")}
          className="flex size-12 shrink-0 items-center justify-start hover:opacity-70"
        >
          <span className="material-symbols-outlined text-slate-700">
            arrow_back
          </span>
        </button>
        <h2 className="text-lg font-bold leading-tight flex-1 text-center text-slate-900">
          สภานักเรียน
        </h2>
        <div className="flex size-12 shrink-0 items-center justify-end">
          <span className="material-symbols-outlined text-slate-700">
            more_vert
          </span>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>
            ตำแหน่งที่ {currentPositionIndex + 1} จาก {positions.length}
          </span>
          <span>
            {Math.round(
              ((currentPositionIndex + (hasVoted ? 1 : 0)) / positions.length) *
                100
            )}
            % เสร็จสิ้น
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                ((currentPositionIndex + (hasVoted ? 1 : 0)) /
                  positions.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      {/* Countdown Timer (Visual Only) */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 px-4">
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">
          ปิดรับคะแนนในอีก
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
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <p className="text-xl font-bold">{val}</p>
              </div>
              <p
                className={`${
                  i === 2 ? "text-primary" : "text-slate-500"
                } text-xs`}
              >
                {["วัน", "ชม.", "นาที", "วินาที"][i]}
              </p>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 p-4 pb-40 space-y-8 max-w-md mx-auto w-full">
        {/* Position Title - Centered with Icon */}
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
            <span className="material-symbols-outlined text-[32px]">
              {currentPosition.icon}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900">
            {currentPosition.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            เลือกผู้สมัคร 1 คนเพื่อลงคะแนน
          </p>
        </div>

        {/* Candidates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {candidates.map((candidate, index) => {
            const isSelected = selectedCandidateId === candidate.id;
            const isLastAndOdd =
              index === candidates.length - 1 && candidates.length % 2 === 1;
            return (
              <article
                key={candidate.id}
                className={`relative flex flex-col rounded-xl bg-white p-5 gap-4 shadow-sm transition-all ${
                  isSelected
                    ? "border-2 border-primary ring-2 ring-primary/20"
                    : "border border-slate-200"
                } ${
                  isLastAndOdd
                    ? "sm:col-span-2 sm:max-w-[50%] sm:justify-self-center"
                    : ""
                }`}
              >
                {isSelected && (
                  <div className="absolute top-4 right-4 z-20">
                    <div className="bg-primary text-white rounded-full p-1 shadow-sm animate-fade-in">
                      <span className="material-symbols-outlined text-sm font-bold block">
                        check
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center gap-3 pt-2">
                  <div className="relative">
                    <div
                      className="h-28 w-28 rounded-full bg-cover bg-center shadow-md border-4 border-slate-50"
                      style={{
                        backgroundImage: `url(${candidate.imageUrl})`,
                      }}
                    ></div>
                    <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                      <span className="bg-amber-100 text-amber-700 rounded-lg px-2 py-0.5 text-lg font-bold border border-amber-200 shadow-sm">
                        #{candidate.rank}
                      </span>
                    </div>
                  </div>
                  <div className="text-center mt-2 w-full">
                    <h3 className="text-xl font-bold leading-tight text-slate-900">
                      {candidate.name}
                    </h3>
                  </div>
                  <p className="text-slate-600 text-sm font-normal leading-relaxed text-center line-clamp-3 px-2">
                    &quot;{candidate.slogan}&quot;
                  </p>
                </div>
                <div className="flex flex-col gap-3 mt-auto pt-2 z-20">
                  <button className="flex w-full items-center justify-center rounded-full h-11 px-4 bg-transparent border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors">
                    ดูนโยบาย
                  </button>
                  <button
                    onClick={() => handleVoteToggle(candidate.id)}
                    className={`flex w-full items-center justify-center rounded-full h-11 px-4 text-sm font-bold shadow-md transition-all active:scale-[0.98] ${
                      isSelected
                        ? "bg-accent-yellow text-slate-900 shadow-yellow-500/20"
                        : "bg-primary hover:bg-blue-600 text-white shadow-blue-500/20"
                    }`}
                  >
                    {isSelected ? "ลงคะแนนแล้ว" : "ลงคะแนน"}
                  </button>
                </div>
              </article>
            );
          })}

          {/* Abstain Option */}
          <article
            className={`relative flex flex-col rounded-xl bg-white p-5 gap-4 shadow-sm transition-all sm:col-span-2 sm:max-w-[280px] sm:justify-self-center ${
              selectedCandidateId === "abstain"
                ? "border-2 border-slate-500 ring-2 ring-slate-500/20"
                : "border border-slate-200"
            }`}
          >
            {selectedCandidateId === "abstain" && (
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-slate-500 text-white rounded-full p-1 shadow-sm animate-fade-in">
                  <span className="material-symbols-outlined text-sm font-bold block">
                    check
                  </span>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[40px] text-slate-400">
                  do_not_disturb
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-700">
                ไม่ลงคะแนนเสียง
              </h3>
              <p className="text-slate-500 text-sm text-center">
                เลือกหากไม่ต้องการลงคะแนนให้ผู้สมัครคนใด
              </p>
            </div>
            <button
              onClick={() => handleVoteToggle("abstain")}
              className={`flex w-full items-center justify-center rounded-full h-11 px-4 text-sm font-bold shadow-md transition-all active:scale-[0.98] ${
                selectedCandidateId === "abstain"
                  ? "bg-slate-600 text-white shadow-slate-500/20"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              {selectedCandidateId === "abstain" ? "เลือกแล้ว" : "เลือก"}
            </button>
          </article>
        </div>
      </main>

      {/* Navigation Buttons */}
      <div className="fixed bottom-16 left-0 w-full px-4 pb-4 z-20 bg-linear-to-t from-white via-white to-transparent pt-8 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto flex gap-3">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentPositionIndex === 0}
            className={`flex items-center justify-center rounded-xl h-14 px-6 text-lg font-bold shadow-lg transition-all active:scale-[0.98] gap-2 ${
              currentPositionIndex === 0
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-slate-100 hover:bg-slate-200 text-slate-900"
            }`}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={!hasVoted}
            className={`flex flex-1 items-center justify-center rounded-xl h-14 px-6 text-lg font-bold shadow-lg transition-all active:scale-[0.98] gap-2 ${
              hasVoted
                ? "bg-slate-900 text-white hover:shadow-xl"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {currentPositionIndex === positions.length - 1
              ? "ส่งคะแนนทั้งหมด"
              : "ตำแหน่งถัดไป"}
            <span className="material-symbols-outlined">
              {currentPositionIndex === positions.length - 1
                ? "check_circle"
                : "arrow_forward"}
            </span>
          </button>
        </div>
      </div>

      <BottomNav />
      <div className="h-20"></div>
    </div>
  );
}
