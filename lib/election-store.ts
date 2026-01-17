// Election Data Store - localStorage-based mock backend
// This module provides CRUD operations for elections and handles real-time sync

import {
  CreateElectionData,
  ElectionCandidate,
  ElectionEvent,
  Position,
  UpdateElectionData,
  calculateElectionStatus,
  generateId,
  getDefaultPositions,
} from "./election-types";

const STORAGE_KEY = "cd-voting-elections";
const STORAGE_EVENT_NAME = "elections-updated";

// ============================================
// Storage Operations
// ============================================

/**
 * Get all elections from localStorage
 */
export function getAllElections(): ElectionEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const elections: ElectionEvent[] = JSON.parse(data);

    // Auto-update status based on dates
    return elections.map((election) => ({
      ...election,
      status: calculateElectionStatus(election.startDate, election.endDate),
    }));
  } catch (error) {
    console.error("Failed to load elections:", error);
    return [];
  }
}

/**
 * Get election by ID
 */
export function getElectionById(id: string): ElectionEvent | null {
  const elections = getAllElections();
  return elections.find((e) => e.id === id) || null;
}

/**
 * Save all elections to localStorage
 */
function saveElections(elections: ElectionEvent[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(elections));

  // Dispatch custom event for real-time sync
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME));
}

// ============================================
// CRUD Operations
// ============================================

/**
 * Create a new election
 */
export function createElection(data: CreateElectionData): ElectionEvent {
  const now = new Date().toISOString();
  const elections = getAllElections();

  const newElection: ElectionEvent = {
    id: generateId(),
    title: data.title,
    description: data.description,
    type: data.type,
    status: calculateElectionStatus(data.startDate, data.endDate),
    startDate: data.startDate,
    endDate: data.endDate,
    positions: getDefaultPositions(data.type),
    candidates: [],
    totalVotes: 0,
    createdAt: now,
    updatedAt: now,
  };

  elections.push(newElection);
  saveElections(elections);

  return newElection;
}

/**
 * Update an election
 */
export function updateElection(
  id: string,
  data: UpdateElectionData,
): ElectionEvent | null {
  const elections = getAllElections();
  const index = elections.findIndex((e) => e.id === id);

  if (index === -1) return null;

  const updated: ElectionEvent = {
    ...elections[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // Recalculate status if dates changed
  if (data.startDate || data.endDate) {
    updated.status = calculateElectionStatus(
      data.startDate || updated.startDate,
      data.endDate || updated.endDate,
    );
  }

  elections[index] = updated;
  saveElections(elections);

  return updated;
}

/**
 * Delete an election
 */
export function deleteElection(id: string): boolean {
  const elections = getAllElections();
  const filtered = elections.filter((e) => e.id !== id);

  if (filtered.length === elections.length) return false;

  saveElections(filtered);
  return true;
}

// ============================================
// Position Operations
// ============================================

/**
 * Update positions for an election
 */
export function updatePositions(
  electionId: string,
  positions: Position[],
): ElectionEvent | null {
  return updateElection(electionId, { positions });
}

/**
 * Add a custom position
 */
export function addCustomPosition(
  electionId: string,
  title: string,
  icon: string = "star",
): ElectionEvent | null {
  const election = getElectionById(electionId);
  if (!election) return null;

  const newPosition: Position = {
    id: generateId(),
    title,
    icon,
    enabled: true,
    isCustom: true,
  };

  return updateElection(electionId, {
    positions: [...election.positions, newPosition],
  });
}

/**
 * Toggle position enabled status
 */
export function togglePosition(
  electionId: string,
  positionId: string,
): ElectionEvent | null {
  const election = getElectionById(electionId);
  if (!election) return null;

  const positions = election.positions.map((pos) =>
    pos.id === positionId ? { ...pos, enabled: !pos.enabled } : pos,
  );

  return updateElection(electionId, { positions });
}

// ============================================
// Candidate Operations
// ============================================

/**
 * Add a candidate to an election
 */
export function addCandidate(
  electionId: string,
  candidate: Omit<ElectionCandidate, "id">,
): ElectionEvent | null {
  const election = getElectionById(electionId);
  if (!election) return null;

  const newCandidate: ElectionCandidate = {
    ...candidate,
    id: generateId(),
  };

  return updateElection(electionId, {
    candidates: [...election.candidates, newCandidate],
  });
}

/**
 * Update a candidate
 */
export function updateCandidate(
  electionId: string,
  candidateId: string,
  data: Partial<ElectionCandidate>,
): ElectionEvent | null {
  const election = getElectionById(electionId);
  if (!election) return null;

  const candidates = election.candidates.map((c) =>
    c.id === candidateId ? { ...c, ...data } : c,
  );

  return updateElection(electionId, { candidates });
}

/**
 * Delete a candidate
 */
export function deleteCandidate(
  electionId: string,
  candidateId: string,
): ElectionEvent | null {
  const election = getElectionById(electionId);
  if (!election) return null;

  const candidates = election.candidates.filter((c) => c.id !== candidateId);

  return updateElection(electionId, { candidates });
}

/**
 * Get candidates for a specific position
 */
export function getCandidatesByPosition(
  electionId: string,
  positionId: string,
): ElectionCandidate[] {
  const election = getElectionById(electionId);
  if (!election) return [];

  return election.candidates.filter((c) => c.positionId === positionId);
}

// ============================================
// Subscription for Real-time Sync
// ============================================

export type ElectionListener = (elections: ElectionEvent[]) => void;

/**
 * Subscribe to election changes (for cross-tab sync via storage event)
 */
export function subscribeToElections(listener: ElectionListener): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener(getAllElections());
    }
  };

  const handleCustomEvent = () => {
    listener(getAllElections());
  };

  // Listen for changes from other tabs
  window.addEventListener("storage", handleStorageChange);
  // Listen for changes from same tab
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomEvent);
  };
}
