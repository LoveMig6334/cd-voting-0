"use client";

import { usePathname, useRouter } from "next/navigation";
import React from "react";

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { name: "หน้าหลัก", icon: "dashboard", path: "/" },
    { name: "การลงคะแนน", icon: "how_to_vote", path: "/me/votes" },
    { name: "ผลลัพธ์", icon: "bar_chart", path: "/analytics" }, // Pointing to analytics for now
    { name: "โปรไฟล์", icon: "person", path: "/me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/95 dark:bg-background-dark/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => router.push(item.path)}
            className={`flex flex-col items-center gap-1 w-full transition-colors ${
              isActive(item.path)
                ? "text-primary"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <span
              className={`material-symbols-outlined ${
                isActive(item.path) ? "filled" : ""
              }`}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
