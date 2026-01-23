import { getCurrentAdmin } from "@/lib/actions/admin-auth";
import { AdminLayoutClient } from "./AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if this is the login page (via URL check isn't available in layout)
  // We'll handle this by making login page a separate route group
  // For now, we check admin session

  const session = await getCurrentAdmin();

  // If not logged in and not on login page, redirect
  // Note: This layout wraps all /admin/* routes including /admin/login
  // The login page will render without the navbar since it handles its own layout

  return (
    <AdminLayoutClient admin={session?.admin || null}>
      {children}
    </AdminLayoutClient>
  );
}
