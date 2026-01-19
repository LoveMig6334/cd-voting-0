"use client";

import { useCallback, useEffect, useState } from "react";

// Data Stores
import {
  ActivityDisplayItem,
  getRecentActivitiesForDisplay,
  logElectionChange,
  subscribeToActivities,
} from "@/lib/activity-store";
import {
  getAllElections,
  subscribeToElections,
  updateElection,
} from "@/lib/election-store";
import { ElectionEvent } from "@/lib/election-types";
import { getStudentStats, subscribeToStudents } from "@/lib/student-store";
import {
  getCandidateVotesAggregate,
  getVoterTurnout,
  getVotesByElection,
  subscribeToVotes,
  VoterTurnout,
} from "@/lib/vote-store";

// ============================================
// Types
// ============================================

/**
 * Top candidate with position context
 */
export interface TopCandidate {
  name: string;
  percentage: number;
  votes: number;
  positionTitle: string;
}

/**
 * Active election data for the monitor widget
 */
export interface ActiveElectionData {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  voterTurnout: VoterTurnout;
  topCandidates: TopCandidate[];
}

/**
 * Student trend data
 */
export interface StudentTrend {
  value: string;
  isPositive: boolean;
}

/**
 * Complete dashboard data structure
 */
export interface DashboardData {
  // KPI Cards
  totalStudents: number;
  studentTrend: StudentTrend;
  activeElections: number;
  totalVotesInActiveElections: number;
  voterTurnoutPercentage: number;
  systemStatus: "online" | "offline";

  // Active Election Monitor
  primaryActiveElection: ActiveElectionData | null;

  // Activity Feed
  recentActivities: ActivityDisplayItem[];

  // Actions
  closeElection: (electionId: string) => void;
  refreshData: () => void;

  // Loading State
  isLoading: boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the top 3 candidates across first position of an election
 */
function getTopCandidatesForElection(
  election: ElectionEvent,
  limit: number = 3,
): TopCandidate[] {
  // Get enabled positions
  const enabledPositions = election.positions.filter((p) => p.enabled);
  if (enabledPositions.length === 0) return [];

  // Focus on first position (usually President)
  const primaryPosition = enabledPositions[0];

  // Get candidates for primary position
  const positionCandidates = election.candidates.filter(
    (c) => c.positionId === primaryPosition.id,
  );

  if (positionCandidates.length === 0) return [];

  // Get vote aggregates
  const candidateVotes = getCandidateVotesAggregate(
    election.id,
    positionCandidates.map((c) => ({ id: c.id, name: c.name })),
  );

  // Return top candidates
  return candidateVotes.slice(0, limit).map((cv) => ({
    name: cv.candidateName,
    percentage: cv.percentage,
    votes: cv.votes,
    positionTitle: primaryPosition.title,
  }));
}

/**
 * Calculate total votes across all active elections
 */
function calculateTotalVotesInActiveElections(
  activeElections: ElectionEvent[],
): number {
  return activeElections.reduce((total, election) => {
    const votes = getVotesByElection(election.id);
    return total + votes.length;
  }, 0);
}

/**
 * Calculate average voter turnout across active elections
 */
function calculateAverageVoterTurnout(
  activeElections: ElectionEvent[],
  totalStudents: number,
): number {
  if (activeElections.length === 0 || totalStudents === 0) return 0;

  const totalVoterTurnout = activeElections.reduce((sum, election) => {
    const turnout = getVoterTurnout(election.id, totalStudents);
    return sum + turnout.percentage;
  }, 0);

  return Math.round(totalVoterTurnout / activeElections.length);
}

// ============================================
// Main Hook
// ============================================

/**
 * Custom hook for aggregating all dashboard data
 * Provides reactive data updates via localStorage subscriptions
 */
export function useDashboardData(): DashboardData {
  const [isLoading, setIsLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeElections, setActiveElections] = useState<ElectionEvent[]>([]);
  const [recentActivities, setRecentActivities] = useState<
    ActivityDisplayItem[]
  >([]);

  // Fetch and compute all data
  const refreshData = useCallback(() => {
    // Get student stats
    const studentStats = getStudentStats();
    setTotalStudents(studentStats.total);

    // Get active elections (status === "open")
    const allElections = getAllElections();
    const openElections = allElections.filter((e) => e.status === "open");
    setActiveElections(openElections);

    // Get recent activities
    const activities = getRecentActivitiesForDisplay(5);
    setRecentActivities(activities);

    setIsLoading(false);
  }, []);

  // Close election action
  const closeElection = useCallback((electionId: string) => {
    const elections = getAllElections();
    const election = elections.find((e) => e.id === electionId);

    if (election) {
      // Update election status to closed
      updateElection(electionId, {
        // Set end date to now to trigger status change
        endDate: new Date(Date.now() - 1000).toISOString(),
      });

      // Log activity
      logElectionChange("ปิดการเลือกตั้ง", election.title);
    }
  }, []);

  // Initial data load and subscriptions
  useEffect(() => {
    // Define load function inside effect to avoid lint warning
    const loadInitialData = () => {
      // Get student stats
      const studentStats = getStudentStats();
      setTotalStudents(studentStats.total);

      // Get active elections (status === "open")
      const allElections = getAllElections();
      const openElections = allElections.filter((e) => e.status === "open");
      setActiveElections(openElections);

      // Get recent activities
      const activities = getRecentActivitiesForDisplay(5);
      setRecentActivities(activities);

      setIsLoading(false);
    };

    // Initial load
    loadInitialData();

    // Subscribe to data changes - reuse the same load function
    const unsubElections = subscribeToElections(loadInitialData);
    const unsubVotes = subscribeToVotes(loadInitialData);
    const unsubStudents = subscribeToStudents(loadInitialData);
    const unsubActivities = subscribeToActivities(() => {
      setRecentActivities(getRecentActivitiesForDisplay(5));
    });

    return () => {
      unsubElections();
      unsubVotes();
      unsubStudents();
      unsubActivities();
    };
  }, []);

  // Compute derived values
  const totalVotesInActiveElections =
    calculateTotalVotesInActiveElections(activeElections);

  const voterTurnoutPercentage = calculateAverageVoterTurnout(
    activeElections,
    totalStudents,
  );

  // Get primary active election (first one)
  const primaryActiveElection: ActiveElectionData | null =
    activeElections.length > 0
      ? {
          id: activeElections[0].id,
          title: activeElections[0].title,
          description: activeElections[0].description,
          startDate: activeElections[0].startDate,
          endDate: activeElections[0].endDate,
          voterTurnout: getVoterTurnout(activeElections[0].id, totalStudents),
          topCandidates: getTopCandidatesForElection(activeElections[0]),
        }
      : null;

  // Student trend (mock for now - would need historical data)
  const studentTrend: StudentTrend = {
    value: "2.5%",
    isPositive: true,
  };

  return {
    // KPI Cards
    totalStudents,
    studentTrend,
    activeElections: activeElections.length,
    totalVotesInActiveElections,
    voterTurnoutPercentage,
    systemStatus: "online",

    // Active Election Monitor
    primaryActiveElection,

    // Activity Feed
    recentActivities,

    // Actions
    closeElection,
    refreshData,

    // Loading State
    isLoading,
  };
}

// ============================================
// Date Formatting Helpers
// ============================================

/**
 * Format date to Thai display format
 * @param dateString ISO date string
 * @returns Formatted date like "20 ต.ค. 08:00 น."
 */
export function formatThaiDate(dateString: string): string {
  const date = new Date(dateString);

  const day = date.getDate();
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day} ${month} ${hours}:${minutes} น.`;
}
