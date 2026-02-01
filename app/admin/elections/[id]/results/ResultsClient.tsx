"use client";

import {
  CandidateVoteCount,
  LevelParticipation,
  PositionResult,
  VoterTurnout,
} from "@/lib/actions/votes";
import { CandidateRow, ElectionRow, PositionRow } from "@/lib/db";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

// Dynamic import chart components to reduce initial bundle size (~500KB)
const VoterTurnoutChart = dynamic(() => import("./VoterTurnoutChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center">
      <div className="animate-pulse h-64 w-64 bg-slate-200 rounded-full" />
    </div>
  ),
});

const CandidateBarChart = dynamic(() => import("./CandidateBarChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse h-72 bg-slate-200 rounded-lg" />,
});

// ============================================
// Types
// ============================================

export interface ElectionWithDetails extends ElectionRow {
  positions: PositionRow[];
  candidates: CandidateRow[];
}

interface ResultsClientProps {
  election: ElectionWithDetails;
  turnout: VoterTurnout;
  positionResults: PositionResult[];
  totalStudents: number;
  levelStats: LevelParticipation[];
}

// ============================================
// Helper Functions
// ============================================

function calculateStatus(
  startDate: Date,
  endDate: Date,
): "draft" | "open" | "closed" {
  const now = new Date();
  if (now < startDate) return "draft";
  if (now >= startDate && now <= endDate) return "open";
  return "closed";
}

// ============================================
// Main Component
// ============================================

// Dynamic color scale based on percentage
function getParticipationColor(percentage: number) {
  if (percentage >= 80) {
    return {
      bg: "bg-blue-700",
      text: "text-white",
      subtext: "text-blue-100",
      fill: "bg-white",
      track: "bg-blue-800",
    };
  }
  if (percentage >= 60) {
    return {
      bg: "bg-blue-500",
      text: "text-white",
      subtext: "text-blue-50",
      fill: "bg-white",
      track: "bg-blue-600",
    };
  }
  if (percentage >= 40) {
    return {
      bg: "bg-blue-200",
      text: "text-blue-900",
      subtext: "text-blue-700",
      fill: "bg-blue-600",
      track: "bg-blue-300",
    };
  }
  if (percentage >= 20) {
    return {
      bg: "bg-blue-100",
      text: "text-blue-800",
      subtext: "text-blue-600",
      fill: "bg-blue-500",
      track: "bg-blue-200",
    };
  }
  return {
    bg: "bg-blue-50",
    text: "text-blue-700",
    subtext: "text-blue-500",
    fill: "bg-blue-400",
    track: "bg-blue-100",
  };
}

export default function ResultsClient({
  election,
  turnout,
  positionResults,
  totalStudents,
  levelStats,
}: ResultsClientProps) {
  const [showLevelStats, setShowLevelStats] = useState(false);

  const status = calculateStatus(
    new Date(election.start_date),
    new Date(election.end_date),
  );
  const isLive = status === "open";

  // Calculate percentages
  const participationRate =
    totalStudents > 0
      ? Math.round((turnout.totalVoted / totalStudents) * 100)
      : 0;
  const turnoutRate =
    turnout.totalEligible > 0
      ? Math.round((turnout.totalVoted / turnout.totalEligible) * 100)
      : 0;

  // Prepare pie chart data for voter turnout
  const voterTurnoutData = [
    { name: "ลงคะแนนแล้ว", value: turnout.totalVoted, color: "#137fec" },
    { name: "ยังไม่ลงคะแนน", value: turnout.notVoted, color: "#e2e8f0" },
  ];

  // Prepare bar chart data - aggregate all candidates
  const candidateVotes: CandidateVoteCount[] = [];
  for (const posResult of positionResults) {
    for (const candidate of posResult.candidates) {
      candidateVotes.push(candidate);
    }
  }
  // Sort by votes descending
  candidateVotes.sort((a, b) => b.votes - a.votes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/elections"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {election.title}
            </h2>
            <p className="text-slate-500 text-sm mt-1">ผลการเลือกตั้ง</p>
          </div>
          {isLive && (
            <span className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
          {status === "closed" && (
            <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-sm font-semibold">
              สิ้นสุดแล้ว
            </span>
          )}
        </div>
        <a
          href={`/api/export/election-results/${election.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-xl">download</span>
          Export CSV
        </a>
      </div>

      {/* Voting Stats Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="material-symbols-outlined text-primary">
            analytics
          </span>
          <h3 className="text-lg font-bold text-slate-900">ข้อมูลการลงคะแนน</h3>
        </div>

        {/* Row 1: 3 Stats Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-slate-400 text-lg">
                groups
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {totalStudents.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500">นักเรียนทั้งหมด</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-blue-500 text-lg">
                how_to_reg
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {turnout.totalEligible.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500">ผู้มีสิทธิ</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="material-symbols-outlined text-emerald-500 text-lg">
                task_alt
              </span>
            </div>
            <p className="text-3xl font-bold text-emerald-600">
              {turnout.totalVoted.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500">ลงคะแนนแล้ว</p>
          </div>
        </div>

        {/* Row 2: 2 Percentage Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-linear-to-br from-violet-50 to-purple-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">
                  อัตราการมีส่วนร่วม
                </p>
                <p className="text-xs text-slate-400">
                  ลงคะแนน / นักเรียนทั้งหมด
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-violet-600">
                  {participationRate}%
                </p>
              </div>
            </div>
            <div className="w-full bg-violet-100 rounded-full h-2 mt-3">
              <div
                className="h-2 rounded-full bg-violet-500 transition-all"
                style={{ width: `${participationRate}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-linear-to-br from-cyan-50 to-blue-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">อัตราการใช้สิทธิ</p>
                <p className="text-xs text-slate-400">ลงคะแนน / ผู้มีสิทธิ</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-cyan-600">
                  {turnoutRate}%
                </p>
              </div>
            </div>
            <div className="w-full bg-cyan-100 rounded-full h-2 mt-3">
              <div
                className="h-2 rounded-full bg-cyan-500 transition-all"
                style={{ width: `${turnoutRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Expandable: Level Stats */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <button
            onClick={() => setShowLevelStats(!showLevelStats)}
            aria-expanded={showLevelStats}
            className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900 transition-colors py-2"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">school</span>
              <span className="font-medium">
                อัตราการมีส่วนร่วมแยกตามระดับชั้น
              </span>
            </span>
            <span
              className={`material-symbols-outlined text-lg transition-transform duration-200 ${
                showLevelStats ? "rotate-180" : ""
              }`}
            >
              expand_more
            </span>
          </button>

          {/* Collapsible Content */}
          <div
            className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-hidden transition-all duration-300 ease-out p-2 ${
              showLevelStats ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
            }`}
          >
            {levelStats.map((level) => {
              const colors = getParticipationColor(level.percentage);
              return (
                <div
                  key={level.level}
                  className={`${colors.bg} rounded-xl p-4 text-center transition-all hover:scale-105`}
                >
                  <p className={`text-2xl font-bold ${colors.text}`}>
                    {level.percentage}%
                  </p>
                  <p className={`text-xs font-medium mt-1 ${colors.subtext}`}>
                    ม.{level.level}
                  </p>
                  <div
                    className={`w-full ${colors.track} rounded-full h-2 mt-2 bg-opacity-30`}
                  >
                    <div
                      className={`h-2 rounded-full ${colors.fill} transition-all duration-500`}
                      style={{ width: `${level.percentage}%` }}
                    ></div>
                  </div>
                  <p className={`text-[10px] mt-1 ${colors.subtext}`}>
                    {level.voted}/{level.totalStudents}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voter Turnout Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            อัตราการลงคะแนน
          </h3>
          <VoterTurnoutChart
            data={voterTurnoutData}
            percentage={turnout.percentage}
          />
          <div className="flex justify-center gap-6 mt-4">
            {voterTurnoutData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                ></span>
                <span className="text-sm text-slate-600">
                  {entry.name}: {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Votes Per Candidate Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            คะแนนต่อผู้สมัคร
          </h3>
          {candidateVotes.length > 0 ? (
            <CandidateBarChart
              data={candidateVotes.map((c) => ({
                name: c.candidateName,
                votes: c.votes,
              }))}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-2">
                bar_chart
              </span>
              <p>ยังไม่มีข้อมูลการโหวต</p>
            </div>
          )}
        </div>
      </div>

      {/* Position-Based Vote Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            ผลโหวตแยกตามตำแหน่ง
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {positionResults.map((position) => (
            <div key={position.positionId} className="p-6">
              {/* Position Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">
                    {election.positions.find(
                      (p) => p.id === position.positionId,
                    )?.icon || "person"}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {position.positionTitle}
                  </h4>
                  <p className="text-xs text-slate-500">
                    รวม {position.totalVotes} คะแนน
                  </p>
                </div>
              </div>

              {/* Candidates Results */}
              <div className="space-y-3">
                {position.candidates.map((candidate, idx) => (
                  <div
                    key={candidate.candidateId}
                    className="flex items-center gap-4"
                  >
                    {/* Rank Badge */}
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                        idx === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : idx === 1
                            ? "bg-slate-200 text-slate-700"
                            : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>

                    {/* Candidate Info & Progress */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">
                          {candidate.candidateName}
                        </span>
                        <span className="text-sm text-slate-600">
                          {candidate.votes} คะแนน ({candidate.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            idx === 0 ? "bg-yellow-500" : "bg-primary"
                          }`}
                          style={{ width: `${candidate.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Abstain */}
                {position.abstainCount > 0 && (
                  <div className="flex items-center gap-4 opacity-60">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-slate-100 text-slate-400">
                      —
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-500">
                          ไม่ลงคะแนน
                        </span>
                        <span className="text-sm text-slate-500">
                          {position.abstainCount} คะแนน (
                          {position.abstainPercentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-slate-300"
                          style={{ width: `${position.abstainPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {position.candidates.length === 0 &&
                  position.abstainCount === 0 && (
                    <p className="text-slate-400 text-sm py-2">
                      ยังไม่มีข้อมูลการโหวตในตำแหน่งนี้
                    </p>
                  )}
              </div>
            </div>
          ))}

          {positionResults.length === 0 && (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
                how_to_vote
              </span>
              <p className="text-slate-500">ยังไม่มีตำแหน่งที่เปิดให้โหวต</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
