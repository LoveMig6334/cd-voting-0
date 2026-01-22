"use client";

import { ElectionRow, PositionRow, CandidateRow } from "@/lib/db";
import {
  VoterTurnout,
  PositionResult,
  CandidateVoteCount,
} from "@/lib/actions/votes";
import Link from "next/link";
import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
}

// ============================================
// Helper Functions
// ============================================

function calculateStatus(startDate: Date, endDate: Date): "draft" | "open" | "closed" {
  const now = new Date();
  if (now < startDate) return "draft";
  if (now >= startDate && now <= endDate) return "open";
  return "closed";
}

// Custom tooltip for bar chart
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border border-slate-200">
        <p className="font-medium text-slate-900">{payload[0].payload.name}</p>
        <p className="text-sm text-slate-600">
          {payload[0].value.toLocaleString()} คะแนน
        </p>
      </div>
    );
  }
  return null;
}

// ============================================
// Main Component
// ============================================

export default function ResultsClient({
  election,
  turnout,
  positionResults,
}: ResultsClientProps) {
  const [showVotingLog, setShowVotingLog] = useState(false);

  const status = calculateStatus(new Date(election.start_date), new Date(election.end_date));
  const isLive = status === "open";

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
        <button className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto">
          <span className="material-symbols-outlined text-xl">download</span>
          Export CSV
        </button>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voter Turnout Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            อัตราการลงคะแนน
          </h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={250} height={250}>
                <PieChart>
                  <Pie
                    data={voterTurnoutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {voterTurnoutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-900">
                  {turnout.percentage}%
                </span>
                <span className="text-sm text-slate-500">Turnout</span>
              </div>
            </div>
          </div>
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
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={candidateVotes.map((c) => ({
                  name: c.candidateName,
                  votes: c.votes,
                }))}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="votes"
                  radius={[0, 4, 4, 0]}
                  fill="#137fec"
                  barSize={24}
                >
                  {candidateVotes.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#ffb800" : "#137fec"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
                      (p) => p.id === position.positionId
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

      {/* Voting Log (Simplified - just show total votes) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowVotingLog(!showVotingLog)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400">
              security
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              ข้อมูลการลงคะแนน
            </h3>
          </div>
          <span
            className={`material-symbols-outlined text-slate-400 transition-transform ${
              showVotingLog ? "rotate-180" : ""
            }`}
          >
            expand_more
          </span>
        </button>

        {showVotingLog && (
          <div className="border-t border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">
                  {turnout.totalVoted}
                </p>
                <p className="text-sm text-slate-500">ลงคะแนนแล้ว</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">
                  {turnout.totalEligible}
                </p>
                <p className="text-sm text-slate-500">ผู้มีสิทธิ์ทั้งหมด</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-slate-900">
                  {turnout.percentage}%
                </p>
                <p className="text-sm text-slate-500">อัตราการมีส่วนร่วม</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4 text-center">
              การโหวตเป็นแบบไม่ระบุตัวตน - ไม่สามารถติดตามว่าใครโหวตให้ใครได้
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
