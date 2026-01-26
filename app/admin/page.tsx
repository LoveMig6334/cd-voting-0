import { ElectionControlButtons } from "@/components/ElectionControlButtons";
import { getRecentActivitiesForDisplay } from "@/lib/actions/activities";
import { getCurrentAdmin } from "@/lib/actions/admin-auth";
import { getActiveElections, getAllElections } from "@/lib/actions/elections";
import { getStudentStats } from "@/lib/actions/students";
import { getTotalVotes } from "@/lib/actions/votes";
import { ACCESS_LEVELS } from "@/lib/admin-types";
import { ActivityDisplayItem } from "@/lib/db";
import Link from "next/link";

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor: string;
  badge?: { text: string; color: string };
  indicator?: { text: string; pulse?: boolean };
  href?: string;
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  badge,
  indicator,
  href,
}: StatsCardProps) {
  const cardClassName =
    "glass-card rounded-2xl p-6 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(15,95,194,0.15)] hover:border-royal-blue/30 block";

  const cardContent = (
    <>
      <span className={`watermark-icon material-symbols-outlined ${iconColor}`}>
        {icon}
      </span>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-3 rounded-xl bg-linear-to-br from-royal-blue/10 to-cyan-500/10 ${iconColor}`}
          >
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          {badge && (
            <span
              className={`${badge.color} text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide backdrop-blur-sm`}
            >
              {badge.text}
            </span>
          )}
          {indicator && (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 bg-emerald-500 rounded-full ${
                  indicator.pulse ? "animate-pulse" : ""
                }`}
              ></span>
              <span className="text-emerald-600 text-xs font-semibold uppercase">
                {indicator.text}
              </span>
            </div>
          )}
        </div>

        <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent mb-4"></div>

        <h3 className="text-cool-gray text-sm font-medium uppercase tracking-wide">
          {title}
        </h3>

        <p className="text-4xl font-bold text-dark-slate mt-2 tracking-tight">
          {value}
        </p>

        {subtitle && <p className="text-xs text-cool-gray mt-2">{subtitle}</p>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {cardContent}
      </Link>
    );
  }

  return <div className={cardClassName}>{cardContent}</div>;
}

// Activity Timeline Component
function ActivityTimeline({
  activities,
}: {
  activities: ActivityDisplayItem[];
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-cool-gray">
        <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
          history
        </span>
        <p className="text-sm">ยังไม่มีกิจกรรม</p>
      </div>
    );
  }

  // Helper to extract hex-ish color from iconBg class for the shadow
  const getGlowColor = (bgClass: string) => {
    if (bgClass.includes("emerald")) return "rgba(16, 185, 129, 0.6)";
    if (bgClass.includes("royal-blue")) return "rgba(15, 95, 194, 0.6)";
    if (bgClass.includes("orange")) return "rgba(249, 115, 22, 0.6)";
    if (bgClass.includes("violet")) return "rgba(139, 92, 246, 0.6)";
    if (bgClass.includes("vivid-yellow") || bgClass.includes("yellow"))
      return "rgba(234, 179, 8, 0.6)";
    return "rgba(100, 116, 139, 0.6)";
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-center gap-3 py-1.5 px-2 hover:bg-slate-50/50 rounded-lg transition-colors group"
        >
          {/* Glowing Status Dot */}
          <div className="shrink-0">
            <div
              className={`w-2 h-2 rounded-full ${activity.iconBg} transition-all duration-300 group-hover:scale-110`}
              style={{
                boxShadow: `0 0 10px ${getGlowColor(activity.iconBg)}`,
              }}
            ></div>
          </div>

          <div className="flex flex-1 items-baseline justify-between gap-4 min-w-0">
            <h4 className="text-[13px] font-medium text-dark-slate truncate">
              {activity.title}
            </h4>
            <time className="text-[11px] font-medium text-cool-gray/60 whitespace-nowrap">
              {activity.time}
            </time>
          </div>
        </div>
      ))}
    </div>
  );
}

// Format date
function formatThaiDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboard() {
  // Fetch data from MySQL
  const [
    adminData,
    studentStats,
    allElections,
    activeElectionsList,
    recentActivities,
  ] = await Promise.all([
    getCurrentAdmin(),
    getStudentStats(),
    getAllElections(),
    getActiveElections(),
    getRecentActivitiesForDisplay(5),
  ]);

  const adminName =
    adminData?.admin.display_name || adminData?.admin.username || "ผู้ดูแลระบบ";

  // Get total votes for all active elections
  let totalVotes = 0;
  for (const election of activeElectionsList) {
    const votes = await getTotalVotes(election.id);
    totalVotes += votes;
  }

  // Calculate voter turnout percentage
  const voterTurnoutPercentage =
    studentStats.approved > 0
      ? Math.round((totalVotes / studentStats.approved) * 100)
      : 0;

  // Get primary active election
  const primaryActiveElection =
    activeElectionsList.length > 0 ? activeElectionsList[0] : null;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-dark-slate">
            ยินดีต้อนรับกลับ, {adminName}
          </h2>
          <p className="text-cool-gray mt-1">
            นี่คือภาพรวมล่าสุดของการเลือกตั้งโรงเรียน
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/results"
            className="glass-card px-4 py-2 rounded-xl text-sm font-medium text-dark-slate hover:bg-white/90 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">analytics</span>
            ดูรายงาน
          </Link>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="นักเรียนทั้งหมด"
          value={studentStats.total.toLocaleString()}
          icon="school"
          iconColor="text-royal-blue"
          href="/admin/students"
        />
        <StatsCard
          title="การเลือกตั้งที่เปิด"
          value={activeElectionsList.length}
          icon="how_to_vote"
          iconColor="text-emerald-600"
          badge={
            activeElectionsList.length > 0
              ? { text: "เปิด", color: "bg-emerald-100 text-emerald-700" }
              : { text: "ปิด", color: "bg-slate-100 text-slate-600" }
          }
          href="/admin/elections"
        />
        <StatsCard
          title="คะแนนทั้งหมด"
          value={totalVotes.toLocaleString()}
          icon="ballot"
          iconColor="text-violet-600"
          badge={{
            text: `${voterTurnoutPercentage}%`,
            color: "bg-royal-blue/10 text-[#0F5FC2]",
          }}
          href="/admin/results"
        />
        <StatsCard
          title="สถานะระบบ"
          value="พร้อมใช้งาน"
          icon="dns"
          iconColor="text-orange-600"
          indicator={{
            text: "ออนไลน์",
            pulse: true,
          }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Active Election Card */}
        <div className="lg:col-span-2 flex">
          {primaryActiveElection ? (
            <div className="ticket-card rounded-2xl overflow-hidden w-full flex flex-col">
              <div className="p-6 border-b border-slate-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-dark-slate">
                    {primaryActiveElection.title}
                  </h3>
                  <p className="text-sm text-cool-gray mt-1">
                    {primaryActiveElection.description ||
                      "การเลือกตั้งที่เปิดอยู่"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/admin/results`}
                    className="bg-linear-to-r from-royal-blue to-cyan-500 hover:from-royal-blue/90 hover:to-cyan-500/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-royal-blue/25 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">
                      analytics
                    </span>
                    ผลลัพธ์สด
                  </Link>
                </div>
              </div>

              <div className="p-6">
                {/* Election Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className="p-2 bg-royal-blue/10 rounded-lg">
                      <span className="material-symbols-outlined text-royal-blue">
                        calendar_today
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-cool-gray uppercase font-semibold">
                        วันเริ่ม
                      </p>
                      <p className="text-sm font-bold text-dark-slate">
                        {formatThaiDate(primaryActiveElection.start_date)}
                      </p>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <span className="material-symbols-outlined text-orange-500">
                        event
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-cool-gray uppercase font-semibold">
                        วันสิ้นสุด
                      </p>
                      <p className="text-sm font-bold text-dark-slate">
                        {formatThaiDate(primaryActiveElection.end_date)}
                      </p>
                    </div>
                  </div>
                  <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <span className="material-symbols-outlined text-emerald-500">
                        group
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-cool-gray uppercase font-semibold">
                        คะแนนทั้งหมด
                      </p>
                      <p className="text-sm font-bold text-dark-slate">
                        {primaryActiveElection.total_votes} คะแนน
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100/50 flex justify-center">
                <Link
                  href={`/admin/results`}
                  className="text-royal-blue hover:text-cyan-600 text-sm font-semibold flex items-center gap-1 transition-colors"
                >
                  ดูวิเคราะห์ละเอียด
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="ticket-card rounded-2xl overflow-hidden w-full flex flex-col justify-center">
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-cool-gray/30 mb-4 block">
                  how_to_vote
                </span>
                <h3 className="text-xl font-bold text-dark-slate mb-2">
                  ไม่มีการเลือกตั้งที่เปิดอยู่
                </h3>
                <p className="text-cool-gray mb-6">
                  สร้างการเลือกตั้งใหม่เพื่อเริ่มรับคะแนนจากนักเรียน
                </p>
                <Link
                  href="/admin/elections"
                  className="inline-flex items-center gap-2 bg-linear-to-r from-royal-blue to-cyan-500 hover:from-royal-blue/90 hover:to-cyan-500/90 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-royal-blue/25"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  สร้างการเลือกตั้ง
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-1 flex">
          <div className="glass-card rounded-2xl w-full flex flex-col">
            <div className="p-6 border-b border-slate-100/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-royal-blue">
                  history
                </span>
                <h3 className="text-lg font-bold text-dark-slate">
                  กิจกรรมล่าสุด
                </h3>
              </div>
            </div>
            <div className="p-6 grow overflow-y-auto max-h-[400px] no-scrollbar">
              <ActivityTimeline activities={recentActivities} />
            </div>
            {adminData?.admin &&
              adminData.admin.access_level <= ACCESS_LEVELS.SYSTEM_ADMIN && (
                <div className="p-4 border-t border-slate-100/50 text-center">
                  <Link
                    href="/admin/activity"
                    className="text-sm font-semibold text-royal-blue hover:text-cyan-600 transition-colors flex items-center gap-1 justify-center"
                  >
                    ดูกิจกรรมทั้งหมด
                    <span className="material-symbols-outlined text-sm">
                      chevron_right
                    </span>
                  </Link>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* All Elections */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-dark-slate flex items-center gap-2">
            <span className="material-symbols-outlined text-royal-blue">
              list_alt
            </span>
            การเลือกตั้งทั้งหมด
          </h3>
          <Link
            href="/admin/elections"
            className="text-sm font-semibold text-royal-blue hover:text-cyan-600 transition-colors"
          >
            ดูทั้งหมด →
          </Link>
        </div>

        {allElections.length === 0 ? (
          <div className="text-center py-8 text-cool-gray">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
              inbox
            </span>
            <p className="text-sm">ยังไม่มีการเลือกตั้ง</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-cool-gray uppercase tracking-wider border-b border-slate-100">
                  <th className="pb-3 pr-4">ชื่อการเลือกตั้ง</th>
                  <th className="pb-3 pr-4">วันเริ่ม</th>
                  <th className="pb-3 pr-4">วันสิ้นสุด</th>
                  <th className="pb-3 pr-4">สถานะ</th>
                  <th className="pb-3 pr-4">คะแนน</th>
                  <th className="pb-3">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allElections.slice(0, 5).map((election) => (
                  <tr key={election.id} className="hover:bg-white/50">
                    <td className="py-4 pr-4 font-medium text-dark-slate">
                      {election.title}
                    </td>
                    <td className="py-4 pr-4 text-sm text-cool-gray">
                      {formatThaiDate(election.start_date)}
                    </td>
                    <td className="py-4 pr-4 text-sm text-cool-gray">
                      {formatThaiDate(election.end_date)}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          election.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-700"
                            : election.status === "CLOSED"
                              ? "bg-slate-100 text-slate-600"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {election.status === "OPEN"
                          ? "เปิด"
                          : election.status === "CLOSED"
                            ? "ปิด"
                            : "รอเปิด"}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-sm font-semibold text-dark-slate">
                      {election.total_votes}
                    </td>
                    <td className="py-4">
                      <ElectionControlButtons
                        electionId={election.id}
                        currentStatus={election.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
