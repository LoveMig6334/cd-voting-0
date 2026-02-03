"use client";

import {
  PositionWinner,
  VoterTurnout,
  WinnerStatus,
} from "@/lib/actions/votes";
import { CandidateRow, ElectionRow, PositionRow } from "@/lib/db";
import PublicDisplayModal from "@/components/PublicDisplayModal";
import { SlidePreviewModal } from "@/components/SlidePreview";
import Link from "next/link";
import { useState } from "react";

// ============================================
// Types
// ============================================

export interface ElectionWithDetails extends ElectionRow {
  positions: PositionRow[];
  candidates: CandidateRow[];
}

export interface ElectionResultSummary {
  election: ElectionWithDetails;
  turnout: VoterTurnout;
  primaryWinner: PositionWinner | null;
  status: "draft" | "open" | "closed";
}

interface AdminResultsClientProps {
  summaries: ElectionResultSummary[];
}

// ============================================
// Helper Functions
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateStatus(
  startDate: Date,
  endDate: Date,
): "draft" | "open" | "closed" {
  const now = new Date();
  if (now < startDate) return "draft";
  if (now >= startDate && now <= endDate) return "open";
  return "closed";
}

function formatEndDate(date: Date): string {
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

function getWinnerText(winner: PositionWinner): string {
  switch (winner.status) {
    case "winner":
      return winner.winner?.candidateName || "ไม่ทราบ";
    case "abstain_wins":
      return "ไม่ลงคะแนนชนะ";
    case "tie":
      return `เสมอ (${winner.tiedCandidates?.length || 0} คน)`;
    case "no_candidates":
      return "ไม่มีผู้สมัคร";
    case "no_votes":
      return "ยังไม่มีการลงคะแนน";
    default:
      return "ไม่ทราบ";
  }
}

// ============================================
// Main Component
// ============================================

export default function AdminResultsClient({
  summaries,
}: AdminResultsClientProps) {
  // State for Public Display Modal
  const [selectedElection, setSelectedElection] =
    useState<ElectionResultSummary | null>(null);

  // State for Slide Preview Modal
  const [slidePreviewElection, setSlidePreviewElection] =
    useState<ElectionResultSummary | null>(null);

  // Handler to open Public Display Modal
  const handleOpenDisplaySettings = (summary: ElectionResultSummary) => {
    setSelectedElection(summary);
  };

  // Handler to close Public Display Modal
  const handleCloseDisplaySettings = () => {
    setSelectedElection(null);
  };

  // Handler to open Slide Preview Modal
  const handleOpenSlidePreview = (summary: ElectionResultSummary) => {
    setSlidePreviewElection(summary);
  };

  // Handler to close Slide Preview Modal
  const handleCloseSlidePreview = () => {
    setSlidePreviewElection(null);
  };

  // Transform candidates data for modal props
  const transformCandidatesForModal = (candidates: CandidateRow[]) => {
    return candidates.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      positionId: c.position_id,
    }));
  };

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
      {summaries.length === 0 && (
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
        {summaries.map(({ election, turnout, primaryWinner, status }) => {
          const statusBadge = getStatusBadge(status);

          return (
            <div
              key={election.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Title and Status */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-slate-900">{election.title}</h3>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${statusBadge.className}`}
                  >
                    {statusBadge.label}
                  </span>
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
                    <span>{turnout.totalVoted.toLocaleString()} ลงคะแนน</span>
                    <span>
                      {turnout.totalEligible.toLocaleString()} มีสิทธิ์
                    </span>
                  </div>
                </div>

                {/* Winner or End Date */}
                {status === "closed" && primaryWinner ? (
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
                            {getWinnerText(primaryWinner)}
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
                    <span>
                      สิ้นสุด: {formatEndDate(new Date(election.end_date))}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer with Actions */}
              <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Show slide preview button for closed elections only */}
                  {status === "closed" && (
                    <button
                      onClick={() =>
                        handleOpenSlidePreview({
                          election,
                          turnout,
                          primaryWinner,
                          status,
                        })
                      }
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group"
                      title="ดูตัวอย่าง Slide"
                    >
                      <span className="material-symbols-outlined">
                        slideshow
                      </span>
                    </button>
                  )}

                  {/* Show public display button for open/closed elections */}
                  {status !== "draft" && (
                    <button
                      onClick={() =>
                        handleOpenDisplaySettings({
                          election,
                          turnout,
                          primaryWinner,
                          status,
                        })
                      }
                      className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group"
                      title="ตั้งค่าการแสดงผลสาธารณะ"
                    >
                      <span className="material-symbols-outlined">
                        settings
                      </span>
                    </button>
                  )}
                </div>

                <Link
                  href={`/admin/elections/${election.id}/results`}
                  className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
                >
                  ดูรายละเอียด
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Public Display Modal */}
      {selectedElection && (
        <PublicDisplayModal
          isOpen={true}
          onClose={handleCloseDisplaySettings}
          electionId={selectedElection.election.id.toString()}
          electionTitle={selectedElection.election.title}
          positions={selectedElection.election.positions.map((p) => ({
            id: p.id,
            title: p.title,
            enabled: p.enabled,
            icon: p.icon || "person",
          }))}
          candidates={transformCandidatesForModal(
            selectedElection.election.candidates,
          )}
        />
      )}

      {/* Slide Preview Modal */}
      {slidePreviewElection && (
        <SlidePreviewModal
          isOpen={true}
          onClose={handleCloseSlidePreview}
          electionId={slidePreviewElection.election.id.toString()}
          electionTitle={slidePreviewElection.election.title}
          positions={slidePreviewElection.election.positions.map((p) => ({
            id: p.id,
            title: p.title,
            enabled: p.enabled,
            icon: p.icon || "person",
          }))}
        />
      )}
    </div>
  );
}
