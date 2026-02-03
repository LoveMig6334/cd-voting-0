"use client";

import {
  getDisplaySettings,
  type PublicDisplaySettings,
} from "@/lib/actions/public-display";
import {
  getElectionResults,
  type PositionResult,
  type PositionWinner,
  type VoterTurnout,
} from "@/lib/actions/votes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSlideNavigation } from "./hooks/useSlideNavigation";
import ClosingSlide from "./slides/ClosingSlide";
import OpeningSlide from "./slides/OpeningSlide";
import PositionSlide from "./slides/PositionSlide";
import type {
  ClosingSlide as ClosingSlideType,
  OpeningSlide as OpeningSlideType,
  PositionSlide as PositionSlideType,
  Slide,
  SlidePreviewModalProps,
} from "./types";

// ============================================
// Slide Builder
// ============================================

function buildSlides(
  electionTitle: string,
  turnout: VoterTurnout,
  positions: SlidePreviewModalProps["positions"],
  winners: PositionWinner[],
  results: PositionResult[],
  settings: PublicDisplaySettings
): Slide[] {
  const slides: Slide[] = [];

  // Opening slide
  const openingSlide: OpeningSlideType = {
    id: "opening",
    type: "opening",
    electionTitle,
    turnout,
  };
  slides.push(openingSlide);

  // Position slides (filter by skip and valid status)
  const enabledPositions = positions.filter((p) => p.enabled);

  for (const position of enabledPositions) {
    const config = settings.positionConfigs.find(
      (c) => c.positionId === position.id
    );
    const winner = winners.find((w) => w.positionId === position.id);
    const result = results.find((r) => r.positionId === position.id);

    // Skip if configured to skip or if no valid data
    if (!config || !winner || !result) continue;
    if (config.skip) continue;

    // Auto-skip positions with no candidates or no votes
    if (winner.status === "no_candidates" || winner.status === "no_votes") {
      continue;
    }

    const positionSlide: PositionSlideType = {
      id: `position-${position.id}`,
      type: "position",
      positionId: position.id,
      positionTitle: position.title,
      positionIcon: position.icon,
      winner,
      result,
      config,
    };
    slides.push(positionSlide);
  }

  // Closing slide
  const closingSlide: ClosingSlideType = {
    id: "closing",
    type: "closing",
    electionTitle,
    totalPositions: slides.filter((s) => s.type === "position").length,
    totalVoted: turnout.totalVoted,
    turnoutPercentage: turnout.percentage,
  };
  slides.push(closingSlide);

  return slides;
}

// ============================================
// Main Modal Component
// ============================================

export default function SlidePreviewModal({
  isOpen,
  onClose,
  electionId,
  electionTitle,
  positions,
}: SlidePreviewModalProps) {
  // Data states
  const [settings, setSettings] = useState<PublicDisplaySettings | null>(null);
  const [turnout, setTurnout] = useState<VoterTurnout | null>(null);
  const [winners, setWinners] = useState<PositionWinner[]>([]);
  const [results, setResults] = useState<PositionResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Build slides from data
  const slides = useMemo(() => {
    if (!settings || !turnout) return [];
    return buildSlides(
      electionTitle,
      turnout,
      positions,
      winners,
      results,
      settings
    );
  }, [electionTitle, positions, winners, results, settings, turnout]);

  // Navigation hook
  const navigation = useSlideNavigation({
    totalSlides: slides.length,
    onClose,
  });

  // Reset loading state when modal opens with new election
  const [dataKey, setDataKey] = useState(0);

  // Reset state when election changes
  useEffect(() => {
    if (isOpen) {
      setDataKey((prev) => prev + 1);
    }
  }, [isOpen, electionId]);

  // Load data on open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const electionIdNum = parseInt(electionId, 10);

    const loadData = async () => {
      try {
        const [loadedSettings, electionResults] = await Promise.all([
          getDisplaySettings(electionIdNum),
          getElectionResults(electionIdNum),
        ]);

        if (cancelled) return;

        if (loadedSettings) {
          setSettings(loadedSettings);
        }
        setTurnout(electionResults.turnout);
        setWinners(electionResults.winners);
        setResults(electionResults.positions);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    // Reset to loading state before fetching
    setSettings(null);
    setTurnout(null);
    setWinners([]);
    setResults([]);
    setLoading(true);

    loadData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  // Handle scrollbar on modal open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  // Render current slide
  const renderSlide = useCallback(
    (slide: Slide) => {
      switch (slide.type) {
        case "opening":
          return <OpeningSlide slide={slide} />;
        case "position":
          return <PositionSlide slide={slide} />;
        case "closing":
          return <ClosingSlide slide={slide} />;
        default:
          return null;
      }
    },
    []
  );

  if (!isOpen) return null;

  const currentSlide = slides[navigation.currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">
            slideshow
          </span>
          <span className="text-slate-600 font-medium">{electionTitle}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Auto-play Toggle */}
          <button
            onClick={navigation.toggleAutoPlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              navigation.isAutoPlaying
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {navigation.isAutoPlaying ? "pause" : "play_arrow"}
            </span>
            <span className="text-sm font-medium">
              {navigation.isAutoPlaying ? "หยุด" : "เล่นอัตโนมัติ"}
            </span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="ปิด (Esc)"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="h-full pt-20 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
            </div>
          </div>
        ) : slides.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">
                info
              </span>
              <p className="text-slate-500">ไม่มีข้อมูลสำหรับแสดงผล</p>
            </div>
          </div>
        ) : (
          <div
            key={currentSlide?.id}
            className={`h-full ${
              navigation.direction === "next"
                ? "animate-slide-enter"
                : "animate-slide-enter-reverse"
            }`}
          >
            {currentSlide && renderSlide(currentSlide)}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {slides.length > 0 && !loading && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4">
          {/* Auto-play Progress Bar */}
          {navigation.isAutoPlaying && (
            <div className="w-full h-1 bg-slate-200 rounded-full mb-4 overflow-hidden">
              <div
                key={`progress-${navigation.currentIndex}`}
                className="h-full bg-primary animate-progress-countdown"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={navigation.goPrev}
              disabled={navigation.currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium hidden sm:inline">
                ก่อนหน้า
              </span>
            </button>

            {/* Progress Dots */}
            <div className="flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => navigation.goToSlide(index)}
                  className={`transition-all ${
                    index === navigation.currentIndex
                      ? "w-8 h-3 bg-primary rounded-full"
                      : "w-3 h-3 bg-slate-300 rounded-full hover:bg-slate-400"
                  }`}
                  aria-label={`ไปยัง slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={navigation.goNext}
              disabled={navigation.currentIndex === slides.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-medium hidden sm:inline">
                ถัดไป
              </span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          {/* Slide Counter */}
          <div className="text-center mt-3 text-sm text-slate-400">
            {navigation.currentIndex + 1} / {slides.length}
          </div>
        </div>
      )}
    </div>
  );
}
