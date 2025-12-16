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
  { name: "Dashboard", href: "/admin", icon: "dashboard" },
  { name: "Manage Elections", href: "/admin/elections", icon: "how_to_vote" },
  { name: "Students", href: "/admin/students", icon: "school" },
  { name: "Result Summary", href: "/admin/results", icon: "bar_chart" },
  { name: "Settings", href: "/admin/settings", icon: "settings" },
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
    // TODO: Implement actual logout logic
    router.push("/login");
  };

  return (
    <nav className="bg-primary text-white shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/admin"
            className="flex-shrink-0 flex items-center gap-2 group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 bg-primary-dark rounded-lg transform group-hover:scale-105 transition-transform duration-200 shadow-inner">
              <span className="material-symbols-outlined text-accent-yellow text-2xl">
                how_to_vote
              </span>
            </div>
            <div className="flex flex-col justify-center -space-y-1">
              <h1 className="text-xl font-extrabold tracking-tight leading-none">
                <span className="text-accent-yellow drop-shadow-sm">CD</span>{" "}
                VOTING 0
              </h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-2 lg:space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-primary-dark text-white shadow-sm"
                      : "text-blue-100 hover:bg-primary-dark/50 hover:text-white hover:shadow-sm"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - Profile & Logout */}
          <div className="hidden md:flex items-center gap-4">
            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                onBlur={() => setTimeout(() => setProfileMenuOpen(false), 150)}
                className="flex items-center gap-2 text-sm font-medium text-white hover:text-blue-100 focus:outline-none transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary-dark flex items-center justify-center border-2 border-blue-300 shadow-sm">
                  <span className="material-symbols-outlined text-sm">
                    person
                  </span>
                </div>
                <span className="hidden lg:inline-block">Admin</span>
                <span className="material-symbols-outlined text-sm">
                  expand_more
                </span>
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 w-48 mt-2 origin-top-right bg-white rounded-lg shadow-lg ring-1 ring-black/5 focus:outline-none animate-fade-in z-50">
                  <div className="py-1">
                    <Link
                      href="/admin/profile"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/admin/settings"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Settings
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-blue-100 hover:text-white p-2 rounded-full hover:bg-primary-dark transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-primary-dark inline-flex items-center justify-center p-2 rounded-md text-blue-200 hover:text-white hover:bg-primary-dark/80 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              <span className="material-symbols-outlined">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-primary-dark animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary text-white"
                    : "text-blue-100 hover:bg-primary/50 hover:text-white"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-primary">
            <div className="flex items-center px-5">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center border-2 border-blue-300">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-white">Admin</div>
                <div className="text-sm font-medium text-blue-200">
                  admin@school.edu
                </div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-base font-medium text-blue-100 hover:bg-primary/50 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  logout
                </span>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
