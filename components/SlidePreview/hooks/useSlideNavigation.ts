import { useCallback, useEffect, useState } from "react";
import {
  AUTO_PLAY_INTERVAL,
  type UseSlideNavigationReturn,
} from "../types";

interface UseSlideNavigationProps {
  totalSlides: number;
  onClose?: () => void;
}

/**
 * Custom hook for slide navigation with keyboard support and auto-play
 */
export function useSlideNavigation({
  totalSlides,
  onClose,
}: UseSlideNavigationProps): UseSlideNavigationReturn {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Navigation handlers
  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSlides) return;
      setDirection(index > currentIndex ? "next" : "prev");
      setCurrentIndex(index);
    },
    [totalSlides, currentIndex]
  );

  const goNext = useCallback(() => {
    if (currentIndex < totalSlides - 1) {
      setDirection("next");
      setCurrentIndex((prev) => prev + 1);
    } else if (isAutoPlaying) {
      // Loop back to start when auto-playing
      setDirection("next");
      setCurrentIndex(0);
    }
  }, [currentIndex, totalSlides, isAutoPlaying]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection("prev");
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => !prev);
  }, []);

  const setAutoPlay = useCallback((value: boolean) => {
    setIsAutoPlaying(value);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case " ": // Spacebar
          e.preventDefault();
          goNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          e.preventDefault();
          onClose?.();
          break;
        case "Home":
          e.preventDefault();
          goToSlide(0);
          break;
        case "End":
          e.preventDefault();
          goToSlide(totalSlides - 1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, goToSlide, onClose, totalSlides]);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      goNext();
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(interval);
  }, [isAutoPlaying, goNext]);

  // Pause auto-play on manual navigation
  useEffect(() => {
    // Reset auto-play timer when index changes manually
  }, [currentIndex]);

  return {
    currentIndex,
    totalSlides,
    isAutoPlaying,
    direction,
    goToSlide,
    goNext,
    goPrev,
    toggleAutoPlay,
    setAutoPlay,
  };
}
