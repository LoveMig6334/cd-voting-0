"use client";

import {
  ActivityType,
  getAllActivities,
  subscribeToActivities,
  toDisplayItem,
} from "@/lib/activity-store";
import Link from "next/link";
import { useEffect, useState } from "react";

// Activity type filter configuration
const ACTIVITY_FILTERS: {
  type: "all" | ActivityType;
  label: string;
  icon: string;
  color: string;
}[] = [
  {
    type: "all",
    label: "ทั้งหมด",
    icon: "list",
    color: "text-slate-600 bg-slate-100",
  },
  {
    type: "vote_cast",
    label: "การลงคะแนน",
    icon: "how_to_reg",
    color: "text-royal-blue bg-royal-blue/10",
  },
  {
    type: "admin_action",
    label: "การจัดการ",
    icon: "edit",
    color: "text-amber-600 bg-amber-100",
  },
  {
    type: "election_change",
    label: "การเลือกตั้ง",
    icon: "how_to_vote",
    color: "text-violet-600 bg-violet-100",
  },
  {
    type: "system_check",
    label: "ระบบ",
    icon: "check_circle",
    color: "text-emerald-600 bg-emerald-100",
  },
];

export default function AllActivitiesPage() {
  const [activities, setActivities] = useState(getAllActivities());
  const [activeFilter, setActiveFilter] = useState<"all" | ActivityType>("all");

  // Subscribe to activity changes for real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToActivities((newActivities) => {
      setActivities(newActivities);
    });
    return unsubscribe;
  }, []);

  // Filter activities based on selected type
  const filteredActivities =
    activeFilter === "all"
      ? activities
      : activities.filter((a) => a.type === activeFilter);

  // Convert to display format
  const displayActivities = filteredActivities.map(toDisplayItem);

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
          {displayActivities.length} กิจกรรม
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_FILTERS.map((filter) => (
            <button
              key={filter.type}
              onClick={() => setActiveFilter(filter.type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeFilter === filter.type
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {filter.icon}
              </span>
              {filter.label}
              {activeFilter === filter.type && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {displayActivities.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {displayActivities.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">
              history
            </span>
            <p className="text-slate-500 font-medium">ไม่มีกิจกรรม</p>
            <p className="text-slate-400 text-sm mt-1">
              {activeFilter === "all"
                ? "ยังไม่มีกิจกรรมในระบบ"
                : "ไม่พบกิจกรรมประเภทนี้"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`p-2.5 rounded-xl shrink-0 ${activity.iconBg}`}
                  >
                    <span
                      className={`material-symbols-outlined ${activity.iconColor}`}
                    >
                      {activity.icon}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900">
                      {activity.title}
                    </h4>
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
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-slate-400">
        ระบบเก็บประวัติกิจกรรมล่าสุด 100 รายการ
      </div>
    </div>
  );
}
