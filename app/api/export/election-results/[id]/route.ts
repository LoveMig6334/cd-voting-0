import { logAdminAction } from "@/lib/actions/activities";
import { getCurrentAdmin } from "@/lib/actions/admin-auth";
import { getElectionById } from "@/lib/actions/elections";
import { getElectionResults } from "@/lib/actions/votes";
import { formatElectionResultsCSV } from "@/lib/csv-formatter";
import { after } from "next/server";
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

    // 2. Fetch Election Data and Results in parallel
    const [election, results] = await Promise.all([
      getElectionById(electionId),
      getElectionResults(electionId),
    ]);
    if (!election) {
      return new NextResponse("Election not found", { status: 404 });
    }

    const { turnout, positions } = results;

    // 4. Calculate total eligible voters from turnout data
    // (turnout.totalEligible is already computed in getElectionResults)

    // 5. Generate CSV
    const csvContent = formatElectionResultsCSV({
      election,
      turnout,
      positionResults: positions,
      totalEligible: turnout.totalEligible,
    });

    // 6. Log Activity (non-blocking)
    after(() => logAdminAction("Export CSV", `Election: ${election.title}`));

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
