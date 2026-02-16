"use client";

import { useAdmin } from "@/app/admin/AdminLayoutClient";
import { getRecentActivitiesForDisplay } from "@/lib/actions/activities";
import { adminLogoutAction } from "@/lib/actions/admin-auth";
import {
  ACCESS_LEVEL_LABELS,
  ACCESS_LEVELS,
  AccessLevel,
} from "@/lib/admin-types";
import { ActivityDisplayItem } from "@/lib/db";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { canAccessPage, PageName } from "@/lib/permissions";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { NotificationItem } from "./NotificationItem";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  page: PageName;
}

const allNavItems: NavItem[] = [
  { name: "แดชบอร์ด", href: "/admin", icon: "dashboard", page: "dashboard" },
  {
    name: "การเลือกตั้ง",
    href: "/admin/elections",
    icon: "how_to_vote",
    page: "elections",
  },
  {
    name: "นักเรียน",
    href: "/admin/students",
    icon: "school",
    page: "students",
  },
  {
    name: "ผลลัพธ์",
    href: "/admin/results",
    icon: "bar_chart",
    page: "results",
  },
  {
    name: "จัดการ Admin",
    href: "/admin/admins",
    icon: "admin_panel_settings",
    page: "adminManagement",
  },
];

export const AdminNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityDisplayItem[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Ref for click-outside detection
  const notificationRef = useRef<HTMLDivElement>(null);

  // Memoized close handler for click-outside
  const closeNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  // Click-outside hook for notification dropdown
  useClickOutside(notificationRef, closeNotifications, notificationsOpen);

  // Load activities and check for unread
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const data = await getRecentActivitiesForDisplay(5);
        setActivities(data);

        // Check unread status
        if (data.length > 0) {
          try {
            const lastReadId = localStorage.getItem("lastCheckedActivityId");
            const latestId = data[0].id.toString();
            if (lastReadId !== latestId) {
              setHasUnread(true);
            }
          } catch {
            // localStorage may be unavailable (private browsing, etc.)
          }
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchActivities();
    // Refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleNotifications = () => {
    if (!notificationsOpen && activities.length > 0) {
      // Mark as read when opening
      try {
        localStorage.setItem(
          "lastCheckedActivityId",
          activities[0].id.toString(),
        );
      } catch {
        // localStorage may be unavailable
      }
      setHasUnread(false);
    }
    setNotificationsOpen(prev => !prev);
    setProfileMenuOpen(false);
  };

  // Filter nav items based on access level
  const navItems = admin
    ? allNavItems.filter((item) => canAccessPage(item.page, admin.accessLevel))
    : [];

  const isActive = (href: string) => {
    if (href === "/admin" && pathname === "/admin") return true;
    if (href !== "/admin" && pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = () => {
    startTransition(async () => {
      await adminLogoutAction();
      router.push("/admin/login");
      router.refresh();
    });
  };

  // Get role badge color
  const getRoleBadgeColor = (level: AccessLevel): string => {
    switch (level) {
      case ACCESS_LEVELS.ROOT:
        return "bg-red-100 text-red-700";
      case ACCESS_LEVELS.SYSTEM_ADMIN:
        return "bg-blue-100 text-blue-700";
      case ACCESS_LEVELS.TEACHER:
        return "bg-green-100 text-green-700";
      case ACCESS_LEVELS.OBSERVER:
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-2">
      <nav className="glass-navbar rounded-2xl max-w-7xl mx-auto z-50">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/admin"
              className="shrink-0 flex items-center gap-3 group"
            >
              <div className="relative flex items-center justify-center w-10 h-10 bg-linear-to-br from-royal-blue to-primary rounded-xl transform group-hover:scale-105 transition-transform duration-200 shadow-lg">
                <span className="material-symbols-outlined text-white text-xl">
                  how_to_vote
                </span>
              </div>
              <div className="flex flex-col justify-center -space-y-0.5">
                <h1 className="text-lg font-extrabold tracking-tight leading-none text-dark-slate">
                  <span className="text-vivid-yellow drop-shadow-sm">CD</span>{" "}
                  <span className="text-royal-blue">VOTING 0</span>
                </h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? "bg-royal-blue/10 text-royal-blue shadow-sm"
                        : "text-cool-gray hover:bg-slate-100 hover:text-dark-slate"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {item.icon}
                    </span>
                    <span className="hidden lg:inline">{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - Profile & Logout */}
            <div className="hidden md:flex items-center gap-3">
              {/* Notification Badge - Only for Root/System Admin */}
              {admin && admin.accessLevel <= ACCESS_LEVELS.SYSTEM_ADMIN && (
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={toggleNotifications}
                    className={`relative p-2 rounded-xl transition-all duration-200 ${
                      notificationsOpen
                        ? "bg-royal-blue/10 text-royal-blue shadow-sm"
                        : "text-cool-gray hover:text-royal-blue hover:bg-royal-blue/5"
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      notifications
                    </span>
                    {hasUnread && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-vivid-yellow rounded-full ring-2 ring-white animate-pulse shadow-[0_0_8px_rgba(255,191,0,0.6)]"></span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 w-80 mt-2 origin-top-right glass-card rounded-2xl shadow-xl ring-1 ring-black/5 focus:outline-none animate-fade-in z-50 overflow-hidden flex flex-col">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="text-sm font-bold text-dark-slate flex items-center gap-2">
                          <span className="material-symbols-outlined text-royal-blue text-lg">
                            history
                          </span>
                          กิจกรรมล่าสุด
                        </h3>
                        {hasUnread && (
                          <span className="text-[10px] font-bold text-vivid-yellow uppercase tracking-wider bg-vivid-yellow/10 px-2 py-0.5 rounded-full">
                            ใหม่
                          </span>
                        )}
                      </div>

                      <div className="p-2 max-h-[350px] overflow-y-auto no-scrollbar">
                        {activities.length === 0 ? (
                          <div className="py-8 text-center">
                            <span className="material-symbols-outlined text-3xl text-cool-gray/30 mb-1 block">
                              notifications_off
                            </span>
                            <p className="text-xs text-cool-gray">
                              ยังไม่มีกิจกรรม
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {activities.map((activity) => (
                              <NotificationItem
                                key={activity.id}
                                activity={activity}
                                onNavigate={closeNotifications}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <Link
                        href="/admin/activity"
                        onClick={closeNotifications}
                        className="p-3 text-center border-t border-slate-100 text-xs font-bold text-royal-blue hover:text-cyan-600 transition-colors bg-slate-50/30"
                      >
                        ดูกิจกรรมทั้งหมด
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  onBlur={() =>
                    setTimeout(() => setProfileMenuOpen(false), 150)
                  }
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-dark-slate hover:bg-slate-100 focus:outline-none transition-colors"
                >
                  <div className="h-8 w-8 rounded-xl bg-linear-to-br from-royal-blue to-cyan-500 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-white text-sm">
                      person
                    </span>
                  </div>
                  <div className="hidden lg:flex flex-col items-start">
                    <span className="text-dark-slate text-xs font-semibold">
                      {admin?.displayName || admin?.username || "Admin"}
                    </span>
                    {admin && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${getRoleBadgeColor(admin.accessLevel)}`}
                      >
                        {ACCESS_LEVEL_LABELS[admin.accessLevel]}
                      </span>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-sm text-cool-gray">
                    expand_more
                  </span>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 w-56 mt-2 origin-top-right glass-card rounded-xl shadow-lg ring-1 ring-black/5 focus:outline-none animate-fade-in z-50">
                    <div className="py-1">
                      {/* Show role badge on mobile */}
                      {admin && (
                        <div className="px-4 py-2 border-b border-slate-100 lg:hidden">
                          <p className="text-sm font-medium text-dark-slate">
                            {admin.displayName || admin.username}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(admin.accessLevel)}`}
                          >
                            {ACCESS_LEVEL_LABELS[admin.accessLevel]}
                          </span>
                        </div>
                      )}
                      <Link
                        href="/admin/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark-slate hover:bg-slate-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg text-cool-gray">
                          account_circle
                        </span>
                        โปรไฟล์
                      </Link>
                      <hr className="my-1 border-slate-100" />
                      <button
                        onClick={handleLogout}
                        disabled={isPending}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-lg">
                          logout
                        </span>
                        {isPending ? "กำลังออก..." : "ออกจากระบบ"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-xl text-cool-gray hover:text-dark-slate hover:bg-slate-100 focus:outline-none transition-colors"
              >
                <span className="sr-only">เปิดเมนูหลัก</span>
                <span className="material-symbols-outlined">
                  {mobileMenuOpen ? "close" : "menu"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 animate-fade-in">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-royal-blue/10 text-royal-blue"
                      : "text-cool-gray hover:bg-slate-50 hover:text-dark-slate"
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {item.icon}
                  </span>
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-slate-100">
              <div className="flex items-center px-4">
                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-royal-blue to-cyan-500 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-white">
                    person
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-dark-slate">
                    {admin?.displayName || admin?.username || "Admin"}
                  </div>
                  {admin && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(admin.accessLevel)}`}
                    >
                      {ACCESS_LEVEL_LABELS[admin.accessLevel]}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={handleLogout}
                  disabled={isPending}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xl">
                    logout
                  </span>
                  {isPending ? "กำลังออก..." : "ออกจากระบบ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};
