import { logAdminAction } from "@/lib/actions/activities";
import { getAdminById, getCurrentAdmin } from "@/lib/actions/admin-auth";
import { getElectionById } from "@/lib/actions/elections";
import { getElectionResults } from "@/lib/actions/votes";
import { formatElectionResultsCSV } from "@/lib/csv-formatter";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Verify Admin Session
    const session = await getCurrentAdmin();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const electionId = parseInt(id, 10);

    if (isNaN(electionId)) {
      return new NextResponse("Invalid Election ID", { status: 400 });
    }

    // 2. Fetch Election Data
    const election = await getElectionById(electionId);
    if (!election) {
      return new NextResponse("Election not found", { status: 404 });
    }

    // 3. Fetch Results
    const { turnout, positions } = await getElectionResults(electionId);

    // 4. Calculate total eligible voters from turnout data
    // (turnout.totalEligible is already computed in getElectionResults)

    // 5. Generate CSV
    const csvContent = formatElectionResultsCSV({
      election,
      turnout,
      positionResults: positions,
      totalEligible: turnout.totalEligible,
    });

    // 6. Log Activity (fire and forget)
    // We need to fetch admin details for logging (optional but good practice)
    // Note: session.admin already has the info we need if we updated the type,
    // but let's just log the action safely.
    // Ideally we should use logAdminAction but it's a server action,
    // calling it from route might need await.
    const admin = await getAdminById(session.adminId);
    if (admin) {
      // We can't easily call server action here without correct context sometimes,
      // but since we are in a route handler, we can just let it be or try to call it.
      // For simplicity, we skip complex logging here OR use the internal logAdminAction if compatible.
      // Assuming logAdminAction works on server side (it does).
      await logAdminAction("Export CSV", `Election: ${election.title}`);
    }

    // 7. Return Response
    // Filename: election-{id}-results.csv
    const filename = `election-${electionId}-results.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export CSV Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
