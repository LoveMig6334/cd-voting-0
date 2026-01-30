import { ElectionWithDetails } from "./actions/elections";
import { PositionResult, VoterTurnout } from "./actions/votes";

interface FormatterInput {
  election: ElectionWithDetails;
  turnout: VoterTurnout;
  positionResults: PositionResult[];
  totalEligible: number;
}

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return "";
  }
  const stringValue = String(field);
  // If the field contains comma, quote, or newline, wrap it in quotes and escape internal quotes
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Format election results into a CSV string (with UTF-8 BOM)
 */
export function formatElectionResultsCSV(data: FormatterInput): string {
  const { election, turnout, positionResults, totalEligible } = data;
  const rows: string[] = [];

  // Add UTF-8 BOM for Excel compatibility with Thai characters
  const BOM = "\uFEFF";

  // 1. Header Section
  rows.push(`Election Results Report`);
  rows.push(`Title,${escapeField(election.title)}`);
  rows.push(
    `Date Generated,${escapeField(new Date().toLocaleString("th-TH"))}`,
  );
  rows.push(`Total Eligible Voters,${totalEligible}`);
  rows.push(`Total Votes,${turnout.totalVoted}`);
  rows.push(`Voter Turnout,${turnout.percentage}%`);
  rows.push(""); // Empty line

  // 2. Positions Section
  rows.push("Position Results");
  rows.push("Position,Rank,Candidate Name,Votes,Percentage,Status");

  for (const position of positionResults) {
    // Candidates
    if (position.candidates.length > 0) {
      // Find max votes for winner determination (simple logic based on highest votes)
      const maxVotes = Math.max(...position.candidates.map((c) => c.votes));

      for (const candidate of position.candidates) {
        let status = "";
        // Simple winner check: if votes > 0 and votes == maxVotes and votes >= abstain
        if (
          candidate.votes > 0 &&
          candidate.votes === maxVotes &&
          candidate.votes >= position.abstainCount
        ) {
          status = "Winner/Tie";
        }

        rows.push(
          `${escapeField(position.positionTitle)},${candidate.rank},${escapeField(
            candidate.candidateName,
          )},${candidate.votes},${candidate.percentage}%,${status}`,
        );
      }
    } else {
      // No candidates case
      rows.push(
        `${escapeField(position.positionTitle)},-,"No Candidates",-,-,-`,
      );
    }

    // Abstain Row
    if (position.abstainCount > 0) {
      rows.push(
        `${escapeField(position.positionTitle)},-,Abstain (ไม่ลงคะแนน),${
          position.abstainCount
        },${position.abstainPercentage}%,`,
      );
    }
  }

  return BOM + rows.join("\n");
}
