"use client";

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

// Mock Data
const voterTurnoutData = [
  { name: "Voted", value: 843, color: "#137fec" },
  { name: "Not Voted", value: 609, color: "#e2e8f0" },
];

const candidateData = [
  { name: "Sarah Jenkins", votes: 379, percentage: 45, rank: 1 },
  { name: "Michael Chen", votes: 270, percentage: 32, rank: 2 },
  { name: "Jessica Wong", votes: 194, percentage: 23, rank: 3 },
];

const votingLog = [
  {
    id: 1,
    tokenId: "VOTE-9SG2A8K1",
    timestamp: "Oct 24, 3:45 PM",
    verified: true,
  },
  {
    id: 2,
    tokenId: "VOTE-7HJ4B2M9",
    timestamp: "Oct 24, 3:42 PM",
    verified: true,
  },
  {
    id: 3,
    tokenId: "VOTE-4KL8C5N3",
    timestamp: "Oct 24, 3:38 PM",
    verified: true,
  },
  {
    id: 4,
    tokenId: "VOTE-2MN6D1P7",
    timestamp: "Oct 24, 3:35 PM",
    verified: true,
  },
  {
    id: 5,
    tokenId: "VOTE-8QR3E9S5",
    timestamp: "Oct 24, 3:31 PM",
    verified: true,
  },
];

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
          {payload[0].value.toLocaleString()} votes
        </p>
      </div>
    );
  }
  return null;
}

export default function ElectionResults() {
  const [showVotingLog, setShowVotingLog] = useState(false);

  const totalVoters = voterTurnoutData.reduce((sum, d) => sum + d.value, 0);
  const votedCount =
    voterTurnoutData.find((d) => d.name === "Voted")?.value || 0;
  const turnoutPercentage = Math.round((votedCount / totalVoters) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Student Council 2025
            </h2>
            <p className="text-slate-500 text-sm mt-1">Election Results</p>
          </div>
          <span className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-semibold">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
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
            Voter Turnout
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
                  {turnoutPercentage}%
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
            Votes per Candidate
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={candidateData}
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
                {candidateData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "#ffb800" : "#137fec"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Candidate Detail Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">
            Candidate Rankings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Votes
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidateData.map((candidate) => (
                <tr
                  key={candidate.rank}
                  className={`hover:bg-slate-50 transition-colors ${
                    candidate.rank === 1 ? "bg-yellow-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                        candidate.rank === 1
                          ? "bg-yellow-100 text-yellow-700"
                          : candidate.rank === 2
                          ? "bg-slate-200 text-slate-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {candidate.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500">
                          person
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">
                        {candidate.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {candidate.votes.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            candidate.rank === 1
                              ? "bg-yellow-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${candidate.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-600 text-sm">
                        {candidate.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voting Log (Collapsible) */}
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
              Voting Verification Log
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
          <div className="border-t border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Token ID
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {votingLog.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-mono text-sm text-slate-600">
                        {log.tokenId}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {log.timestamp}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <span className="material-symbols-outlined text-base">
                            verified
                          </span>
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 text-center">
              <button className="text-sm text-primary font-medium hover:text-primary-dark transition-colors">
                Load More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
