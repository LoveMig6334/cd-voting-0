import { render, screen } from "@testing-library/react";
import PositionSlide from "@/components/SlidePreview/slides/PositionSlide";
import type { PositionSlide as PositionSlideType } from "@/components/SlidePreview/types";

// Mock dynamic import for charts
jest.mock("next/dynamic", () => () => {
  const MockComponent = () => <div data-testid="mock-chart">Chart</div>;
  MockComponent.displayName = "MockChart";
  return MockComponent;
});

describe("PositionSlide", () => {
  const baseSlide: PositionSlideType = {
    id: "position-1",
    type: "position",
    positionId: "president",
    positionTitle: "ประธานนักเรียน",
    positionIcon: "person",
    winner: {
      positionId: "president",
      positionTitle: "ประธานนักเรียน",
      status: "winner",
      winner: {
        candidateId: 1,
        candidateName: "สมชาย ใจดี",
        rank: 1,
        votes: 150,
        percentage: 60,
      },
      abstainCount: 25,
      totalVotes: 250,
    },
    result: {
      positionId: "president",
      positionTitle: "ประธานนักเรียน",
      totalVotes: 250,
      candidates: [
        {
          candidateId: 1,
          candidateName: "สมชาย ใจดี",
          rank: 1,
          votes: 150,
          percentage: 60,
        },
        {
          candidateId: 2,
          candidateName: "สมหญิง รักเรียน",
          rank: 2,
          votes: 75,
          percentage: 30,
        },
      ],
      abstainCount: 25,
      abstainPercentage: 10,
    },
    config: {
      positionId: "president",
      showRawScore: true,
      showWinnerOnly: false,
      skip: false,
    },
  };

  describe("winner status", () => {
    it("should display winner name and score when status is winner", () => {
      render(<PositionSlide slide={baseSlide} />);

      expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
      expect(screen.getByText(/150 คะแนน/)).toBeInTheDocument();
    });

    it("should display position title", () => {
      render(<PositionSlide slide={baseSlide} />);

      expect(screen.getByText("ประธานนักเรียน")).toBeInTheDocument();
    });
  });

  describe("abstain_wins status", () => {
    it("should display abstain wins message", () => {
      const abstainSlide: PositionSlideType = {
        ...baseSlide,
        winner: {
          ...baseSlide.winner,
          status: "abstain_wins",
          winner: undefined,
          abstainCount: 200,
        },
      };

      render(<PositionSlide slide={abstainSlide} />);

      expect(screen.getByText("Vote No ชนะ")).toBeInTheDocument();
    });
  });

  describe("tie status", () => {
    it("should display all tied candidates", () => {
      const tieSlide: PositionSlideType = {
        ...baseSlide,
        winner: {
          ...baseSlide.winner,
          status: "tie",
          winner: undefined,
          tiedCandidates: [
            {
              candidateId: 1,
              candidateName: "ผู้สมัคร A",
              rank: 1,
              votes: 100,
              percentage: 40,
            },
            {
              candidateId: 2,
              candidateName: "ผู้สมัคร B",
              rank: 1,
              votes: 100,
              percentage: 40,
            },
          ],
        },
      };

      render(<PositionSlide slide={tieSlide} />);

      expect(screen.getByText("ผลเสมอกัน")).toBeInTheDocument();
      expect(screen.getByText("ผู้สมัคร A")).toBeInTheDocument();
      expect(screen.getByText("ผู้สมัคร B")).toBeInTheDocument();
    });
  });

  describe("config options", () => {
    it("should hide score when showRawScore is false", () => {
      const noScoreSlide: PositionSlideType = {
        ...baseSlide,
        config: {
          ...baseSlide.config,
          showRawScore: false,
        },
      };

      render(<PositionSlide slide={noScoreSlide} />);

      // Winner name should still be displayed (may appear multiple times)
      expect(screen.getAllByText("สมชาย ใจดี").length).toBeGreaterThan(0);
      // Score should not be displayed under winner
      const scoreText = screen.queryByText(/150 คะแนน \(60/);
      expect(scoreText).not.toBeInTheDocument();
    });

    it("should show only winner when showWinnerOnly is true", () => {
      const winnerOnlySlide: PositionSlideType = {
        ...baseSlide,
        config: {
          ...baseSlide.config,
          showWinnerOnly: true,
        },
      };

      render(<PositionSlide slide={winnerOnlySlide} />);

      expect(screen.getByText("สมชาย ใจดี")).toBeInTheDocument();
      // Should not show "ผลคะแนนทั้งหมด" section
      expect(screen.queryByText("ผลคะแนนทั้งหมด")).not.toBeInTheDocument();
    });

    it("should show all candidates when showWinnerOnly is false", () => {
      render(<PositionSlide slide={baseSlide} />);

      expect(screen.getByText("ผลคะแนนทั้งหมด")).toBeInTheDocument();
    });
  });

  describe("total votes display", () => {
    it("should display total votes in footer", () => {
      render(<PositionSlide slide={baseSlide} />);

      expect(screen.getByText(/คะแนนทั้งหมด: 250 คะแนน/)).toBeInTheDocument();
    });
  });
});
