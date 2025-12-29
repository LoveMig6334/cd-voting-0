/**
 * Card Detector Module for the Image Processing Pipeline
 * Handles color-based segmentation, contour detection, and card boundary detection
 */

import { applySobelEdgeDetection } from "./canvas-utils";
import {
  CARD_DIMENSIONS,
  COLOR_THRESHOLDS,
  CONFIDENCE,
  CONNECTED_COMPONENT,
  CONTOUR_DETECTION,
  FALLBACK,
  QUADRILATERAL,
} from "./constants";
import {
  convexHull,
  getBoundingRect,
  isConvexQuadrilateral,
  orderCorners,
  quadrilateralArea,
  rectToCorners,
  simplifyContour,
} from "./geometry-utils";
import type {
  BoundingRect,
  ConnectedComponent,
  DetectionMethod,
  ExtendedDetectionResult,
  ImageOrientation,
  Point,
} from "./types";
import { getImageOrientation } from "./types";

/**
 * Internal detection state for multi-stage detection
 */
interface DetectionState {
  readonly width: number;
  readonly height: number;
  readonly orientation: ImageOrientation;
  readonly imageArea: number;
  readonly colorMask: Uint8Array;
  readonly edgeMask: Uint8Array;
}

/**
 * Quadrilateral candidate with scoring
 */
interface QuadCandidate {
  readonly corners: readonly Point[];
  readonly area: number;
  readonly aspectRatio: number;
  readonly confidence: number;
}

/**
 * Main card detection function
 * Attempts multiple detection strategies and returns the best result
 *
 * Strategy order:
 * 1. Quadrilateral detection (edge-based, highest accuracy)
 * 2. Edge boundary detection (combined edge + color masks)
 * 3. Connected component detection (isolates card region from background)
 * 4. Color region fallback (uses largest color-detected region)
 */
export function detectCard(
  imageData: ImageData,
  width: number,
  height: number
): ExtendedDetectionResult {
  // Initialize detection state
  const state = initializeDetectionState(imageData, width, height);

  // Strategy 1: Try quadrilateral detection from contours
  const quadResult = detectQuadrilateral(state);
  if (quadResult) {
    return quadResult;
  }

  // Strategy 2: Try edge-based boundary detection
  const edgeResult = detectEdgeBoundary(state);
  if (edgeResult) {
    return edgeResult;
  }

  // Strategy 3: Try connected component detection on color mask
  const componentResult = detectByConnectedComponents(state);
  if (componentResult) {
    return componentResult;
  }

  // Strategy 4: Ultimate fallback using largest color region
  return createColorBasedFallback(state);
}

/**
 * Initialize detection state with color and edge masks
 */
function initializeDetectionState(
  imageData: ImageData,
  width: number,
  height: number
): DetectionState {
  const data = imageData.data;
  const pixelCount = width * height;
  const colorMask = new Uint8Array(pixelCount);

  // Apply color-based segmentation for Thai ID cards
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const pixelIndex = i / 4;

    // Detect bright pixels (against dark backgrounds)
    const isBright =
      r > COLOR_THRESHOLDS.BRIGHTNESS.RED_MIN &&
      g > COLOR_THRESHOLDS.BRIGHTNESS.GREEN_MIN &&
      b > COLOR_THRESHOLDS.BRIGHTNESS.BLUE_MIN;

    // Detect yellow/gold pixels (typical Thai student ID)
    const isYellow =
      r > COLOR_THRESHOLDS.YELLOW.RED_MIN &&
      g > COLOR_THRESHOLDS.YELLOW.GREEN_MIN &&
      b < COLOR_THRESHOLDS.YELLOW.BLUE_MAX &&
      r > b;

    // Detect blue pixels (some card variants)
    const isBlue = b > COLOR_THRESHOLDS.BLUE.BLUE_MIN && b > r && b > g;

    if (isYellow || isBlue || isBright) {
      colorMask[pixelIndex] = 255;
    }
  }

  // Apply Sobel edge detection
  const edgeMask = applySobelEdgeDetection(data, width, height);

  return {
    width,
    height,
    orientation: getImageOrientation(width, height),
    imageArea: width * height,
    colorMask,
    edgeMask,
  };
}

/**
 * Attempt to detect a quadrilateral card shape from contours
 */
function detectQuadrilateral(
  state: DetectionState
): ExtendedDetectionResult | null {
  const contours = findContours(state.edgeMask, state.width, state.height);
  const candidate = findBestQuadrilateral(contours, state);

  if (!candidate) {
    return null;
  }

  // Validate aspect ratio
  if (
    candidate.aspectRatio < CARD_DIMENSIONS.MIN_ASPECT_RATIO ||
    candidate.aspectRatio > CARD_DIMENSIONS.MAX_ASPECT_RATIO
  ) {
    return null;
  }

  // Check confidence threshold
  if (candidate.confidence < CONFIDENCE.MIN_THRESHOLD) {
    return null;
  }

  const boundingRect = getBoundingRect(candidate.corners);

  return {
    success: true,
    corners: candidate.corners,
    boundingRect,
    confidence: candidate.confidence,
    method: "quadrilateral",
    imageDimensions: { width: state.width, height: state.height },
    detectedAspectRatio: candidate.aspectRatio,
  };
}

/**
 * Find contours in the edge mask using flood-fill based tracing
 */
function findContours(
  edgeMask: Uint8Array,
  width: number,
  height: number
): readonly Point[][] {
  const contours: Point[][] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edgeMask[idx] === 255 && visited[idx] === 0) {
        const contour = traceContour(edgeMask, visited, x, y, width, height);
        if (contour.length >= CONTOUR_DETECTION.MIN_CONTOUR_POINTS) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

/**
 * Trace a single contour starting from a point using 8-connectivity flood fill
 */
function traceContour(
  edgeMask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number
): Point[] {
  const contour: Point[] = [];
  const stack: Point[] = [{ x: startX, y: startY }];
  const directions = CONTOUR_DETECTION.DIRECTIONS;
  const maxPoints = CONTOUR_DETECTION.MAX_CONTOUR_POINTS;

  while (stack.length > 0 && contour.length < maxPoints) {
    const point = stack.pop()!;
    const idx = point.y * width + point.x;

    if (visited[idx] === 1) continue;
    visited[idx] = 1;
    contour.push(point);

    // Check 8-connected neighbors
    for (const [dy, dx] of directions) {
      const nx = point.x + dx;
      const ny = point.y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (edgeMask[nidx] === 255 && visited[nidx] === 0) {
          stack.push({ x: nx, y: ny });
        }
      }
    }
  }

  return contour;
}

/**
 * Find the best quadrilateral candidate from contours
 */
function findBestQuadrilateral(
  contours: readonly Point[][],
  state: DetectionState
): QuadCandidate | null {
  let bestCandidate: QuadCandidate | null = null;
  let bestArea = 0;

  const minArea = state.imageArea * QUADRILATERAL.MIN_AREA_RATIO;
  const maxArea = state.imageArea * QUADRILATERAL.MAX_AREA_RATIO;

  for (const contour of contours) {
    // Simplify contour to reduce noise
    const simplified = simplifyContour(
      contour,
      CONTOUR_DETECTION.SIMPLIFICATION_EPSILON
    );

    // Compute convex hull
    const hull = convexHull(simplified);

    if (hull.length < 4) continue;

    // Order corners geometrically (TL, TR, BR, BL)
    const quad = orderCorners(hull);

    if (quad.length !== 4) continue;

    // Validate convexity
    if (!isConvexQuadrilateral(quad)) continue;

    // Calculate area
    const area = quadrilateralArea(quad);

    if (area <= minArea || area >= maxArea) continue;

    // Calculate aspect ratio from bounding rect
    const rect = getBoundingRect(quad);
    const aspectRatio = rect.width / rect.height;

    // Calculate confidence
    const confidence = calculateConfidence(rect, state.width, state.height);

    if (area > bestArea) {
      bestArea = area;
      bestCandidate = {
        corners: quad,
        area,
        aspectRatio,
        confidence,
      };
    }
  }

  return bestCandidate;
}

/**
 * Calculate detection confidence score (0-100)
 */
function calculateConfidence(
  rect: BoundingRect,
  imageWidth: number,
  imageHeight: number
): number {
  // Score based on aspect ratio similarity to ID card
  const aspectRatio = rect.width / rect.height;
  const ratioDeviation = Math.abs(aspectRatio - CARD_DIMENSIONS.ASPECT_RATIO);
  const ratioScore = Math.max(
    0,
    100 - ratioDeviation * CONFIDENCE.ASPECT_RATIO_WEIGHT
  );

  // Score based on coverage (how much of image the card occupies)
  const coverageRatio = (rect.width * rect.height) / (imageWidth * imageHeight);
  const coverageScore =
    coverageRatio > CONFIDENCE.MIN_COVERAGE_RATIO &&
    coverageRatio < CONFIDENCE.MAX_COVERAGE_RATIO
      ? CONFIDENCE.COVERAGE_SCORE_VALID
      : CONFIDENCE.COVERAGE_SCORE_INVALID;

  return Math.max(0, Math.min(100, (ratioScore + coverageScore) / 2));
}

/**
 * Detect card boundary using combined edge and color masks
 */
function detectEdgeBoundary(
  state: DetectionState
): ExtendedDetectionResult | null {
  const boundary = findBoundaryFromMasks(
    state.edgeMask,
    state.colorMask,
    state.width,
    state.height
  );

  if (!boundary || boundary.width === 0 || boundary.height === 0) {
    return null;
  }

  // Validate aspect ratio for edge-based detection
  const aspectRatio = boundary.width / boundary.height;
  if (
    aspectRatio < FALLBACK.MIN_ASPECT_RATIO ||
    aspectRatio > FALLBACK.MAX_ASPECT_RATIO
  ) {
    return null;
  }

  return {
    success: true,
    corners: rectToCorners(boundary),
    boundingRect: boundary,
    confidence: CONFIDENCE.FALLBACK_CONFIDENCE,
    method: "edge_boundary",
    imageDimensions: { width: state.width, height: state.height },
    detectedAspectRatio: aspectRatio,
  };
}

/**
 * Find bounding box of combined edge and color mask pixels
 */
function findBoundaryFromMasks(
  edgeMask: Uint8Array,
  colorMask: Uint8Array,
  width: number,
  height: number
): BoundingRect | null {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (colorMask[idx] === 255 || edgeMask[idx] === 255) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found || maxX <= minX || maxY <= minY) {
    return null;
  }

  // Add padding
  const padding = FALLBACK.EDGE_PADDING;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(width - minX + padding, maxX - minX + padding * 2),
    height: Math.min(height - minY + padding, maxY - minY + padding * 2),
  };
}

/**
 * Create smart fallback detection based on image orientation
 * This fixes the "vertical squash" bug by ensuring portrait images
 * get a horizontally-oriented crop rectangle
 */
function createSmartFallback(state: DetectionState): ExtendedDetectionResult {
  let cropRect: BoundingRect;
  let method: DetectionMethod;

  if (state.orientation === "portrait") {
    // CRITICAL FIX: For portrait images, crop a horizontal rectangle
    // Take 90% of width, calculate height from ID card aspect ratio
    const cropWidth = Math.floor(
      state.width * FALLBACK.PORTRAIT_WIDTH_FRACTION
    );
    const cropHeight = Math.floor(cropWidth / CARD_DIMENSIONS.ASPECT_RATIO);

    // Center the crop rectangle vertically
    const cropX = Math.floor((state.width - cropWidth) / 2);
    const cropY = Math.floor((state.height - cropHeight) / 2);

    cropRect = {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    };
    method = "center_crop_portrait";
  } else {
    // Standard landscape fallback: 80% of dimensions, centered
    const cropWidth = Math.floor(
      state.width * FALLBACK.LANDSCAPE_DIMENSION_FRACTION
    );
    const cropHeight = Math.floor(
      state.height * FALLBACK.LANDSCAPE_DIMENSION_FRACTION
    );
    const cropX = Math.floor(state.width * FALLBACK.LANDSCAPE_MARGIN_FRACTION);
    const cropY = Math.floor(state.height * FALLBACK.LANDSCAPE_MARGIN_FRACTION);

    cropRect = {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
    };
    method = "center_crop_landscape";
  }

  const aspectRatio = cropRect.width / cropRect.height;

  return {
    success: false, // Mark as false so UI shows warning
    corners: rectToCorners(cropRect),
    boundingRect: cropRect,
    confidence: CONFIDENCE.ULTIMATE_FALLBACK_CONFIDENCE,
    method,
    imageDimensions: { width: state.width, height: state.height },
    detectedAspectRatio: aspectRatio,
  };
}

/**
 * Get a human-readable description of the detection method
 */
export function getMethodDescription(method: DetectionMethod): string {
  switch (method) {
    case "quadrilateral":
      return "Detected card corners using edge analysis";
    case "edge_boundary":
      return "Detected card boundary from edges and colors";
    case "center_crop_portrait":
      return "Using center crop (portrait orientation fallback)";
    case "center_crop_landscape":
      return "Using center crop (landscape orientation fallback)";
    default:
      return "Unknown detection method";
  }
}
