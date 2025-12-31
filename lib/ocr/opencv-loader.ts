/**
 * OpenCV.js Loader (Resilient Edition)
 *
 * Loads OpenCV.js via script tag with polling and timeout detection.
 */

// Type definition for the extended window object with OpenCV
interface WindowWithCV extends Window {
  cv?: {
    Mat?: unknown;
    [key: string]: unknown;
  };
  Module?: {
    onRuntimeInitialized?: () => void;
    [key: string]: unknown;
  };
}

let cvLoaded = false;
let cvLoadPromise: Promise<void> | null = null;

/**
 * Check if OpenCV is currently loaded and ready
 */
export function isOpenCVLoaded(): boolean {
  if (cvLoaded) return true;

  const win = typeof window !== "undefined" ? (window as WindowWithCV) : null;
  // Check if cv exists and is initialized (having Mat is a good indicator)
  if (win && win.cv && win.cv.Mat) {
    cvLoaded = true;
    return true;
  }
  return false;
}

/**
 * Loads OpenCV.js by injecting a script tag.
 * Includes polling as a fallback for when onRuntimeInitialized doesn't fire.
 */
export function loadOpenCV(): Promise<void> {
  // Return early if already ready
  if (isOpenCVLoaded()) return Promise.resolve();

  // Return existing promise if already loading
  if (cvLoadPromise) return cvLoadPromise;

  cvLoadPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("OpenCV loading requires a browser environment."));
      return;
    }

    const win = window as WindowWithCV;
    const timeout = setTimeout(() => {
      if (isOpenCVLoaded()) {
        resolve();
      } else {
        console.warn("OpenCV.js load timeout reached.");
        // Don't reject yet, let polling continue or detection fail gracefully
        if (win.cv) {
          cvLoaded = true;
          resolve();
        } else {
          reject(new Error("OpenCV.js load timeout"));
        }
      }
    }, 30000); // 30 second timeout

    const checkInterval = setInterval(() => {
      if (isOpenCVLoaded()) {
        console.log("✓ OpenCV.js detected via polling.");
        clearTimeout(timeout);
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    // Set up Module callback before script injection
    win.Module = {
      ...(win.Module || {}),
      onRuntimeInitialized: () => {
        console.log("✓ OpenCV.js (WASM) signaled ready.");
        cvLoaded = true;
        clearTimeout(timeout);
        clearInterval(checkInterval);
        resolve();
      },
    };

    const script = document.createElement("script");
    script.id = "opencv-script";
    script.src = "/lib/opencv.js";
    script.async = true;

    script.onload = () => {
      console.log("OpenCV.js script file loaded.");
      // We don't resolve here because WASM initialization might still be happening
    };

    script.onerror = () => {
      console.error("Failed to load OpenCV.js script file.");
      clearInterval(checkInterval);
      clearTimeout(timeout);
      cvLoadPromise = null;
      reject(new Error("Failed to load OpenCV.js script."));
    };

    document.head.appendChild(script);
  });

  return cvLoadPromise;
}
