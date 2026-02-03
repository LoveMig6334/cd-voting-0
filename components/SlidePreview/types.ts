import type {
  PositionDisplayConfig,
  PublicDisplaySettings,
} from "@/lib/actions/public-display";
import type {
  PositionResult,
  PositionWinner,
  VoterTurnout,
} from "@/lib/actions/votes";

// ============================================
// Slide Types
// ============================================

export type SlideType = "opening" | "position" | "closing";

export interface BaseSlide {
  id: string;
  type: SlideType;
}

export interface OpeningSlide extends BaseSlide {
  type: "opening";
  electionTitle: string;
  turnout: VoterTurnout;
}

export interface PositionSlide extends BaseSlide {
  type: "position";
  positionId: string;
  positionTitle: string;
  positionIcon: string;
  winner: PositionWinner;
  result: PositionResult;
  config: PositionDisplayConfig;
}

export interface ClosingSlide extends BaseSlide {
  type: "closing";
  electionTitle: string;
  totalPositions: number;
  totalVoted: number;
  turnoutPercentage: number;
}

export type Slide = OpeningSlide | PositionSlide | ClosingSlide;

// ============================================
// Navigation Types
// ============================================

export interface SlideNavigationState {
  currentIndex: number;
  totalSlides: number;
  isAutoPlaying: boolean;
  direction: "next" | "prev";
}

export interface SlideNavigationActions {
  goToSlide: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  toggleAutoPlay: () => void;
  setAutoPlay: (value: boolean) => void;
}

export type UseSlideNavigationReturn = SlideNavigationState &
  SlideNavigationActions;

// ============================================
// Modal Props Types
// ============================================

export interface SlidePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  electionTitle: string;
  positions: {
    id: string;
    title: string;
    enabled: boolean;
    icon: string;
  }[];
}

// ============================================
// Slide Building Types
// ============================================

export interface SlideBuilderInput {
  electionTitle: string;
  turnout: VoterTurnout;
  positions: {
    id: string;
    title: string;
    icon: string;
  }[];
  winners: PositionWinner[];
  results: PositionResult[];
  settings: PublicDisplaySettings;
}

// ============================================
// Chart Data Types
// ============================================

export interface PieChartData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

export interface BarChartData {
  name: string;
  votes: number;
  percentage: number;
  isWinner: boolean;
  [key: string]: string | number | boolean; // Index signature for Recharts compatibility
}

// ============================================
// Constants
// ============================================

export const AUTO_PLAY_INTERVAL = 8000; // 8 seconds
