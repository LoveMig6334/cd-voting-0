"use client";

import {
  getPublicElectionResults,
  PublicElectionResult,
  PublicElectionSummary,
} from "@/lib/actions/student-analytics";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface AnalyticsClientProps {
  initialElections: PublicElectionSummary[];
}

// Format date to Thai format
function formatThaiDate(date: Date): string {
  const thaiMonths = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const d = new Date(date);
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} • ${hours}:${minutes} น.`;
}

// Status badge component
function StatusBadge({ status }: { status: "active" | "closed" }) {
  return status === "closed" ? (
    <div className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
      <span className="material-symbols-outlined mr-1 text-[14px]">
        event_available
      </span>
      ปิดโหวต
    </div>
  ) : (
    <div className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      <span className="material-symbols-outlined mr-1 text-[14px]">
        how_to_vote
      </span>
      เปิดโหวต
    </div>
  );
}

export default function AnalyticsClient({
  initialElections,
}: AnalyticsClientProps) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "verify" | "detail">("list");
  const [selectedElection, setSelectedElection] =
    useState<PublicElectionSummary | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PublicElectionResult | null>(null);

  const handleSelectElection = (election: PublicElectionSummary) => {
    if (election.status === "active") {
      return; // Can't view active elections
    }
    if (!election.canViewResults) {
      setError("ผลการเลือกตั้งยังไม่ได้เผยแพร่");
      return;
    }
    setSelectedElection(election);
    setView("verify");
    setToken("");
    setError(null);
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim() || !selectedElection) return;

    setIsLoading(true);
    setError(null);

    const result = await getPublicElectionResults(selectedElection.id, token);

    setIsLoading(false);

    if (!result.success) {
      setError(result.message || "เกิดข้อผิดพลาด");
      return;
    }

    setResults(result.data || null);
    setView("detail");
  };

  const renderList = () => (
    <div className="flex flex-col gap-4 px-4 pb-8 animate-fade-in">
      {initialElections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span
            className="material-symbols-outlined text-slate-300 mb-4"
            style={{ fontSize: "64px" }}
          >
            ballot
          </span>
          <p className="text-slate-500 text-base font-medium">
            ยังไม่มีการเลือกตั้ง
          </p>
        </div>
      ) : (
        initialElections.map((election) => (
          <div
            key={election.id}
            className={`flex flex-col rounded-lg bg-white p-4 shadow-sm border border-slate-100 transition-shadow ${
              election.status === "closed" && election.canViewResults
                ? "hover:shadow-md cursor-pointer"
                : "opacity-70"
            }`}
            onClick={() => handleSelectElection(election)}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-1 mb-1">
                  <StatusBadge status={election.status} />
                  {election.status === "closed" && !election.canViewResults && (
                    <span className="text-xs text-slate-400 ml-2">
                      (ยังไม่เผยแพร่)
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold leading-tight text-slate-900">
                  {election.title}
                </h3>
                <p className="text-slate-500 text-xs font-normal leading-normal">
                  {formatThaiDate(election.endDate)}
                </p>
              </div>
              <div className="w-16 h-16 shrink-0 bg-center bg-no-repeat bg-cover rounded-lg border border-gray-100 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontSize: "28px" }}
                >
                  ballot
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-sm font-medium">
              {election.status === "active" ? (
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    lock
                  </span>
                  การเลือกตั้งยังไม่สิ้นสุด
                </span>
              ) : election.canViewResults ? (
                <>
                  <span className="text-primary">ดูผลลัพธ์</span>
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    chevron_right
                  </span>
                </>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">
                    visibility_off
                  </span>
                  ยังไม่เผยแพร่ผลลัพธ์
                </span>
              )}
            </div>
          </div>
        ))
      )}
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

      {error && (
        <div className="w-full max-w-xs mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="w-full max-w-xs space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 block">
            Voting Token
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono text-center tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal"
            placeholder="เช่น VOTE-XXXX-XXXX"
            autoFocus
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-primary hover:bg-accent-yellow hover:text-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-accent-yellow/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={!token.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">
                progress_activity
              </span>
              กำลังตรวจสอบ...
            </>
          ) : (
            "ยืนยัน Token"
          )}
        </button>
      </form>
    </div>
  );

  const renderDetail = () => {
    if (!results) return null;

    return (
      <div className="px-4 py-6 space-y-8 animate-fade-in">
        {/* Stats Section */}
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
                  {results.turnout.totalVoted}
                </span>
              </div>
              <div className="h-10 w-px bg-slate-200"></div>
              <div className="flex flex-col items-end">
                <span className="text-sm text-slate-500 font-medium">
                  ผู้มีสิทธิ์ทั้งหมด
                </span>
                <span className="text-3xl font-bold text-slate-900">
                  {results.turnout.totalEligible}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-500 opacity-80">
                <span>อัตราการลงคะแนน</span>
                <span>{Math.round(results.turnout.percentage)}%</span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${results.turnout.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </section>

        {/* Position Results */}
        {results.positions.map((position) => (
          <section key={position.positionId}>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {position.positionTitle}
            </h3>

            {position.showWinnerOnly && position.winner ? (
              // Show only winner
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-full bg-cover bg-center border-4 border-yellow-100 shadow-sm bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                    style={
                      position.winner.imageUrl
                        ? {
                            backgroundImage: `url("${position.winner.imageUrl}")`,
                          }
                        : {}
                    }
                  >
                    {!position.winner.imageUrl && (
                      <span className="material-symbols-outlined text-primary text-2xl">
                        person
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white shadow-sm">
                    ผู้ชนะ
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    {position.winner.name}
                  </h4>
                  {position.showRawScore && (
                    <p className="text-sm text-slate-500">
                      {position.winner.votes} คะแนน
                    </p>
                  )}
                </div>
              </div>
            ) : position.candidates && position.candidates.length > 0 ? (
              // Show all candidates with scores
              <div className="space-y-3">
                {position.candidates.map((candidate, idx) => (
                  <div
                    key={candidate.candidateId}
                    className={`bg-white rounded-xl p-4 shadow-sm border ${
                      idx === 0
                        ? "border-yellow-200 bg-yellow-50/30"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-full bg-cover bg-center border-2 border-slate-100 bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                          style={
                            candidate.imageUrl
                              ? {
                                  backgroundImage: `url("${candidate.imageUrl}")`,
                                }
                              : {}
                          }
                        >
                          {!candidate.imageUrl && (
                            <span className="material-symbols-outlined text-primary">
                              person
                            </span>
                          )}
                        </div>
                        {idx === 0 && (
                          <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-slate-900 text-[8px] font-bold w-5 h-5 rounded-full border border-white shadow-sm flex items-center justify-center">
                            1
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">
                            เบอร์ {candidate.rank}: {candidate.name}
                          </h4>
                          <span className="font-bold text-primary">
                            {candidate.votes}
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              idx === 0 ? "bg-yellow-400" : "bg-primary"
                            }`}
                            style={{ width: `${candidate.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Abstain */}
                {position.abstainCount > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-sm font-medium">งดออกเสียง</span>
                      <span className="font-bold">
                        {position.abstainCount} (
                        {Math.round(position.abstainPercentage)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // No data
              <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500">
                ไม่มีข้อมูล
              </div>
            )}
          </section>
        ))}

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
              if (view === "detail") {
                setView("list");
                setResults(null);
              } else if (view === "verify") {
                setView("list");
              } else {
                router.back();
              }
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
