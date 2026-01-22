import { getAllAdmins, getCurrentAdmin } from "@/lib/actions/admin-auth";
import { canAccessPage } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { AdminManagementClient } from "./AdminManagementClient";

export default async function AdminManagementPage() {
  // Check auth and permissions
  const session = await getCurrentAdmin();

  if (!session) {
    redirect("/admin/login");
  }

  if (!canAccessPage("adminManagement", session.admin.access_level)) {
    redirect("/admin");
  }

  // Get all admins
  const admins = await getAllAdmins();

  return (
    <AdminManagementClient
      admins={admins}
      currentAdminId={session.admin.id}
      currentAccessLevel={session.admin.access_level}
    />
  );
}
