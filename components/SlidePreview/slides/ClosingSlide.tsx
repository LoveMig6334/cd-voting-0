"use client";

import type { ClosingSlide as ClosingSlideType } from "../types";

interface ClosingSlideProps {
  slide: ClosingSlideType;
}

export default function ClosingSlide({ slide }: ClosingSlideProps) {
  const { electionTitle, totalPositions, totalVoted, turnoutPercentage } =
    slide;

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-12">
      {/* Thank You Message */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-primary/10 rounded-full mb-6">
          <span className="material-symbols-outlined text-primary text-5xl">
            celebration
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4">
          ขอบคุณที่ร่วมลงคะแนน
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          ผลการเลือกตั้ง{electionTitle}ได้สิ้นสุดลงแล้ว
          <br />
          ขอบคุณทุกท่านที่มีส่วนร่วมในการใช้สิทธิ์เลือกตั้ง
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl">
        <div className="text-center p-6 bg-slate-50 rounded-2xl">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">
            how_to_vote
          </span>
          <p className="text-3xl font-bold text-slate-900">
            {totalPositions}
          </p>
          <p className="text-slate-500">ตำแหน่ง</p>
        </div>

        <div className="text-center p-6 bg-slate-50 rounded-2xl">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">
            groups
          </span>
          <p className="text-3xl font-bold text-slate-900">
            {totalVoted.toLocaleString()}
          </p>
          <p className="text-slate-500">ผู้ลงคะแนน</p>
        </div>

        <div className="text-center p-6 bg-slate-50 rounded-2xl">
          <span className="material-symbols-outlined text-primary text-4xl mb-2">
            trending_up
          </span>
          <p className="text-3xl font-bold text-slate-900">
            {turnoutPercentage}%
          </p>
          <p className="text-slate-500">อัตราการลงคะแนน</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-slate-400 text-sm">
          ระบบเลือกตั้งออนไลน์ โรงเรียน
        </p>
      </div>
    </div>
  );
}
