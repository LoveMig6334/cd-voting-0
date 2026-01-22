"use client";

import { ElectionWithDetails } from "@/lib/actions/elections";
import { castVote, VoteChoice } from "@/lib/actions/votes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useStudentUser } from "../../StudentLayoutClient";

interface VotingClientProps {
  election: ElectionWithDetails;
}

export function VotingClient({ election }: VotingClientProps) {
  const router = useRouter();
  const user = useStudentUser();
  const [isPending, startTransition] = useTransition();

  // Track current position index
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);

  // Track votes for each position: { positionId: candidateId }
  const [votes, setVotes] = useState<Record<string, number | null>>({});

  // Confirmation modal and loading states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmStudentId, setConfirmStudentId] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get enabled positions only
  const enabledPositions = election.positions.filter((p) => p.enabled);

  // No positions available
  if (enabledPositions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
          category
        </span>
        <h2 className="text-xl font-bold text-slate-900">
          ไม่มีตำแหน่งที่เปิดให้เลือก
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          กรุณารอจนกว่าจะมีการเปิดตำแหน่ง
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  const currentPosition = enabledPositions[currentPositionIndex];
  const candidates = election.candidates.filter(
    (c) => c.position_id === currentPosition.id,
  );
  const selectedCandidateId = votes[currentPosition.id];
  const hasVoted = selectedCandidateId !== undefined;
  const isLastPosition = currentPositionIndex === enabledPositions.length - 1;

  const handleVoteToggle = (candidateId: number | null) => {
    setVotes((prev) => {
      const currentVote = prev[currentPosition.id];
      if (currentVote === candidateId) {
        // Unvote
        const { [currentPosition.id]: _, ...rest } = prev;
        return rest;
      } else {
        // Vote (null = abstain)
        return { ...prev, [currentPosition.id]: candidateId };
      }
    });
  };

  const handleNext = () => {
    if (currentPositionIndex < enabledPositions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handlePrevious = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
    }
  };

  const handleConfirmVote = async () => {
    if (!user) {
      setConfirmError("ไม่พบข้อมูลผู้ใช้");
      return;
    }

    if (confirmStudentId.trim() !== String(user.id)) {
      setConfirmError("เลขประจำตัวนักเรียนไม่ถูกต้อง");
      return;
    }

    setShowConfirmModal(false);
    setIsSubmitting(true);

    // Build vote choices
    const choices: VoteChoice[] = enabledPositions.map((pos) => ({
      positionId: pos.id,
      candidateId: votes[pos.id] ?? null,
    }));

    startTransition(async () => {
      const result = await castVote(election.id, choices);

      if (result.success) {
        router.push(`/vote-success?token=${result.token}`);
      } else {
        setIsSubmitting(false);
        setConfirmError(result.message);
        setShowConfirmModal(true);
      }
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Header */}
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
          {election.title}
        </h2>
        <div className="size-12" />
      </header>

      {/* Progress indicator */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>
            ตำแหน่งที่ {currentPositionIndex + 1} จาก {enabledPositions.length}
          </span>
          <span>
            {Math.round(
              ((currentPositionIndex + (hasVoted ? 1 : 0)) /
                enabledPositions.length) *
                100,
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
                  enabledPositions.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>

      <main className="flex-1 p-4 pb-40 space-y-8 max-w-md mx-auto w-full">
        {/* Position Title */}
        <div className="flex flex-col items-center justify-center text-center py-4">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 text-primary mb-4">
            <span className="material-symbols-outlined text-[32px]">
              {currentPosition.icon || "person"}
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
        {candidates.length > 0 ? (
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
                        className="h-28 w-28 rounded-full bg-cover bg-center shadow-md border-4 border-slate-50 bg-slate-200"
                        style={{
                          backgroundImage: candidate.image_url
                            ? `url(${candidate.image_url})`
                            : undefined,
                        }}
                      >
                        {!candidate.image_url && (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-slate-400">
                              person
                            </span>
                          </div>
                        )}
                      </div>
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
                      &quot;{candidate.slogan || "ไม่มีคำขวัญ"}&quot;
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 mt-auto pt-2 z-20">
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
                selectedCandidateId === null && hasVoted
                  ? "border-2 border-slate-500 ring-2 ring-slate-500/20"
                  : "border border-slate-200"
              }`}
            >
              {selectedCandidateId === null && hasVoted && (
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
                onClick={() => handleVoteToggle(null)}
                className={`flex w-full items-center justify-center rounded-full h-11 px-4 text-sm font-bold shadow-md transition-all active:scale-[0.98] ${
                  selectedCandidateId === null && hasVoted
                    ? "bg-slate-600 text-white shadow-slate-500/20"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
              >
                {selectedCandidateId === null && hasVoted
                  ? "เลือกแล้ว"
                  : "เลือก"}
              </button>
            </article>
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              person_off
            </span>
            <p className="text-slate-500">ไม่มีผู้สมัครในตำแหน่งนี้</p>
            <button
              onClick={() => handleVoteToggle(null)}
              className="mt-4 px-6 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
            >
              ข้ามตำแหน่งนี้
            </button>
          </div>
        )}
      </main>

      {/* Navigation Buttons */}
      <div className="fixed bottom-16 left-0 w-full px-4 pb-4 z-20 bg-linear-to-t from-white via-white to-transparent pt-8 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto flex gap-3">
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

          <button
            onClick={handleNext}
            disabled={!hasVoted || isPending}
            className={`flex flex-1 items-center justify-center rounded-xl h-14 px-6 text-lg font-bold shadow-lg transition-all active:scale-[0.98] gap-2 ${
              hasVoted
                ? isLastPosition
                  ? "bg-primary text-white hover:shadow-xl shadow-blue-500/30"
                  : "bg-slate-900 text-white hover:shadow-xl"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isLastPosition ? "ส่งคะแนนทั้งหมด" : "ตำแหน่งถัดไป"}
            <span className="material-symbols-outlined">
              {isLastPosition ? "check_circle" : "arrow_forward"}
            </span>
          </button>
        </div>
      </div>

      {/* Loading Screen */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-200 rounded-full animate-spin border-t-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl">
                how_to_vote
              </span>
            </div>
          </div>
          <p className="mt-6 text-lg font-bold text-slate-900">
            กำลังบันทึกคะแนน...
          </p>
          <p className="mt-2 text-sm text-slate-500">กรุณารอสักครู่</p>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">
                  how_to_reg
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                ยืนยันการลงคะแนน
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                กรุณากรอกเลขประจำตัวนักเรียนเพื่อยืนยันการโหวต
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  เลขประจำตัวนักเรียน
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={confirmStudentId}
                  onChange={(e) => {
                    setConfirmStudentId(e.target.value);
                    setConfirmError("");
                  }}
                  className="w-full h-12 px-4 text-center text-2xl font-mono tracking-widest border-2 border-slate-200 rounded-xl focus:border-primary focus:outline-none transition-colors"
                  placeholder="รหัสนักเรียน"
                  autoFocus
                />
                {confirmError && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    {confirmError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmStudentId("");
                    setConfirmError("");
                  }}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmVote}
                  disabled={confirmStudentId.length === 0 || isPending}
                  className="flex-1 h-12 rounded-xl bg-primary text-white font-bold hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-20"></div>
    </div>
  );
}
