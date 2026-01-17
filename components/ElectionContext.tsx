"use client";

import {
  getAllElections,
  getElectionById,
  addCandidate as storeAddCandidate,
  addCustomPosition as storeAddCustomPosition,
  createElection as storeCreateElection,
  deleteCandidate as storeDeleteCandidate,
  deleteElection as storeDeleteElection,
  togglePosition as storeTogglePosition,
  updateCandidate as storeUpdateCandidate,
  updateElection as storeUpdateElection,
  updatePositions as storeUpdatePositions,
  subscribeToElections,
} from "@/lib/election-store";
import {
  CreateElectionData,
  ElectionCandidate,
  ElectionEvent,
  Position,
  UpdateElectionData,
} from "@/lib/election-types";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ============================================
// Context Types
// ============================================

interface ElectionContextType {
  elections: ElectionEvent[];
  loading: boolean;

  // Election operations
  getElection: (id: string) => ElectionEvent | null;
  createElection: (data: CreateElectionData) => ElectionEvent;
  updateElection: (
    id: string,
    data: UpdateElectionData,
  ) => ElectionEvent | null;
  deleteElection: (id: string) => boolean;

  // Position operations
  updatePositions: (
    electionId: string,
    positions: Position[],
  ) => ElectionEvent | null;
  addCustomPosition: (
    electionId: string,
    title: string,
    icon?: string,
  ) => ElectionEvent | null;
  togglePosition: (
    electionId: string,
    positionId: string,
  ) => ElectionEvent | null;

  // Candidate operations
  addCandidate: (
    electionId: string,
    candidate: Omit<ElectionCandidate, "id">,
  ) => ElectionEvent | null;
  updateCandidate: (
    electionId: string,
    candidateId: string,
    data: Partial<ElectionCandidate>,
  ) => ElectionEvent | null;
  deleteCandidate: (
    electionId: string,
    candidateId: string,
  ) => ElectionEvent | null;

  // Refresh data
  refresh: () => void;
}

const ElectionContext = createContext<ElectionContextType | null>(null);

// ============================================
// Provider Component
// ============================================

export function ElectionProvider({ children }: { children: React.ReactNode }) {
  // Start with empty state (same on server and client) to avoid hydration mismatch
  const [elections, setElections] = useState<ElectionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh data from localStorage
  const refresh = useCallback(() => {
    setElections(getAllElections());
    setLoading(false);
  }, []);

  // Load initial data and subscribe to changes
  // Note: Calling setState in useEffect is valid here because we're syncing with localStorage
  useEffect(() => {
    // Load initial data (only runs on client)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const unsubscribe = subscribeToElections((updatedElections) => {
      setElections(updatedElections);
    });

    return unsubscribe;
  }, [refresh]);

  // Election operations
  const getElection = useCallback((id: string) => {
    return getElectionById(id);
  }, []);

  const createElection = useCallback(
    (data: CreateElectionData) => {
      const newElection = storeCreateElection(data);
      refresh();
      return newElection;
    },
    [refresh],
  );

  const updateElection = useCallback(
    (id: string, data: UpdateElectionData) => {
      const updated = storeUpdateElection(id, data);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const deleteElection = useCallback(
    (id: string) => {
      const deleted = storeDeleteElection(id);
      if (deleted) refresh();
      return deleted;
    },
    [refresh],
  );

  // Position operations
  const updatePositions = useCallback(
    (electionId: string, positions: Position[]) => {
      const updated = storeUpdatePositions(electionId, positions);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const addCustomPosition = useCallback(
    (electionId: string, title: string, icon: string = "star") => {
      const updated = storeAddCustomPosition(electionId, title, icon);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const togglePosition = useCallback(
    (electionId: string, positionId: string) => {
      const updated = storeTogglePosition(electionId, positionId);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  // Candidate operations
  const addCandidate = useCallback(
    (electionId: string, candidate: Omit<ElectionCandidate, "id">) => {
      const updated = storeAddCandidate(electionId, candidate);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const updateCandidate = useCallback(
    (
      electionId: string,
      candidateId: string,
      data: Partial<ElectionCandidate>,
    ) => {
      const updated = storeUpdateCandidate(electionId, candidateId, data);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const deleteCandidate = useCallback(
    (electionId: string, candidateId: string) => {
      const updated = storeDeleteCandidate(electionId, candidateId);
      if (updated) refresh();
      return updated;
    },
    [refresh],
  );

  const value: ElectionContextType = {
    elections,
    loading,
    getElection,
    createElection,
    updateElection,
    deleteElection,
    updatePositions,
    addCustomPosition,
    togglePosition,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    refresh,
  };

  return (
    <ElectionContext.Provider value={value}>
      {children}
    </ElectionContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to access election context
 */
export function useElections() {
  const context = useContext(ElectionContext);
  if (!context) {
    throw new Error("useElections must be used within an ElectionProvider");
  }
  return context;
}

/**
 * Hook to access a single election by ID
 */
export function useElection(id: string) {
  const { elections, ...rest } = useElections();
  const election = elections.find((e) => e.id === id) || null;
  return { election, ...rest };
}

/**
 * Hook to get open elections only
 */
export function useOpenElections() {
  const { elections, ...rest } = useElections();
  const openElections = elections.filter((e) => e.status === "open");
  return { elections: openElections, ...rest };
}

/**
 * Hook to get elections by status
 */
export function useElectionsByStatus(status: "draft" | "open" | "closed") {
  const { elections, ...rest } = useElections();
  const filtered = elections.filter((e) => e.status === status);
  return { elections: filtered, ...rest };
}
