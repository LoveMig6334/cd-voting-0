"use client";

import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  // Login page has its own full-screen layout, so render children directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen mesh-gradient-bg flex flex-col">
      <AdminNavbar />
      <main className="grow p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <footer className="mt-auto pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="glass-panel rounded-2xl px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-cool-gray">
            <p className="text-dark-slate/70">
              © 2024 CD Voting 0. สงวนลิขสิทธิ์
            </p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-royal-blue transition-colors">
                ศูนย์ช่วยเหลือ
              </a>
              <a href="#" className="hover:text-royal-blue transition-colors">
                นโยบายความเป็นส่วนตัว
              </a>
              <a href="#" className="hover:text-royal-blue transition-colors">
                ข้อกำหนดการใช้งาน
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
