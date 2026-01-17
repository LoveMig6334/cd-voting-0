// Election Type Definitions for Dynamic Election Management

// ============================================
// Election Types
// ============================================

export type ElectionType = "student-committee" | "custom";

export type ElectionStatus = "draft" | "open" | "closed";

// ============================================
// Position Templates
// ============================================

export interface Position {
  id: string;
  title: string;
  icon: string;
  enabled: boolean;
  isCustom?: boolean;
}

// Default positions for คณะกรรมการนักเรียน (Student Committee)
export const STUDENT_COMMITTEE_POSITIONS: Position[] = [
  { id: "president", title: "ประธาน", icon: "person", enabled: true },
  {
    id: "vice-president",
    title: "รองประธาน",
    icon: "supervisor_account",
    enabled: true,
  },
  { id: "secretary", title: "เลขานุการ", icon: "edit_note", enabled: true },
  { id: "treasurer", title: "เหรัญญิก", icon: "payments", enabled: true },
  {
    id: "public-relations",
    title: "ประชาสัมพันธ์",
    icon: "campaign",
    enabled: true,
  },
  {
    id: "music-president",
    title: "ประธานชมรมดนตรี",
    icon: "music_note",
    enabled: true,
  },
  {
    id: "sports-president",
    title: "ประธานชมรมกีฬา",
    icon: "sports_soccer",
    enabled: true,
  },
  {
    id: "cheer-president",
    title: "ประธานเชียร์",
    icon: "celebration",
    enabled: true,
  },
  {
    id: "discipline-president",
    title: "ประธานระเบียบ",
    icon: "gavel",
    enabled: true,
  },
];

// ============================================
// Candidate
// ============================================

export interface ElectionCandidate {
  id: string;
  positionId: string;
  name: string;
  slogan: string;
  imageUrl: string;
  rank: number;
}

// ============================================
// Election Event
// ============================================

export interface ElectionEvent {
  id: string;
  title: string;
  description: string;
  type: ElectionType;
  status: ElectionStatus;
  startDate: string; // ISO string
  endDate: string; // ISO string
  positions: Position[];
  candidates: ElectionCandidate[];
  totalVotes: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Form Data for Creating/Editing
// ============================================

export interface CreateElectionData {
  title: string;
  description: string;
  type: ElectionType;
  startDate: string;
  endDate: string;
}

export interface UpdateElectionData extends Partial<CreateElectionData> {
  positions?: Position[];
  candidates?: ElectionCandidate[];
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get default positions based on election type
 */
export function getDefaultPositions(type: ElectionType): Position[] {
  if (type === "student-committee") {
    return STUDENT_COMMITTEE_POSITIONS.map((pos) => ({ ...pos }));
  }
  return [];
}

/**
 * Calculate election status based on dates
 */
export function calculateElectionStatus(
  startDate: string,
  endDate: string,
): ElectionStatus {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return "draft";
  } else if (now >= start && now <= end) {
    return "open";
  } else {
    return "closed";
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
