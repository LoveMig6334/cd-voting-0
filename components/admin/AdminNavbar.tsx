"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: "แดชบอร์ด", href: "/admin", icon: "dashboard" },
  { name: "การเลือกตั้ง", href: "/admin/elections", icon: "how_to_vote" },
  { name: "นักเรียน", href: "/admin/students", icon: "school" },
  { name: "ผลลัพธ์", href: "/admin/results", icon: "bar_chart" },
  { name: "ตั้งค่า", href: "/admin/settings", icon: "settings" },
];

export const AdminNavbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin" && pathname === "/admin") return true;
    if (href !== "/admin" && pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = () => {
    router.push("/login");
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
              <div className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-br from-royal-blue to-primary rounded-xl transform group-hover:scale-105 transition-transform duration-200 shadow-lg">
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
              {/* Notification Badge */}
              <button className="relative p-2 text-cool-gray hover:text-royal-blue hover:bg-royal-blue/5 rounded-xl transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-vivid-yellow rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  onBlur={() =>
                    setTimeout(() => setProfileMenuOpen(false), 150)
                  }
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-dark-slate hover:bg-slate-100 focus:outline-none transition-colors"
                >
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-royal-blue to-cyan-500 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-white text-sm">
                      person
                    </span>
                  </div>
                  <span className="hidden lg:inline-block text-cool-gray">
                    ผู้ดูแลระบบ
                  </span>
                  <span className="material-symbols-outlined text-sm text-cool-gray">
                    expand_more
                  </span>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 w-48 mt-2 origin-top-right glass-card rounded-xl shadow-lg ring-1 ring-black/5 focus:outline-none animate-fade-in z-50">
                    <div className="py-1">
                      <Link
                        href="/admin/profile"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark-slate hover:bg-slate-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg text-cool-gray">
                          account_circle
                        </span>
                        โปรไฟล์
                      </Link>
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-dark-slate hover:bg-slate-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg text-cool-gray">
                          settings
                        </span>
                        ตั้งค่า
                      </Link>
                      <hr className="my-1 border-slate-100" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          logout
                        </span>
                        ออกจากระบบ
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
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-royal-blue to-cyan-500 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-white">
                    person
                  </span>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-dark-slate">
                    ผู้ดูแลระบบ
                  </div>
                  <div className="text-sm font-medium text-cool-gray">
                    admin@school.edu
                  </div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">
                    logout
                  </span>
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};
