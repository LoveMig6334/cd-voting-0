import { ElectionWithDetails } from "../lib/actions/elections";
import { PositionResult, VoterTurnout } from "../lib/actions/votes";
import { formatElectionResultsCSV } from "../lib/csv-formatter";

describe("formatElectionResultsCSV", () => {
  const mockElection: ElectionWithDetails = {
    id: 1,
    title: "Student Election 2024",
    description: "Test Election",
    type: "student-committee",
    start_date: new Date("2024-05-20"),
    end_date: new Date("2024-05-21"),
    status: "CLOSED",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    total_votes: 100,
    positions: [],
    candidates: [],
  } as unknown as ElectionWithDetails;

  const mockTurnout: VoterTurnout = {
    totalEligible: 200,
    totalVoted: 100,
    notVoted: 100,
    percentage: 50,
  };

  const mockPositionResults: PositionResult[] = [
    {
      positionId: "pos1",
      positionTitle: "President",
      totalVotes: 100,
      candidates: [
        {
          candidateId: 101,
          candidateName: "John Doe",
          rank: 1,
          votes: 60,
          percentage: 60,
        },
        {
          candidateId: 102,
          candidateName: "Jane Smith",
          rank: 2,
          votes: 30,
          percentage: 30,
        },
      ],
      abstainCount: 10,
      abstainPercentage: 10,
    },
    {
      positionId: "pos2",
      positionTitle: "Vice President, (Intern)", // Comma in title
      totalVotes: 50,
      candidates: [
        {
          candidateId: 201,
          candidateName: 'Alice "Awesome" Bob', // Quotes in name
          rank: 1,
          votes: 50,
          percentage: 100,
        },
      ],
      abstainCount: 0,
      abstainPercentage: 0,
    },
  ];

  it("should generate CSV with correct headers and BOM", () => {
    const csv = formatElectionResultsCSV({
      election: mockElection,
      turnout: mockTurnout,
      positionResults: mockPositionResults,
      totalEligible: 200,
    });

    expect(csv.charCodeAt(0)).toBe(0xfeff); // Check BOM
    expect(csv).toContain("Election Results Report");
    expect(csv).toContain("Title,Student Election 2024");
    expect(csv).toContain("Total Eligible Voters,200");
    expect(csv).toContain("Voter Turnout,50%");
  });

  it("should format position results correctly", () => {
    const csv = formatElectionResultsCSV({
      election: mockElection,
      turnout: mockTurnout,
      positionResults: mockPositionResults,
      totalEligible: 200,
    });

    // President
    expect(csv).toContain("President,1,John Doe,60,60%,Winner/Tie");
    expect(csv).toContain("President,2,Jane Smith,30,30%,");
    expect(csv).toContain("President,-,Abstain (ไม่ลงคะแนน),10,10%,");
  });

  it("should escape special characters correctly", () => {
    const csv = formatElectionResultsCSV({
      election: mockElection,
      turnout: mockTurnout,
      positionResults: mockPositionResults,
      totalEligible: 200,
    });

    // Comma in title should be quoted
    expect(csv).toContain('"Vice President, (Intern)"');

    // Quotes in name should be escaped
    // "Alice "Awesome" Bob" -> "Alice ""Awesome"" Bob"
    expect(csv).toContain('"Alice ""Awesome"" Bob"');
  });
});
