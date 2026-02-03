import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SlidePreviewModal from "@/components/SlidePreview/SlidePreviewModal";

// Mock server actions
jest.mock("@/lib/actions/public-display", () => ({
  getDisplaySettings: jest.fn(),
}));

jest.mock("@/lib/actions/votes", () => ({
  getElectionResults: jest.fn(),
}));

// Mock dynamic import for charts
jest.mock("next/dynamic", () => () => {
  const MockComponent = () => <div data-testid="mock-chart">Chart</div>;
  MockComponent.displayName = "MockChart";
  return MockComponent;
});

// Import mocked functions for control
import { getDisplaySettings } from "@/lib/actions/public-display";
import { getElectionResults } from "@/lib/actions/votes";

const mockedGetDisplaySettings = getDisplaySettings as jest.MockedFunction<
  typeof getDisplaySettings
>;
const mockedGetElectionResults = getElectionResults as jest.MockedFunction<
  typeof getElectionResults
>;

describe("SlidePreviewModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    electionId: "1",
    electionTitle: "การเลือกตั้งประธานนักเรียน",
    positions: [
      { id: "president", title: "ประธานนักเรียน", enabled: true, icon: "person" },
      { id: "vice", title: "รองประธาน", enabled: true, icon: "person" },
    ],
  };

  const mockSettings = {
    electionId: "1",
    isPublished: true,
    publishedAt: new Date().toISOString(),
    globalShowRawScore: true,
    globalShowWinnerOnly: false,
    positionConfigs: [
      {
        positionId: "president",
        showRawScore: true,
        showWinnerOnly: false,
        skip: false,
      },
      {
        positionId: "vice",
        showRawScore: true,
        showWinnerOnly: false,
        skip: false,
      },
    ],
  };

  const mockResults = {
    turnout: {
      totalEligible: 500,
      totalVoted: 350,
      notVoted: 150,
      percentage: 70,
    },
    positions: [
      {
        positionId: "president",
        positionTitle: "ประธานนักเรียน",
        totalVotes: 350,
        candidates: [
          {
            candidateId: 1,
            candidateName: "สมชาย ใจดี",
            rank: 1,
            votes: 200,
            percentage: 57.1,
          },
        ],
        abstainCount: 50,
        abstainPercentage: 14.3,
      },
    ],
    winners: [
      {
        positionId: "president",
        positionTitle: "ประธานนักเรียน",
        status: "winner" as const,
        winner: {
          candidateId: 1,
          candidateName: "สมชาย ใจดี",
          rank: 1,
          votes: 200,
          percentage: 57.1,
        },
        abstainCount: 50,
        totalVotes: 350,
      },
    ],
  };

  // Suppress console.error for act warnings in this file
  const originalError = console.error;

  beforeAll(() => {
    console.error = (...args: unknown[]) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        (message.includes("not wrapped in act") ||
          message.includes("not configured to support act"))
      ) {
        return; // Suppress act warnings
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetDisplaySettings.mockResolvedValue(mockSettings);
    mockedGetElectionResults.mockResolvedValue(mockResults);
  });

  // Helper to wait for loading to complete
  const waitForLoadComplete = async () => {
    await waitFor(
      () => {
        expect(screen.queryByText("กำลังโหลดข้อมูล...")).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  };

  describe("rendering", () => {
    it("should not render when isOpen is false", () => {
      render(<SlidePreviewModal {...defaultProps} isOpen={false} />);

      expect(
        screen.queryByText("การเลือกตั้งประธานนักเรียน")
      ).not.toBeInTheDocument();
    });

    it("should show loading state initially", () => {
      render(<SlidePreviewModal {...defaultProps} />);

      expect(screen.getByText("กำลังโหลดข้อมูล...")).toBeInTheDocument();
    });

    it("should show election title in header", async () => {
      render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      // Title appears in both header and slide content
      expect(
        screen.getAllByText("การเลือกตั้งประธานนักเรียน").length
      ).toBeGreaterThan(0);
    });

    it("should load data and show slides", async () => {
      render(<SlidePreviewModal {...defaultProps} />);

      await waitFor(() => {
        expect(mockedGetDisplaySettings).toHaveBeenCalledWith(1);
        expect(mockedGetElectionResults).toHaveBeenCalledWith(1);
      });

      await waitForLoadComplete();

      expect(screen.getByText("ผลการเลือกตั้ง")).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("should show navigation buttons after loading", async () => {
      render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      expect(screen.getByText("ก่อนหน้า")).toBeInTheDocument();
      expect(screen.getByText("ถัดไป")).toBeInTheDocument();
    });

    it("should navigate to next slide on button click", async () => {
      const user = userEvent.setup();
      render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      await user.click(screen.getByText("ถัดไป"));

      expect(screen.getByText(/2 \//)).toBeInTheDocument();
    });

    it("should show slide counter", async () => {
      render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      expect(screen.getByText(/1 \//)).toBeInTheDocument();
    });
  });

  describe("controls", () => {
    it("should show auto-play toggle button", async () => {
      render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      expect(screen.getByText("เล่นอัตโนมัติ")).toBeInTheDocument();
    });

    it("should toggle auto-play on button click", async () => {
      const user = userEvent.setup();
      render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      await user.click(screen.getByText("เล่นอัตโนมัติ"));

      expect(screen.getByText("หยุด")).toBeInTheDocument();
    });

    it("should call onClose when close button is clicked", async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      render(<SlidePreviewModal {...defaultProps} onClose={onClose} />);

      await waitForLoadComplete();

      await user.click(screen.getByTitle("ปิด (Esc)"));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("scrollbar handling", () => {
    it("should hide body overflow when modal is open", () => {
      render(<SlidePreviewModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body overflow when modal is closed", async () => {
      const { unmount } = render(<SlidePreviewModal {...defaultProps} />);

      await waitForLoadComplete();

      unmount();

      expect(document.body.style.overflow).toBe("");
    });
  });
});
