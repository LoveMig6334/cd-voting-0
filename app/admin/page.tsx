"use client";

import { formatThaiDate, useDashboardData } from "@/hooks/useDashboardData";
import { ActivityDisplayItem } from "@/lib/activity-store";
import Link from "next/link";

// Stats Card Component with Glassmorphism
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconColor: string;
  badge?: { text: string; color: string };
  trend?: { value: string; isPositive: boolean };
  progress?: number;
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
  trend,
  progress,
  indicator,
  href,
}: StatsCardProps) {
  const cardClassName =
    "glass-card rounded-2xl p-6 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(15,95,194,0.15)] hover:border-royal-blue/30 block";

  const cardContent = (
    <>
      {/* Watermark Icon */}
      <span className={`watermark-icon material-symbols-outlined ${iconColor}`}>
        {icon}
      </span>

      <div className="relative z-10">
        {/* Top Row: Icon + Badge/Trend/Indicator */}
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
          {trend && (
            <span
              className={`${
                trend.isPositive
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-red-500 bg-red-50"
              } text-xs px-2 py-1 rounded-lg font-semibold flex items-center gap-0.5`}
            >
              <span className="material-symbols-outlined text-sm">
                {trend.isPositive ? "trending_up" : "trending_down"}
              </span>
              {trend.value}
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

        {/* Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-slate-200 to-transparent mb-4"></div>

        {/* Label */}
        <h3 className="text-cool-gray text-sm font-medium uppercase tracking-wide">
          {title}
        </h3>

        {/* Value */}
        <p className="text-4xl font-bold text-dark-slate mt-2 tracking-tight">
          {value}
        </p>

        {subtitle && <p className="text-xs text-cool-gray mt-2">{subtitle}</p>}

        {progress !== undefined && (
          <div className="neon-progress-track h-2 mt-4">
            <div
              className="neon-progress-bar h-2"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
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

// Activity Timeline Item - Updated to use ActivityDisplayItem
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

  return (
    <div className="relative pl-10">
      {/* Timeline Line */}
      <div className="timeline-line"></div>

      <ul className="space-y-6">
        {activities.map((activity) => (
          <li key={activity.id} className="relative">
            {/* Timeline Badge */}
            <div
              className={`timeline-badge absolute -left-10 ${activity.iconBg}`}
            >
              <span
                className={`material-symbols-outlined ${activity.iconColor} text-sm`}
              >
                {activity.icon}
              </span>
            </div>

            <div className="glass-card rounded-xl p-4 hover:bg-white/90 transition-all">
              <h4 className="text-sm font-semibold text-dark-slate">
                {activity.title}
              </h4>
              <p className="text-xs font-normal text-cool-gray mt-1">
                {activity.description}
              </p>
              <time className="block text-xs font-medium text-royal-blue/70 mt-2">
                {activity.time}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Candidate Progress Bar with Neon Effect
interface Candidate {
  name: string;
  percentage: number;
}

function CandidateProgress({ candidates }: { candidates: Candidate[] }) {
  if (candidates.length === 0) {
    return (
      <div className="text-center py-4 text-cool-gray">
        <p className="text-sm">ยังไม่มีผู้สมัคร</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {candidates.map((candidate, index) => (
        <div key={index}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-dark-slate font-medium">
              {candidate.name}
            </span>
            <span className="text-royal-blue font-bold">
              {candidate.percentage}%
            </span>
          </div>
          <div className="neon-progress-track h-2.5">
            <div
              className="neon-progress-bar h-2.5"
              style={{ width: `${candidate.percentage}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// No Active Election Placeholder
function NoActiveElection() {
  return (
    <div className="ticket-card rounded-2xl overflow-hidden">
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
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-48"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-6 h-40">
            <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="glass-card rounded-2xl h-96"></div>
        </div>
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl h-96"></div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const {
    totalStudents,
    studentTrend,
    activeElections,
    totalVotesInActiveElections,
    voterTurnoutPercentage,
    systemStatus,
    primaryActiveElection,
    recentActivities,
    closeElection,
    isLoading,
  } = useDashboardData();

  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-dark-slate">
            ยินดีต้อนรับกลับ, ผู้ดูแลระบบ
          </h2>
          <p className="text-cool-gray mt-1">
            นี่คือภาพรวมล่าสุดของการเลือกตั้งโรงเรียน
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-cool-gray bg-white/50 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            เข้าสู่ระบบล่าสุด: วันนี้, 8:30 น.
          </span>
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
          value={totalStudents.toLocaleString()}
          icon="school"
          iconColor="text-royal-blue"
          trend={studentTrend}
          href="/admin/students"
        />
        <StatsCard
          title="การเลือกตั้งที่เปิด"
          value={activeElections}
          icon="how_to_vote"
          iconColor="text-emerald-600"
          badge={
            activeElections > 0
              ? { text: "เปิด", color: "bg-emerald-100 text-emerald-700" }
              : { text: "ปิด", color: "bg-slate-100 text-slate-600" }
          }
          href="/admin/elections"
        />
        <StatsCard
          title="คะแนนทั้งหมด"
          value={totalVotesInActiveElections.toLocaleString()}
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
          value={systemStatus === "online" ? "พร้อมใช้งาน" : "ออฟไลน์"}
          icon="dns"
          iconColor="text-orange-600"
          indicator={{
            text: systemStatus === "online" ? "ออนไลน์" : "ออฟไลน์",
            pulse: systemStatus === "online",
          }}
          href="/admin/settings"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Election Card - Premium Ticket Design */}
        <div className="lg:col-span-2">
          {primaryActiveElection ? (
            <div className="ticket-card rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-royal-blue/5 to-transparent">
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
                    {primaryActiveElection.description}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/admin/elections/${primaryActiveElection.id}/results`}
                    className="bg-linear-to-r from-royal-blue to-cyan-500 hover:from-royal-blue/90 hover:to-cyan-500/90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-royal-blue/25 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">
                      analytics
                    </span>
                    ผลลัพธ์สด
                  </Link>
                  <button
                    onClick={() => closeElection(primaryActiveElection.id)}
                    className="glass-card border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    ปิด
                  </button>
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
                        {formatThaiDate(primaryActiveElection.startDate)}
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
                        {formatThaiDate(primaryActiveElection.endDate)}
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
                        การมีส่วนร่วม
                      </p>
                      <p className="text-sm font-bold text-dark-slate">
                        {primaryActiveElection.voterTurnout.percentage}%
                        ลงคะแนนแล้ว
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Progress */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-dark-slate flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-royal-blue">
                      trending_up
                    </span>
                    แนวโน้มผู้สมัครนำ
                  </h4>
                  <CandidateProgress
                    candidates={primaryActiveElection.topCandidates}
                  />
                </div>
              </div>

              <div className="bg-linear-to-r from-royal-blue/5 via-transparent to-cyan-500/5 px-6 py-4 border-t border-slate-100/50 flex justify-center">
                <Link
                  href={`/admin/elections/${primaryActiveElection.id}/results`}
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
            <NoActiveElection />
          )}
        </div>

        {/* Activity Timeline - Vertical Glass Pane */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-2xl h-full flex flex-col">
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
            <div className="p-4 border-t border-slate-100/50 text-center">
              <button className="text-sm font-semibold text-royal-blue hover:text-cyan-600 transition-colors flex items-center gap-1 mx-auto">
                ดูกิจกรรมทั้งหมด
                <span className="material-symbols-outlined text-sm">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
