"use client";

import { useElections } from "@/components/ElectionContext";
import PublicDisplayModal from "@/components/PublicDisplayModal";
import { ElectionEvent } from "@/lib/election-types";
import { getDisplaySettings } from "@/lib/public-display-store";
import { getAllStudents } from "@/lib/student-store";
import {
  getElectionPrimaryWinner,
  getVoterTurnout,
  subscribeToVotes,
  type WinnerStatus,
} from "@/lib/vote-store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// ============================================
// Types
// ============================================

interface ElectionResultSummary {
  election: ElectionEvent;
  turnout: {
    votedCount: number;
    totalVoters: number;
    percentage: number;
  };
  primaryWinner: {
    text: string;
    status: WinnerStatus;
  } | null;
  isPublished: boolean;
}

// ============================================
// Helper Functions
// ============================================

function formatEndDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: "draft" | "open" | "closed"): {
  label: string;
  className: string;
} {
  switch (status) {
    case "open":
      return {
        label: "กำลังดำเนินการ",
        className: "bg-green-100 text-green-700",
      };
    case "closed":
      return {
        label: "เสร็จสิ้น",
        className: "bg-slate-100 text-slate-600",
      };
    case "draft":
      return {
        label: "ฉบับร่าง",
        className: "bg-yellow-100 text-yellow-700",
      };
    default:
      return {
        label: "ไม่ทราบสถานะ",
        className: "bg-slate-100 text-slate-600",
      };
  }
}

function getWinnerDisplay(status: WinnerStatus): {
  icon: string;
  bgColor: string;
  textColor: string;
} {
  switch (status) {
    case "winner":
      return {
        icon: "emoji_events",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-600",
      };
    case "abstain_wins":
      return {
        icon: "warning",
        bgColor: "bg-orange-50",
        textColor: "text-orange-600",
      };
    case "tie":
      return {
        icon: "handshake",
        bgColor: "bg-blue-50",
        textColor: "text-blue-600",
      };
    case "no_candidates":
      return {
        icon: "block",
        bgColor: "bg-slate-50",
        textColor: "text-slate-400",
      };
    case "no_votes":
      return {
        icon: "inbox",
        bgColor: "bg-slate-50",
        textColor: "text-slate-400",
      };
    default:
      return {
        icon: "help",
        bgColor: "bg-slate-50",
        textColor: "text-slate-400",
      };
  }
}

// ============================================
// Main Component
// ============================================

export default function ResultSummary() {
  const { elections, loading } = useElections();
  const [totalEligibleVoters, setTotalEligibleVoters] = useState(0);
  const [, setVoteVersion] = useState(0); // For triggering re-renders on vote updates

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedElection, setSelectedElection] =
    useState<ElectionEvent | null>(null);

  // Get total eligible voters from student store
  // Note: Calling setState in useEffect is valid here because we're syncing with localStorage
  useEffect(() => {
    const students = getAllStudents();
    const approvedCount = students.filter((s) => s.votingApproved).length;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotalEligibleVoters(approvedCount > 0 ? approvedCount : students.length);
  }, []);

  // Subscribe to vote updates for real-time sync
  useEffect(() => {
    const unsubscribe = subscribeToVotes(() => {
      setVoteVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Calculate summaries for all elections
  const electionSummaries: ElectionResultSummary[] = useMemo(() => {
    return elections.map((election) => {
      // Get voter turnout
      const turnout = getVoterTurnout(election.id, totalEligibleVoters);

      // Get primary winner (first position's winner)
      const primaryWinner = getElectionPrimaryWinner(
        election.id,
        election.positions,
        election.candidates,
      );

      // Check if results are published
      const displaySettings = getDisplaySettings(election.id);
      const isPublished = displaySettings?.isPublished || false;

      return {
        election,
        turnout: {
          votedCount: turnout.totalVoted,
          totalVoters: totalEligibleVoters,
          percentage: turnout.percentage,
        },
        primaryWinner,
        isPublished,
      };
    });
  }, [elections, totalEligibleVoters]);

  // Handle opening the display settings modal
  const handleOpenModal = (election: ElectionEvent) => {
    setSelectedElection(election);
    setModalOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-4 border-slate-200 rounded-full animate-spin border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">สรุปผลลัพธ์</h2>
        <p className="text-slate-500 text-sm mt-1">
          ภาพรวมผลการเลือกตั้งทั้งหมด
        </p>
      </div>

      {/* Empty State */}
      {electionSummaries.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
            how_to_vote
          </span>
          <p className="text-slate-500 mb-4">ยังไม่มีการเลือกตั้ง</p>
          <Link
            href="/admin/elections"
            className="text-primary hover:text-primary-dark text-sm font-medium"
          >
            สร้างการเลือกตั้งใหม่ →
          </Link>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {electionSummaries.map(
          ({ election, turnout, primaryWinner, isPublished }) => {
            const statusBadge = getStatusBadge(election.status);

            return (
              <div
                key={election.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Title and Status */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-slate-900">
                      {election.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {isPublished && (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Turnout Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">อัตราการลงคะแนน</span>
                      <span className="font-medium text-slate-900">
                        {turnout.percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(turnout.percentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>{turnout.votedCount.toLocaleString()} ลงคะแนน</span>
                      <span>
                        {turnout.totalVoters.toLocaleString()} มีสิทธิ์
                      </span>
                    </div>
                  </div>

                  {/* Winner or End Date */}
                  {election.status === "closed" && primaryWinner ? (
                    (() => {
                      const winnerDisplay = getWinnerDisplay(
                        primaryWinner.status,
                      );
                      return (
                        <div
                          className={`flex items-center gap-3 ${winnerDisplay.bgColor} rounded-lg p-3`}
                        >
                          <span
                            className={`material-symbols-outlined ${winnerDisplay.textColor}`}
                          >
                            {winnerDisplay.icon}
                          </span>
                          <div>
                            <p className="text-xs text-slate-500">
                              {primaryWinner.status === "winner"
                                ? "ผู้ชนะ"
                                : primaryWinner.status === "abstain_wins"
                                  ? "ผลลัพธ์"
                                  : primaryWinner.status === "tie"
                                    ? "ผลลัพธ์"
                                    : "สถานะ"}
                            </p>
                            <p className="font-medium text-slate-900">
                              {primaryWinner.text}
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span className="material-symbols-outlined text-slate-400">
                        schedule
                      </span>
                      <span>สิ้นสุด: {formatEndDate(election.endDate)}</span>
                    </div>
                  )}
                </div>

                {/* Footer with Actions */}
                <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                  <Link
                    href={`/admin/elections/${election.id}/results`}
                    className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
                  >
                    ดูรายละเอียด
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </Link>

                  {/* Show display settings button for closed elections */}
                  {election.status === "closed" && (
                    <button
                      onClick={() => handleOpenModal(election)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-medium transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">
                        settings
                      </span>
                      {isPublished ? "แก้ไขการแสดงผล" : "ตั้งค่าการแสดงผล"}
                    </button>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Public Display Modal */}
      {selectedElection && (
        <PublicDisplayModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedElection(null);
          }}
          electionId={selectedElection.id}
          electionTitle={selectedElection.title}
          positions={selectedElection.positions}
          candidates={selectedElection.candidates}
        />
      )}
    </div>
  );
}
