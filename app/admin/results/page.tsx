import Link from "next/link";

// Mock Data
interface ResultSummary {
  id: number;
  title: string;
  status: "completed" | "ongoing";
  totalVoters: number;
  votedCount: number;
  winner?: string;
  endDate: string;
}

const mockResults: ResultSummary[] = [
  {
    id: 1,
    title: "Student Council 2025",
    status: "ongoing",
    totalVoters: 1452,
    votedCount: 843,
    endDate: "Oct 24, 2024",
  },
  {
    id: 2,
    title: "Club Leadership Elections",
    status: "ongoing",
    totalVoters: 1452,
    votedCount: 156,
    endDate: "Oct 28, 2024",
  },
  {
    id: 3,
    title: "Sports Captain Selection",
    status: "completed",
    totalVoters: 1200,
    votedCount: 1024,
    winner: "Tanawat Chai",
    endDate: "Sep 20, 2024",
  },
];

export default function ResultSummary() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">สรุปผลลัพธ์</h2>
        <p className="text-slate-500 text-sm mt-1">
          ภาพรวมผลการเลือกตั้งทั้งหมด
        </p>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockResults.map((result) => {
          const turnout = Math.round(
            (result.votedCount / result.totalVoters) * 100
          );

          return (
            <div
              key={result.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-bold text-slate-900">{result.title}</h3>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                      result.status === "ongoing"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {result.status === "ongoing"
                      ? "กำลังดำเนินการ"
                      : "เสร็จสิ้น"}
                  </span>
                </div>

                {/* Turnout Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">อัตราการลงคะแนน</span>
                    <span className="font-medium text-slate-900">
                      {turnout}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${turnout}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{result.votedCount.toLocaleString()} ลงคะแนน</span>
                    <span>{result.totalVoters.toLocaleString()} มีสิทธิ์</span>
                  </div>
                </div>

                {/* Winner or End Date */}
                {result.winner ? (
                  <div className="flex items-center gap-3 bg-yellow-50 rounded-lg p-3">
                    <span className="material-symbols-outlined text-yellow-600">
                      emoji_events
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">ผู้ชนะ</p>
                      <p className="font-medium text-slate-900">
                        {result.winner}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-slate-400">
                      schedule
                    </span>
                    <span>สิ้นสุด: {result.endDate}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 px-6 py-4">
                <Link
                  href={`/admin/elections/${result.id}/results`}
                  className="text-primary hover:text-primary-dark text-sm font-medium flex items-center justify-center gap-1"
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
    </div>
  );
}
