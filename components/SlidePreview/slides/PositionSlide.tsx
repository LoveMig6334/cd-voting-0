"use client";

import dynamic from "next/dynamic";
import type { WinnerStatus } from "@/lib/actions/votes";
import type {
  BarChartData,
  PositionSlide as PositionSlideType,
} from "../types";

const SlideBarChart = dynamic(() => import("../charts/SlideBarChart"), {
  ssr: false,
  loading: () => <div className="animate-pulse h-72 bg-slate-200 rounded-lg" />,
});

interface PositionSlideProps {
  slide: PositionSlideType;
}

// Helper function to get status display
function getStatusDisplay(status: WinnerStatus): {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
} {
  switch (status) {
    case "winner":
      return {
        icon: "emoji_events",
        color: "text-yellow-500",
        bgColor: "bg-yellow-50",
        label: "ผู้ชนะ",
      };
    case "abstain_wins":
      return {
        icon: "warning",
        color: "text-orange-500",
        bgColor: "bg-orange-50",
        label: "Vote No ชนะ",
      };
    case "tie":
      return {
        icon: "handshake",
        color: "text-blue-500",
        bgColor: "bg-blue-50",
        label: "ผลเสมอกัน",
      };
    case "no_candidates":
      return {
        icon: "block",
        color: "text-slate-400",
        bgColor: "bg-slate-50",
        label: "ไม่มีผู้สมัคร",
      };
    case "no_votes":
      return {
        icon: "inbox",
        color: "text-slate-400",
        bgColor: "bg-slate-50",
        label: "ยังไม่มีการลงคะแนน",
      };
    default:
      return {
        icon: "help",
        color: "text-slate-400",
        bgColor: "bg-slate-50",
        label: "ไม่ทราบสถานะ",
      };
  }
}

export default function PositionSlide({ slide }: PositionSlideProps) {
  const { positionTitle, positionIcon, winner, result, config } = slide;
  const statusDisplay = getStatusDisplay(winner.status);

  // Prepare chart data if showRawScore is enabled
  const chartData: BarChartData[] = result.candidates.map((candidate, index) => ({
    name: candidate.candidateName,
    votes: candidate.votes,
    percentage: candidate.percentage,
    isWinner: index === 0 && winner.status === "winner",
  }));

  // Add abstain to chart if significant
  if (result.abstainCount > 0) {
    chartData.push({
      name: "ไม่ประสงค์ลงคะแนน",
      votes: result.abstainCount,
      percentage: result.abstainPercentage,
      isWinner: winner.status === "abstain_wins",
    });
  }

  // Sort by votes descending (immutable)
  const sortedChartData = chartData.toSorted((a, b) => b.votes - a.votes);

  return (
    <div className="flex flex-col h-full px-8 py-12">
      {/* Position Header */}
      <div className="text-center mb-8">
        <div
          className={`inline-flex items-center gap-3 px-6 py-3 ${statusDisplay.bgColor} rounded-full mb-4`}
        >
          <span
            className={`material-symbols-outlined ${statusDisplay.color} text-2xl`}
          >
            {positionIcon || "person"}
          </span>
          <span className="text-slate-700 font-semibold">{positionTitle}</span>
        </div>
      </div>

      {/* Winner Display */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {winner.status === "winner" && winner.winner && (
          <div className="text-center animate-winner-reveal">
            <span
              className={`material-symbols-outlined ${statusDisplay.color} text-7xl mb-4`}
            >
              {statusDisplay.icon}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">
              {winner.winner.candidateName}
            </h2>
            {config.showRawScore && (
              <p className="text-2xl text-slate-500">
                {winner.winner.votes.toLocaleString()} คะแนน (
                {winner.winner.percentage.toFixed(1)}%)
              </p>
            )}
          </div>
        )}

        {winner.status === "abstain_wins" && (
          <div className="text-center animate-winner-reveal">
            <span
              className={`material-symbols-outlined ${statusDisplay.color} text-7xl mb-4`}
            >
              {statusDisplay.icon}
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-orange-600 mb-2">
              {statusDisplay.label}
            </h2>
            {config.showRawScore && (
              <p className="text-2xl text-slate-500">
                {winner.abstainCount.toLocaleString()} คะแนน
              </p>
            )}
          </div>
        )}

        {winner.status === "tie" && winner.tiedCandidates && (
          <div className="text-center animate-winner-reveal">
            <span
              className={`material-symbols-outlined ${statusDisplay.color} text-7xl mb-4`}
            >
              {statusDisplay.icon}
            </span>
            <h2 className="text-3xl font-bold text-blue-600 mb-4">
              {statusDisplay.label}
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              {winner.tiedCandidates.map((candidate) => (
                <div
                  key={candidate.candidateId}
                  className="bg-blue-50 px-6 py-3 rounded-xl"
                >
                  <p className="text-xl font-semibold text-slate-900">
                    {candidate.candidateName}
                  </p>
                  {config.showRawScore && (
                    <p className="text-slate-500">
                      {candidate.votes.toLocaleString()} คะแนน
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show all candidates if not showWinnerOnly */}
        {!config.showWinnerOnly &&
          config.showRawScore &&
          sortedChartData.length > 0 && (
            <div className="w-full max-w-2xl mt-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                ผลคะแนนทั้งหมด
              </h3>
              <SlideBarChart data={sortedChartData} showPercentage={true} />
            </div>
          )}

        {/* Candidate list without chart if showRawScore is false */}
        {!config.showWinnerOnly &&
          !config.showRawScore &&
          result.candidates.length > 0 && (
            <div className="w-full max-w-md mt-8">
              <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">
                ผู้สมัครทั้งหมด
              </h3>
              <div className="space-y-2">
                {result.candidates.map((candidate, index) => (
                  <div
                    key={candidate.candidateId}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      index === 0 && winner.status === "winner"
                        ? "bg-yellow-50 border-2 border-yellow-200"
                        : "bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 flex items-center justify-center rounded-full ${
                        index === 0 && winner.status === "winner"
                          ? "bg-yellow-500 text-white"
                          : "bg-slate-200 text-slate-600"
                      } font-bold text-sm`}
                    >
                      {index + 1}
                    </span>
                    <span className="text-slate-900 font-medium">
                      {candidate.candidateName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Footer Stats */}
      <div className="text-center text-slate-400 text-sm mt-4">
        คะแนนทั้งหมด: {result.totalVotes.toLocaleString()} คะแนน
      </div>
    </div>
  );
}
