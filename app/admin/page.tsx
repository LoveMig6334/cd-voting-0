import Link from "next/link";

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  badge?: { text: string; color: string };
  trend?: { value: string; isPositive: boolean };
  progress?: number;
  indicator?: { text: string; pulse?: boolean };
}

function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
  badge,
  trend,
  progress,
  indicator,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${iconBgColor} rounded-lg ${iconColor}`}>
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        {badge && (
          <span
            className={`${badge.color} text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wide`}
          >
            {badge.text}
          </span>
        )}
        {trend && (
          <span
            className={`${
              trend.isPositive ? "text-green-500" : "text-red-500"
            } text-sm font-medium flex items-center`}
          >
            <span className="material-symbols-outlined text-base mr-1">
              {trend.isPositive ? "arrow_upward" : "arrow_downward"}
            </span>
            {trend.value}
          </span>
        )}
        {indicator && (
          <div className="flex items-center gap-1">
            <span
              className={`w-2.5 h-2.5 bg-green-500 rounded-full ${
                indicator.pulse ? "animate-pulse" : ""
              }`}
            ></span>
            <span className="text-green-600 text-xs font-semibold uppercase">
              {indicator.text}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-2">{subtitle}</p>}
      {progress !== undefined && (
        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
          <div
            className="bg-purple-500 h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

// Activity Timeline Item
interface ActivityItem {
  id: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  time: string;
}

function ActivityTimeline({ activities }: { activities: ActivityItem[] }) {
  return (
    <ul className="relative border-l border-slate-200 ml-3 space-y-6">
      {activities.map((activity) => (
        <li key={activity.id} className="mb-4 ml-6">
          <span
            className={`absolute flex items-center justify-center w-6 h-6 ${activity.iconBg} rounded-full -left-3 ring-4 ring-white`}
          >
            <span
              className={`material-symbols-outlined ${activity.iconColor} text-xs`}
            >
              {activity.icon}
            </span>
          </span>
          <h4 className="text-sm font-semibold text-slate-900">
            {activity.title}
          </h4>
          <p className="mb-1 text-xs font-normal text-slate-500">
            {activity.description}
          </p>
          <time className="block text-xs font-normal text-slate-400">
            {activity.time}
          </time>
        </li>
      ))}
    </ul>
  );
}

// Candidate Progress Bar
interface Candidate {
  name: string;
  percentage: number;
  color: string;
}

function CandidateProgress({ candidates }: { candidates: Candidate[] }) {
  return (
    <div className="space-y-3">
      {candidates.map((candidate, index) => (
        <div key={index}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-700 font-medium">{candidate.name}</span>
            <span className="text-slate-500">{candidate.percentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div
              className={`${candidate.color} h-2 rounded-full transition-all`}
              style={{ width: `${candidate.percentage}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Mock data
const mockActivities: ActivityItem[] = [
  {
    id: 1,
    icon: "how_to_reg",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    title: "New Vote Cast",
    description: "Student ID #4829 voted in Student Council.",
    time: "Just now",
  },
  {
    id: 2,
    icon: "check_circle",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    title: "System Check",
    description: "Automated integrity check passed.",
    time: "14 mins ago",
  },
  {
    id: 3,
    icon: "edit",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    title: "Election Edited",
    description: 'Admin updated "Clubs" description.',
    time: "1 hour ago",
  },
  {
    id: 4,
    icon: "person_add",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    title: "New Registration",
    description: "Student batch import completed.",
    time: "3 hours ago",
  },
];

const mockCandidates: Candidate[] = [
  { name: "Sarah Jenkins", percentage: 45, color: "bg-blue-500" },
  { name: "Michael Chen", percentage: 32, color: "bg-indigo-400" },
  { name: "Jessica Wong", percentage: 23, color: "bg-cyan-400" },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back, Admin
          </h2>
          <p className="text-slate-500 mt-1">
            Here is the latest overview of the school elections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            Last login: Today, 8:30 AM
          </span>
          <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            View Reports
          </button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value="1,452"
          subtitle="Registered for voting"
          icon="school"
          iconBgColor="bg-blue-50"
          iconColor="text-primary"
          trend={{ value: "2.5%", isPositive: true }}
        />
        <StatsCard
          title="Active Elections"
          value="2"
          subtitle="Student Council & Clubs"
          icon="how_to_vote"
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
          badge={{ text: "Active", color: "bg-green-100 text-green-700" }}
        />
        <StatsCard
          title="Total Votes Cast"
          value="843"
          icon="ballot"
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
          progress={58}
        />
        <StatsCard
          title="System Status"
          value="Operational"
          subtitle="Server load: 12%"
          icon="dns"
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
          indicator={{ text: "Online", pulse: true }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Election Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Student Council 2025
                </h3>
                <p className="text-sm text-slate-500">
                  Cast your vote for the next student body representatives.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/admin/elections/1/results"
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">
                    analytics
                  </span>
                  Live Results
                </Link>
                <button className="border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Close Election
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Election Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">
                    calendar_today
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Start Date
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      Oct 20, 8:00 AM
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">
                    event
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      End Date
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      Oct 24, 5:00 PM
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-slate-400 mt-0.5">
                    group
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Participation
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      58% Voted
                    </p>
                  </div>
                </div>
              </div>

              {/* Candidate Progress */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-700">
                  Leading Candidates Trend
                </h4>
                <CandidateProgress candidates={mockCandidates} />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-center">
              <Link
                href="/admin/elections/1/results"
                className="text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
              >
                View Detailed Analytics
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Recent Activity
              </h3>
            </div>
            <div className="p-6 flex-grow overflow-y-auto max-h-[400px]">
              <ActivityTimeline activities={mockActivities} />
            </div>
            <div className="p-4 border-t border-slate-200 text-center">
              <button className="text-xs font-medium text-slate-500 hover:text-primary transition-colors">
                View All Activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
