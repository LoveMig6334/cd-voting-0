"use client";

import { RefObject, useEffect } from "react";

/**
 * Hook to detect clicks outside of a referenced element
 * @param ref - Reference to the element to monitor
 * @param handler - Callback function to execute when click outside is detected
 * @param enabled - Whether the hook is active (default: true)
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    // Use mousedown for immediate response (fires before click completes)
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [ref, handler, enabled]);
}
