"use client";

import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { AdminRow } from "@/lib/db";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

// Admin type for context
export interface AdminUser {
  id: number;
  username: string;
  displayName: string | null;
}

// Context
const AdminContext = createContext<AdminUser | null>(null);

// Hook to access admin user
export function useAdmin() {
  return useContext(AdminContext);
}

// Hook that requires admin (throws if not logged in)
export function useRequireAdmin() {
  const admin = useContext(AdminContext);
  if (!admin) {
    throw new Error(
      "useRequireAdmin must be used within authenticated admin pages",
    );
  }
  return admin;
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
  admin: AdminRow | null;
}

export function AdminLayoutClient({ children, admin }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  // Redirect to login if not authenticated and not on login page
  useEffect(() => {
    if (!admin && !isLoginPage) {
      router.push("/admin/login");
    }
  }, [admin, isLoginPage, router]);

  // Login page has its own full-screen layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not logged in and not on login page, show loading while redirecting
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient-bg">
        <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin border-t-primary" />
      </div>
    );
  }

  // Convert AdminRow to AdminUser
  const adminUser: AdminUser = {
    id: admin.id,
    username: admin.username,
    displayName: admin.display_name,
  };

  return (
    <AdminContext.Provider value={adminUser}>
      <div className="min-h-screen mesh-gradient-bg flex flex-col">
        <AdminNavbar />
        <main className="grow p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        <footer className="mt-auto pt-8 pb-8">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="glass-panel rounded-2xl px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-cool-gray">
              <p className="text-dark-slate/70">
                © 2026 CD Voting 0. สงวนลิขสิทธิ์
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
    </AdminContext.Provider>
  );
}
