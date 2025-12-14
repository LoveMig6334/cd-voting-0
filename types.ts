export interface Candidate {
  id: string;
  name: string;
  slogan: string;
  imageUrl: string;
  rank?: number;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  type: string; // e.g., 'Student Council', 'Clubs'
  totalVotes?: number;
}

export interface VoteRecord {
  id: string;
  electionTitle: string;
  timestamp: string;
  token: string;
  verified: boolean;
  imageUrl: string;
}
