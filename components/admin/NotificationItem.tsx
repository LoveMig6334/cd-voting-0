"use client";

import { ActivityDisplayItem } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NotificationItemProps {
  activity: ActivityDisplayItem;
  onNavigate: () => void;
}

/**
 * Helper to extract glow color from iconBg class for box-shadow
 */
function getGlowColor(bgClass: string): string {
  if (bgClass.includes("emerald")) return "rgba(16, 185, 129, 0.6)";
  if (bgClass.includes("royal-blue")) return "rgba(15, 95, 194, 0.6)";
  if (bgClass.includes("orange")) return "rgba(249, 115, 22, 0.6)";
  if (bgClass.includes("violet")) return "rgba(139, 92, 246, 0.6)";
  if (bgClass.includes("vivid-yellow") || bgClass.includes("yellow"))
    return "rgba(234, 179, 8, 0.6)";
  return "rgba(100, 116, 139, 0.6)";
}

export function NotificationItem({
  activity,
  onNavigate,
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    onNavigate();
    router.push("/admin/activity");
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex items-start gap-3 py-2 px-3 hover:bg-slate-50/50 rounded-xl transition-colors cursor-pointer group"
    >
      {/* Glowing Status Dot */}
      <div className="shrink-0 mt-1.5">
        <div
          className={`w-2 h-2 rounded-full ${activity.iconBg} transition-all duration-300 group-hover:scale-125`}
          style={{
            boxShadow: `0 0 10px ${getGlowColor(activity.iconBg)}`,
          }}
        />
      </div>

      {/* Content Container */}
      <div className="flex-1 min-w-0">
        {/* Minimized Row: Title + Time */}
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-[13px] font-medium text-dark-slate truncate">
            {activity.title}
          </h4>
          <time className="text-[10px] font-medium text-cool-gray/60 whitespace-nowrap">
            {activity.time}
          </time>
        </div>

        {/* Expandable Description */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isHovered ? "max-h-10 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"
          }`}
        >
          <p className="text-[11px] text-cool-gray line-clamp-2">
            {activity.description}
          </p>
        </div>
      </div>

      {/* Hover Indicator Arrow */}
      <span
        className={`material-symbols-outlined text-sm text-cool-gray/40 mt-1 transition-all duration-300 ${
          isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
        }`}
      >
        chevron_right
      </span>
    </div>
  );
}
