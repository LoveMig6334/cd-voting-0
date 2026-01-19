"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

// Mock Data
const COMPLETED_ELECTIONS = [
  {
    id: "sc-2025",
    title: "Student Council 2025",
    date: "Oct 24, 2024 • 5:00 PM",
    image: "https://picsum.photos/seed/alex/200/200",
    winners: [
      {
        role: "President",
        name: "Sarah Jenkins",
        img: "https://picsum.photos/seed/sarah/200/200",
      },
      {
        role: "Music President",
        name: "Mike Ross",
        img: "https://picsum.photos/seed/michael/200/200",
      },
    ],
    stats: {
      votesCast: 425,
      totalVoters: 500,
    },
  },
  // Add more if needed, but user removed others from active, so maybe just one completed.
];

export default function Analytics() {
  const router = useRouter();
  const [view, setView] = useState<"list" | "verify" | "detail">("list");
  const [selectedElection, setSelectedElection] = useState<
    (typeof COMPLETED_ELECTIONS)[0] | null
  >(null);
  const [token, setToken] = useState("");

  const handleSelectElection = (election: (typeof COMPLETED_ELECTIONS)[0]) => {
    setSelectedElection(election);
    setView("verify");
    setToken(""); // reset token
  };

  const handleVerify = (e: FormEvent) => {
    e.preventDefault();
    if (token.trim().length > 0) {
      setView("detail");
    }
  };

  const renderList = () => (
    <div className="flex flex-col gap-4 px-4 pb-8 animate-fade-in">
      {COMPLETED_ELECTIONS.map((election) => (
        <div
          key={election.id}
          className="flex flex-col rounded-lg bg-white p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleSelectElection(election)}
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-1 mb-1">
                <div className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                  <span className="material-symbols-outlined mr-1 text-[14px]">
                    event_available
                  </span>
                  เสร็จสิ้น
                </div>
              </div>
              <h3 className="text-base font-bold leading-tight text-slate-900">
                {election.title}
              </h3>
              <p className="text-slate-500 text-xs font-normal leading-normal">
                {election.date}
              </p>
            </div>
            <div
              className="w-16 h-16 shrink-0 bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100"
              style={{
                backgroundImage: `url("${election.image}")`,
              }}
            ></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-primary text-sm font-medium">
            <span>ดูผลลัพธ์</span>
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderVerify = () => (
    <div className="px-6 py-8 flex flex-col items-center justify-center animate-fade-in min-h-[60vh]">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-6">
        <span className="material-symbols-outlined text-3xl">lock</span>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันตัวตน</h3>
      <p className="text-slate-500 text-center text-sm mb-8">
        กรุณากรอก Token การลงคะแนนของคุณเพื่อดูผลการเลือกตั้ง
      </p>

      <form onSubmit={handleVerify} className="w-full max-w-xs space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
            Voting Token
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-center tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal"
            placeholder="เช่น VOTE-XXXX"
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="w-full bg-primary hover:bg-accent-yellow hover:text-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-accent-yellow/20 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!token.trim()}
        >
          ยืนยัน Token
        </button>
      </form>
    </div>
  );

  const renderDetail = () => {
    if (!selectedElection) return null;
    return (
      <div className="px-4 py-6 space-y-8 animate-fade-in">
        {/* Stats Section - Replaced Circle Chart */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">
            สถิติการมีส่วนร่วม
          </h3>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex flex-col">
                <span className="text-sm text-slate-500 font-medium">
                  คะแนนที่ลง
                </span>
                <span className="text-3xl font-bold text-primary">
                  {selectedElection.stats.votesCast}
                </span>
              </div>
              <div className="h-10 w-px bg-slate-200"></div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-slate-500 font-medium">
                  ผู้มีสิทธิ์ทั้งหมด
                </span>
                <span className="text-3xl font-bold text-slate-900">
                  {selectedElection.stats.totalVoters}
                </span>
              </div>
            </div>

            {/* Simple Bar to show ratio visually without percentage circle */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-500 opacity-80">
                <span>อัตราการลงคะแนน</span>
                <span>
                  {Math.round(
                    (selectedElection.stats.votesCast /
                      selectedElection.stats.totalVoters) *
                      100,
                  )}
                  %
                </span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    width: `${
                      (selectedElection.stats.votesCast /
                        selectedElection.stats.totalVoters) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Winners Section */}
        <section>
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            ตัวแทนที่ได้รับเลือก
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {selectedElection.winners.map((winner, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col items-center text-center gap-3"
              >
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full bg-cover bg-center border-4 border-yellow-100 shadow-sm"
                    style={{ backgroundImage: `url("${winner.img}")` }}
                  ></div>
                  <div className="absolute -bottom-2 right-0 bg-yellow-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white shadow-sm">
                    ผู้ชนะ
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-tight">
                    {winner.name}
                  </h4>
                  <p className="text-xs font-medium text-primary mt-1 uppercase tracking-wide">
                    {winner.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-8 flex justify-center">
          <p className="text-xs text-slate-400 text-center flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">
              verified
            </span>
            ผลลัพธ์อย่างเป็นทางการ ยืนยันแล้ว
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background-light font-display text-slate-900 antialiased overflow-x-hidden min-h-screen">
      <div className="relative flex h-auto min-h-screen w-full flex-col max-w-md mx-auto bg-background-light shadow-sm pb-24">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background-light/95 backdrop-blur-sm border-b border-slate-200">
          <button
            onClick={() => {
              if (view === "detail") setView("list");
              else if (view === "verify") setView("list");
              else router.back();
            }}
            className="flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-slate-200 transition-colors group"
          >
            <span className="material-symbols-outlined text-primary text-[24px]">
              arrow_back_ios_new
            </span>
            <span className="text-primary text-base ml-1 font-medium group-hover:underline decoration-primary/50">
              {view === "list" ? "กลับ" : "ผลลัพธ์ทั้งหมด"}
            </span>
          </button>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] absolute left-1/2 -translate-x-1/2">
            {view === "list"
              ? "ผลการเลือกตั้ง"
              : view === "verify"
                ? "ตรวจสอบความปลอดภัย"
                : "ผลลัพธ์"}
          </h2>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 w-full">
          {view === "list" && renderList()}
          {view === "verify" && renderVerify()}
          {view === "detail" && renderDetail()}
        </main>
      </div>
    </div>
  );
}
