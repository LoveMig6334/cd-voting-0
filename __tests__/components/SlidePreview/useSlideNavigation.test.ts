import { act, renderHook } from "@testing-library/react";
import { useSlideNavigation } from "@/components/SlidePreview/hooks/useSlideNavigation";

describe("useSlideNavigation", () => {
  const defaultProps = {
    totalSlides: 5,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should start at index 0", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.totalSlides).toBe(5);
      expect(result.current.isAutoPlaying).toBe(false);
      expect(result.current.direction).toBe("next");
    });
  });

  describe("goNext", () => {
    it("should increment index when not at last slide", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.goNext();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.direction).toBe("next");
    });

    it("should not increment past last slide when not auto-playing", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      // Go to last slide
      act(() => {
        result.current.goToSlide(4);
      });

      expect(result.current.currentIndex).toBe(4);

      // Try to go next
      act(() => {
        result.current.goNext();
      });

      expect(result.current.currentIndex).toBe(4);
    });

    it("should loop to start when auto-playing at last slide", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      // Enable auto-play and go to last slide
      act(() => {
        result.current.setAutoPlay(true);
        result.current.goToSlide(4);
      });

      // Go next should loop
      act(() => {
        result.current.goNext();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe("goPrev", () => {
    it("should decrement index when not at first slide", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.goToSlide(2);
      });

      act(() => {
        result.current.goPrev();
      });

      expect(result.current.currentIndex).toBe(1);
      expect(result.current.direction).toBe("prev");
    });

    it("should not decrement below 0", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.goPrev();
      });

      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe("goToSlide", () => {
    it("should jump to specific slide", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.goToSlide(3);
      });

      expect(result.current.currentIndex).toBe(3);
    });

    it("should set direction based on target slide", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      // Go forward
      act(() => {
        result.current.goToSlide(3);
      });
      expect(result.current.direction).toBe("next");

      // Go backward
      act(() => {
        result.current.goToSlide(1);
      });
      expect(result.current.direction).toBe("prev");
    });

    it("should not go to invalid indices", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.goToSlide(-1);
      });
      expect(result.current.currentIndex).toBe(0);

      act(() => {
        result.current.goToSlide(10);
      });
      expect(result.current.currentIndex).toBe(0);
    });
  });

  describe("auto-play", () => {
    it("should toggle auto-play state", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      expect(result.current.isAutoPlaying).toBe(false);

      act(() => {
        result.current.toggleAutoPlay();
      });

      expect(result.current.isAutoPlaying).toBe(true);

      act(() => {
        result.current.toggleAutoPlay();
      });

      expect(result.current.isAutoPlaying).toBe(false);
    });

    it("should set auto-play directly", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.setAutoPlay(true);
      });

      expect(result.current.isAutoPlaying).toBe(true);

      act(() => {
        result.current.setAutoPlay(false);
      });

      expect(result.current.isAutoPlaying).toBe(false);
    });
  });

  describe("keyboard navigation", () => {
    it("should handle ArrowRight key", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
        document.dispatchEvent(event);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("should handle ArrowLeft key", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      // First go to slide 2
      act(() => {
        result.current.goToSlide(2);
      });

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
        document.dispatchEvent(event);
      });

      expect(result.current.currentIndex).toBe(1);
    });

    it("should handle Escape key", () => {
      const onClose = jest.fn();
      renderHook(() => useSlideNavigation({ ...defaultProps, onClose }));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "Escape" });
        document.dispatchEvent(event);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("should handle Home key", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        result.current.goToSlide(3);
      });

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "Home" });
        document.dispatchEvent(event);
      });

      expect(result.current.currentIndex).toBe(0);
    });

    it("should handle End key", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: "End" });
        document.dispatchEvent(event);
      });

      expect(result.current.currentIndex).toBe(4);
    });

    it("should handle Spacebar", () => {
      const { result } = renderHook(() => useSlideNavigation(defaultProps));

      act(() => {
        const event = new KeyboardEvent("keydown", { key: " " });
        document.dispatchEvent(event);
      });

      expect(result.current.currentIndex).toBe(1);
    });
  });
});
