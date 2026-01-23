import {
  getActivitiesByTypeForDisplay,
  getAllActivitiesForDisplay,
} from "@/lib/actions/activities";
import { ActivityDisplayItem, ActivityType } from "@/lib/db";
import Link from "next/link";

// Valid activity types for filtering
const VALID_TYPES: ActivityType[] = [
  "vote_cast",
  "admin_action",
  "election_change",
  "system_check",
];

// Activity type filter configuration
const ACTIVITY_FILTERS: {
  type: "all" | ActivityType;
  label: string;
  icon: string;
}[] = [
  {
    type: "all",
    label: "ทั้งหมด",
    icon: "list",
  },
  {
    type: "vote_cast",
    label: "การลงคะแนน",
    icon: "how_to_reg",
  },
  {
    type: "admin_action",
    label: "การจัดการ",
    icon: "edit",
  },
  {
    type: "election_change",
    label: "การเลือกตั้ง",
    icon: "how_to_vote",
  },
  {
    type: "system_check",
    label: "ระบบ",
    icon: "check_circle",
  },
];

// Activity List Component
function ActivityList({ activities }: { activities: ActivityDisplayItem[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
          history
        </span>
        <p className="text-slate-500 font-medium">ไม่มีกิจกรรม</p>
        <p className="text-slate-400 text-sm mt-1">
          ยังไม่มีกิจกรรมประเภทนี้ในระบบ
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`p-2.5 rounded-xl shrink-0 ${activity.iconBg}`}>
              <span
                className={`material-symbols-outlined ${activity.iconColor}`}
              >
                {activity.icon}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900">{activity.title}</h4>
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                {activity.description}
              </p>
              <time className="text-xs text-slate-400 mt-2 block">
                {activity.time}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Page props with searchParams
interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AllActivitiesPage({ searchParams }: PageProps) {
  // Get filter from URL search params
  const params = await searchParams;
  const filterParam = params.filter;

  // Validate filter type
  const activeFilter: "all" | ActivityType =
    filterParam && VALID_TYPES.includes(filterParam as ActivityType)
      ? (filterParam as ActivityType)
      : "all";

  // Fetch activities based on filter
  const activities =
    activeFilter === "all"
      ? await getAllActivitiesForDisplay()
      : await getActivitiesByTypeForDisplay(activeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              กิจกรรมทั้งหมด
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              ประวัติกิจกรรมและการดำเนินการในระบบ
            </p>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          {activities.length} กิจกรรม
        </div>
      </div>

      {/* Filter Tabs - Using Link for navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map((filter) => {
            const isActive = filter.type === activeFilter;
            const href =
              filter.type === "all"
                ? "/admin/activity"
                : `/admin/activity?filter=${filter.type}`;

            return (
              <Link
                key={filter.type}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-royal-blue text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {filter.icon}
                </span>
                {filter.label}
                {isActive && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                    {activities.length}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <ActivityList activities={activities} />
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-slate-400">
        ระบบเก็บประวัติกิจกรรมล่าสุด 100 รายการ
      </div>
    </div>
  );
}
