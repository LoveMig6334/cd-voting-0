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
  ASPECT_RATIO: 1.586,
  /** Minimum acceptable aspect ratio for detected cards */
  MIN_ASPECT_RATIO: 1.0,
  /** Maximum acceptable aspect ratio for detected cards */
  MAX_ASPECT_RATIO: 2.8,
  /** Output width in pixels for warped card */
  OUTPUT_WIDTH: 600,
  /** Output height calculated from aspect ratio */
  get OUTPUT_HEIGHT(): number {
    return Math.round(this.OUTPUT_WIDTH / this.ASPECT_RATIO);
  },
} as const;

/**
 * Color detection thresholds for Thai Student ID cards
 * Supports yellow/gold and blue card variants
 */
export const COLOR_THRESHOLDS = {
  /** Brightness threshold for general bright pixels */
  BRIGHTNESS: {
    RED_MIN: 100,
    GREEN_MIN: 100,
    BLUE_MIN: 100,
  },
  /** Yellow/Gold color detection */
  YELLOW: {
    RED_MIN: 90,
    GREEN_MIN: 70,
    BLUE_MAX: 180,
  },
  /** Blue color detection */
  BLUE: {
    BLUE_MIN: 70,
  },
} as const;

/**
 * Edge detection configuration
 */
export const EDGE_DETECTION = {
  /** Sobel kernels for gradient computation */
  SOBEL_X: [-1, 0, 1, -2, 0, 2, -1, 0, 1] as const,
  SOBEL_Y: [-1, -2, -1, 0, 0, 0, 1, 2, 1] as const,
  /** Magnitude threshold for edge pixels */
  MAGNITUDE_THRESHOLD: 50,
} as const;

/**
 * Contour detection configuration
 */
export const CONTOUR_DETECTION = {
  /** Minimum points in a valid contour */
  MIN_CONTOUR_POINTS: 50,
  /** Maximum points to trace before stopping (prevents infinite loops) */
  MAX_CONTOUR_POINTS: 5000,
  /** Epsilon value for contour simplification (stride between sampled points) */
  SIMPLIFICATION_EPSILON: 2,
  /** 8-connectivity directions for contour tracing [dy, dx] */
  DIRECTIONS: [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ] as const,
} as const;

/**
 * Quadrilateral validation thresholds
 */
export const QUADRILATERAL = {
  /** Minimum quadrilateral area as fraction of image area */
  MIN_AREA_RATIO: 0.1,
  /** Maximum quadrilateral area as fraction of image area */
  MAX_AREA_RATIO: 0.95,
} as const;

/**
 * Confidence scoring configuration
 */
export const CONFIDENCE = {
  /** Minimum confidence score to accept detection */
  MIN_THRESHOLD: 30,
  /** Confidence score for fallback rectangle detection */
  FALLBACK_CONFIDENCE: 50,
  /** Confidence score for ultimate fallback (center crop) */
  ULTIMATE_FALLBACK_CONFIDENCE: 20,
  /** Weight for aspect ratio deviation in confidence calculation */
  ASPECT_RATIO_WEIGHT: 30,
  /** Minimum coverage ratio (card area / image area) */
  MIN_COVERAGE_RATIO: 0.05,
  /** Maximum coverage ratio */
  MAX_COVERAGE_RATIO: 0.9,
  /** Score for valid coverage */
  COVERAGE_SCORE_VALID: 90,
  /** Score for invalid coverage */
  COVERAGE_SCORE_INVALID: 40,
} as const;

/**
 * Fallback detection configuration
 */
export const FALLBACK = {
  /** Padding in pixels for edge-based boundary detection */
  EDGE_PADDING: 10,
  /** Minimum fallback aspect ratio */
  MIN_ASPECT_RATIO: 1.1,
  /** Maximum fallback aspect ratio */
  MAX_ASPECT_RATIO: 2.5,
} as const;

/**
 * Connected component detection configuration
 */
export const CONNECTED_COMPONENT = {
  /** Minimum component area as fraction of image area */
  MIN_AREA_RATIO: 0.05,
  /** Maximum component area as fraction of image area */
  MAX_AREA_RATIO: 0.90,
  /** Minimum aspect ratio for card candidates */
  MIN_ASPECT_RATIO: 1.0,
  /** Maximum aspect ratio for card candidates */
  MAX_ASPECT_RATIO: 3.0,
  /** Minimum pixel density within bounding box (0-1) */
  MIN_DENSITY: 0.15,
  /** Confidence score for connected component detection */
  CONFIDENCE: 40,
  /** Confidence score for color region fallback */
  FALLBACK_CONFIDENCE: 25,
  /** Weight for aspect ratio similarity in scoring */
  ASPECT_RATIO_WEIGHT: 40,
  /** Weight for size in scoring */
  SIZE_WEIGHT: 30,
  /** Weight for density in scoring */
  DENSITY_WEIGHT: 20,
  /** Weight for center proximity in scoring */
  CENTER_WEIGHT: 10,
} as const;

/**
 * Image enhancement configuration
 */
export const ENHANCEMENT = {
  /** Contrast multiplier */
  CONTRAST: 1.2,
  /** Brightness offset */
  BRIGHTNESS: 10,
  /** Center value for contrast adjustment */
  CONTRAST_CENTER: 128,
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
  SUCCESS_LINE_WIDTH: 3,
  /** Failure stroke width */
  FAILURE_LINE_WIDTH: 2,
  /** Corner marker radius */
  CORNER_RADIUS: 6,
  /** Dash pattern for failed detection */
  FAILURE_DASH_PATTERN: [10, 5] as const,
} as const;

/**
 * Matrix operations tolerance
 */
export const MATRIX = {
  /** Near-zero tolerance for singular matrix detection */
  SINGULARITY_TOLERANCE: 1e-8,
} as const;
