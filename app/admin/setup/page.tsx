import { AdminRow, query } from "@/lib/db";
import { redirect } from "next/navigation";

// This page is disabled after first admin is created
// To re-enable, delete all admins from the database

export default async function AdminSetupPage() {
  // Check if any admin exists
  const admins = await query<AdminRow>("SELECT id FROM admins LIMIT 1");

  if (admins.length > 0) {
    // Admin already exists, redirect to login
    redirect("/admin/login");
  }

  // No admins exist - this should not happen since we're protecting the route
  // This page is now disabled
  redirect("/admin/login");
}
