/**
 * Constants for the Image Processing Pipeline
 * All magic numbers and configuration values are centralized here
 */

/**
 * Thai Student ID Card dimensions
 * Standard CR80 card size with aspect ratio of 1.586 (85.6mm x 53.98mm)
 */
export const CARD_DIMENSIONS = {
  /** Standard ID card aspect ratio (width / height) */
  ASPECT_RATIO: 1.6,
  /** Minimum acceptable aspect ratio for detected cards (1.6 - 20% = 1.28) */
  MIN_ASPECT_RATIO: 1.28,
  /** Maximum acceptable aspect ratio for detected cards (1.6 + 20% = 1.92) */
  MAX_ASPECT_RATIO: 1.92,
  /** Output width in pixels for warped card */
  OUTPUT_WIDTH: 600,
  /** Output height calculated from aspect ratio */
  get OUTPUT_HEIGHT(): number {
    return Math.round(this.OUTPUT_WIDTH / this.ASPECT_RATIO);
  },
} as const;

/**
 * Canny edge detection configuration
 * Based on document scanner algorithm using Hough lines and quadrilateral detection
 */
export const CANNY_EDGE_DETECTION = {
  /** Target height for rescaling (smaller = faster processing) */
  RESCALED_HEIGHT: 500,
  /** Gaussian blur kernel size (must be odd) */
  BLUR_KERNEL_SIZE: 3,
  /** Morphological operation kernel size */
  MORPH_KERNEL_SIZE: 10,
  /** Gaussian blur kernel size for vertical edge detection (light blur preserves edges) */
  BLUR_KERNEL_SIZE_VERTICAL: 3,
  /** Morphological kernel height for vertical edge detection (tall/thin kernel) */
  MORPH_KERNEL_HEIGHT_VERTICAL: 10,
  /** Canny edge detection lower threshold */
  CANNY_THRESHOLD_LOW: 0,
  /** Canny edge detection upper threshold */
  CANNY_THRESHOLD_HIGH: 84,
  /** Hough transform rho resolution in pixels */
  HOUGH_RHO: 2,
  /** Hough transform theta resolution in radians */
  HOUGH_THETA: Math.PI / 180,
  /** Hough transform threshold values to try (increasing order) */
  HOUGH_THRESHOLDS: [60, 70, 75, 80, 90, 100, 110, 120] as const,
  /** Maximum lines to accept from Hough transform */
  HOUGH_MAX_LINES: 16,
  /** Lower thresholds for second pass targeting vertical edges (more aggressive) */
  HOUGH_THRESHOLDS_VERTICAL: [25, 40, 60] as const,
  /** Angle tolerance for classifying lines as horizontal/vertical (radians, 15 degrees) */
  LINE_CLASSIFICATION_TOLERANCE: (15 * Math.PI) / 180,
  /** Maximum angle difference for merging lines (radians, 5 degrees) */
  LINE_MERGE_ANGLE_THRESHOLD: (5 * Math.PI) / 180,
  /** Maximum rho (distance) difference for merging lines (pixels) */
  LINE_MERGE_DISTANCE_THRESHOLD: 15,
  /** Maximum rho (distance) difference for merging vertical lines (pixels, more aggressive) */
  LINE_MERGE_DISTANCE_THRESHOLD_VERTICAL: 20,
  /** Minimum angle between intersecting lines (radians, 60 degrees) */
  MIN_INTERSECTION_ANGLE: (60 * Math.PI) / 180,
  /** Minimum contour area as ratio of image area */
  MIN_CONTOUR_AREA_RATIO: 0.2,
  /** Minimum distance between contour corners in pixels */
  MIN_CORNER_DISTANCE: 50,
  /** Corner margin ratio - corners are moved inward by this percentage to avoid cutting edges */
  CORNER_MARGIN_RATIO: 0,
  /** Confidence score for successful Canny detection */
  SUCCESS_CONFIDENCE: 85,
  /** Confidence score for fallback centered rectangle */
  FALLBACK_CONFIDENCE: 25,
} as const;

/**
 * Image enhancement configuration
 */
export const ENHANCEMENT = {
  /** Contrast multiplier */
  CONTRAST: 1.6,
  /** Brightness offset */
  BRIGHTNESS: 5,
  /** Center value for contrast adjustment */
  CONTRAST_CENTER: 200,
  /** Sharpening kernel size (must be odd, larger = more blur before sharpening) */
  SHARPEN_KERNEL_SIZE: 5,
  /** Sharpening intensity (0-256, higher = more aggressive sharpening) */
  SHARPEN_INTENSITY: 1.5,
} as const;

/**
 * OCR specific preprocessing configuration
 */
export const OCR_PROCESSING = {
  /** Adaptive threshold block size (must be odd) */
  ADAPTIVE_THRESHOLD_BLOCK_SIZE: 35,
  /** Constant subtracted from the mean in adaptive thresholding */
  ADAPTIVE_THRESHOLD_C: 10,
  /** Global threshold to filter out light colors (0-255, lower is more selective) */
  GLOBAL_THRESHOLD: 65,
  /** Target language for OCR (Thai only) */
  LANGUAGE: "tha",
} as const;

/**
 * Visualization overlay configuration
 */
export const OVERLAY = {
  /** Success overlay fill color (RGBA) */
  SUCCESS_FILL: "rgba(34, 197, 94, 0.2)",
  /** Success stroke color */
  SUCCESS_STROKE: "#22c55e",
  /** Failure stroke color */
  FAILURE_STROKE: "#ef4444",
  /** Success stroke width */
  SUCCESS_LINE_WIDTH: 8,
  /** Failure stroke width */
  FAILURE_LINE_WIDTH: 8,
  /** Corner marker radius */
  CORNER_RADIUS: 6,
  /** Dash pattern for failed detection */
  FAILURE_DASH_PATTERN: [10, 5] as const,
  /** Maximum width for the preview overlay image to optimize performance */
  MAX_PREVIEW_WIDTH: 1024,
} as const;
