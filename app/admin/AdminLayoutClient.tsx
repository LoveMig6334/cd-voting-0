"use client";

import { AdminNavbar } from "@/components/admin/AdminNavbar";
import { ACCESS_LEVELS, AccessLevel, AdminUser } from "@/lib/admin-types";
import { canAccessPage, getDefaultPage, PageName } from "@/lib/permissions";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";

// Props interface - AdminRow is passed from server but we only need these fields
interface AdminData {
  id: number;
  username: string;
  display_name: string | null;
  access_level: AccessLevel;
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

// Hook to check if admin has access to a page
export function useHasAccess(page: PageName): boolean {
  const admin = useAdmin();
  if (!admin) return false;
  return canAccessPage(page, admin.accessLevel);
}

// Helper to check if current admin is root
export function useIsRoot(): boolean {
  const admin = useAdmin();
  return admin?.accessLevel === ACCESS_LEVELS.ROOT;
}

// Helper to check if current admin can manage admins
export function useCanManageAdmins(): boolean {
  const admin = useAdmin();
  if (!admin) return false;
  return (
    admin.accessLevel === ACCESS_LEVELS.ROOT ||
    admin.accessLevel === ACCESS_LEVELS.SYSTEM_ADMIN
  );
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
  admin: AdminData | null;
}

// Map pathname to page name for permission checking
function getPageNameFromPath(pathname: string): PageName | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/elections")) return "elections";
  if (pathname.startsWith("/admin/students")) return "students";
  if (pathname.startsWith("/admin/results")) return "results";
  if (pathname.startsWith("/admin/admins")) return "adminManagement";
  if (pathname.startsWith("/admin/activity")) return "activity";
  return null;
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

  // Permission-based redirect for restricted pages
  useEffect(() => {
    if (admin && !isLoginPage) {
      const pageName = getPageNameFromPath(pathname);

      if (pageName && !canAccessPage(pageName, admin.access_level)) {
        // Redirect to their default page
        const defaultPage = getDefaultPage(admin.access_level);
        router.push(defaultPage);
      }
    }
  }, [admin, pathname, isLoginPage, router]);

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
    accessLevel: admin.access_level,
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
