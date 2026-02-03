"use client";

import dynamic from "next/dynamic";
import type { OpeningSlide as OpeningSlideType, PieChartData } from "../types";

const SlidePieChart = dynamic(() => import("../charts/SlidePieChart"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center">
      <div className="animate-pulse h-64 w-64 bg-slate-200 rounded-full" />
    </div>
  ),
});

interface OpeningSlideProps {
  slide: OpeningSlideType;
}

export default function OpeningSlide({ slide }: OpeningSlideProps) {
  const { electionTitle, turnout } = slide;

  // Prepare chart data
  const chartData: PieChartData[] = [
    { name: "ลงคะแนนแล้ว", value: turnout.totalVoted, color: "#137fec" },
    { name: "ยังไม่ลงคะแนน", value: turnout.notVoted, color: "#e2e8f0" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      {/* Election Title */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-primary/10 rounded-full mb-6">
          <span className="material-symbols-outlined text-primary text-3xl">
            how_to_vote
          </span>
          <span className="text-primary font-semibold text-lg">
            ผลการเลือกตั้ง
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4">
          {electionTitle}
        </h1>
        <p className="text-xl text-slate-500">สรุปผลการลงคะแนนเสียง</p>
      </div>

      {/* Voter Turnout Chart */}
      <div className="mb-8">
        <SlidePieChart
          data={chartData}
          percentage={turnout.percentage}
          centerLabel="อัตราการลงคะแนน"
          size="lg"
        />
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap justify-center gap-8">
        <div className="text-center">
          <p className="text-4xl font-bold text-primary">
            {turnout.totalVoted.toLocaleString()}
          </p>
          <p className="text-slate-500">ลงคะแนนแล้ว</p>
        </div>
        <div className="w-px h-16 bg-slate-200 hidden sm:block" />
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-400">
            {turnout.notVoted.toLocaleString()}
          </p>
          <p className="text-slate-500">ยังไม่ลงคะแนน</p>
        </div>
        <div className="w-px h-16 bg-slate-200 hidden sm:block" />
        <div className="text-center">
          <p className="text-4xl font-bold text-slate-900">
            {turnout.totalEligible.toLocaleString()}
          </p>
          <p className="text-slate-500">ผู้มีสิทธิ์ทั้งหมด</p>
        </div>
      </div>
    </div>
  );
}
