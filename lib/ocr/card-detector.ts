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

// ============================================================================
// Connected Component Detection (Strategy 3)
// ============================================================================

/**
 * Detect card using connected component analysis on the color mask.
 * This finds contiguous regions of card-colored pixels and selects
 * the best candidate based on size, aspect ratio, and density.
 */
function detectByConnectedComponents(
  state: DetectionState
): ExtendedDetectionResult | null {
  // Find all connected components in the color mask
  const components = findConnectedComponents(
    state.colorMask,
    state.width,
    state.height
  );

  // Filter to valid card candidates
  const candidates = filterCardCandidates(components, state.imageArea);

  if (candidates.length === 0) {
    return null;
  }

  // Select the best candidate
  const bestCandidate = selectBestCandidate(candidates, state);

  if (!bestCandidate) {
    return null;
  }

  return {
    success: true,
    corners: rectToCorners(bestCandidate.boundingRect),
    boundingRect: bestCandidate.boundingRect,
    confidence: CONNECTED_COMPONENT.CONFIDENCE,
    method: "connected_component",
    imageDimensions: { width: state.width, height: state.height },
    detectedAspectRatio: bestCandidate.aspectRatio,
  };
}

/**
 * Find connected components in a binary mask using flood-fill algorithm.
 * Returns array of components with their bounding boxes and statistics.
 */
function findConnectedComponents(
  mask: Uint8Array,
  width: number,
  height: number
): ConnectedComponent[] {
  const components: ConnectedComponent[] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Skip if not a foreground pixel or already visited
      if (mask[idx] === 0 || visited[idx] === 1) {
        continue;
      }

      // Flood-fill to find all pixels in this component
      const component = floodFillComponent(mask, visited, x, y, width, height);

      if (component) {
        components.push(component);
      }
    }
  }

  return components;
}

/**
 * Flood-fill from a starting point to find a connected component.
 * Uses iterative BFS to avoid stack overflow on large components.
 */
function floodFillComponent(
  mask: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  width: number,
  height: number
): ConnectedComponent | null {
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  let pixelCount = 0;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  // 4-connectivity directions (faster than 8-connectivity, sufficient for cards)
  const directions = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ];

  while (queue.length > 0) {
    const point = queue.shift()!;
    const idx = point.y * width + point.x;

    if (visited[idx] === 1) {
      continue;
    }

    visited[idx] = 1;
    pixelCount++;

    // Update bounding box
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;

    // Check neighbors
    for (const [dy, dx] of directions) {
      const nx = point.x + dx;
      const ny = point.y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nidx = ny * width + nx;
        if (mask[nidx] === 255 && visited[nidx] === 0) {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  // Skip very small components (noise)
  if (pixelCount < 100) {
    return null;
  }

  const boundingWidth = maxX - minX + 1;
  const boundingHeight = maxY - minY + 1;
  const boundingArea = boundingWidth * boundingHeight;

  return {
    boundingRect: {
      x: minX,
      y: minY,
      width: boundingWidth,
      height: boundingHeight,
    },
    pixelCount,
    density: pixelCount / boundingArea,
    aspectRatio: boundingWidth / boundingHeight,
  };
}

/**
 * Filter connected components to those that could be ID cards.
 * Applies size, aspect ratio, and density filters.
 */
function filterCardCandidates(
  components: ConnectedComponent[],
  imageArea: number
): ConnectedComponent[] {
  const minArea = imageArea * CONNECTED_COMPONENT.MIN_AREA_RATIO;
  const maxArea = imageArea * CONNECTED_COMPONENT.MAX_AREA_RATIO;

  return components.filter((comp) => {
    const area = comp.boundingRect.width * comp.boundingRect.height;

    // Size filter
    if (area < minArea || area > maxArea) {
      return false;
    }

    // Aspect ratio filter
    if (
      comp.aspectRatio < CONNECTED_COMPONENT.MIN_ASPECT_RATIO ||
      comp.aspectRatio > CONNECTED_COMPONENT.MAX_ASPECT_RATIO
    ) {
      return false;
    }

    // Density filter (avoid sparse noise regions)
    if (comp.density < CONNECTED_COMPONENT.MIN_DENSITY) {
      return false;
    }

    return true;
  });
}

/**
 * Select the best card candidate from filtered components.
 * Scores based on: aspect ratio similarity, size, density, and center proximity.
 */
function selectBestCandidate(
  candidates: ConnectedComponent[],
  state: DetectionState
): ConnectedComponent | null {
  if (candidates.length === 0) {
    return null;
  }

  let bestCandidate: ConnectedComponent | null = null;
  let bestScore = -Infinity;

  const imageCenterX = state.width / 2;
  const imageCenterY = state.height / 2;
  const maxDistance = Math.sqrt(
    imageCenterX * imageCenterX + imageCenterY * imageCenterY
  );

  for (const candidate of candidates) {
    // Score 1: Aspect ratio similarity to ISO 7810 (1.586)
    const ratioDeviation = Math.abs(
      candidate.aspectRatio - CARD_DIMENSIONS.ASPECT_RATIO
    );
    const ratioScore = Math.max(0, 100 - ratioDeviation * 50);

    // Score 2: Size (larger is better, normalized to image area)
    const area = candidate.boundingRect.width * candidate.boundingRect.height;
    const sizeScore = (area / state.imageArea) * 100;

    // Score 3: Density (higher is better)
    const densityScore = candidate.density * 100;

    // Score 4: Center proximity (closer to center is better)
    const candidateCenterX =
      candidate.boundingRect.x + candidate.boundingRect.width / 2;
    const candidateCenterY =
      candidate.boundingRect.y + candidate.boundingRect.height / 2;
    const distanceToCenter = Math.sqrt(
      Math.pow(candidateCenterX - imageCenterX, 2) +
        Math.pow(candidateCenterY - imageCenterY, 2)
    );
    const centerScore = (1 - distanceToCenter / maxDistance) * 100;

    // Weighted total score
    const totalScore =
      (ratioScore * CONNECTED_COMPONENT.ASPECT_RATIO_WEIGHT +
        sizeScore * CONNECTED_COMPONENT.SIZE_WEIGHT +
        densityScore * CONNECTED_COMPONENT.DENSITY_WEIGHT +
        centerScore * CONNECTED_COMPONENT.CENTER_WEIGHT) /
      100;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

// ============================================================================
// Color-Based Fallback (Strategy 4)
// ============================================================================

/**
 * Ultimate fallback: Find the largest color-detected region.
 * Unlike the old center-crop approach, this actually uses detected pixels
 * to find where the card likely is.
 */
function createColorBasedFallback(state: DetectionState): ExtendedDetectionResult {
  // Find bounding box of all color-detected pixels
  let minX = state.width;
  let maxX = 0;
  let minY = state.height;
  let maxY = 0;
  let foundPixels = false;

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const idx = y * state.width + x;
      if (state.colorMask[idx] === 255) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foundPixels = true;
      }
    }
  }

  // If no color pixels found, use a centered rectangle based on image dimensions
  if (!foundPixels || maxX <= minX || maxY <= minY) {
    return createCenteredFallback(state);
  }

  // Add padding around detected region
  const padding = FALLBACK.EDGE_PADDING;
  const boundingRect: BoundingRect = {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(state.width - minX + padding, maxX - minX + padding * 2),
    height: Math.min(state.height - minY + padding, maxY - minY + padding * 2),
  };

  const aspectRatio = boundingRect.width / boundingRect.height;

  // If aspect ratio is reasonable, use this region
  if (
    aspectRatio >= CONNECTED_COMPONENT.MIN_ASPECT_RATIO &&
    aspectRatio <= CONNECTED_COMPONENT.MAX_ASPECT_RATIO
  ) {
    return {
      success: true, // Mark as success since we found something
      corners: rectToCorners(boundingRect),
      boundingRect,
      confidence: CONNECTED_COMPONENT.FALLBACK_CONFIDENCE,
      method: "color_region_fallback",
      imageDimensions: { width: state.width, height: state.height },
      detectedAspectRatio: aspectRatio,
    };
  }

  // Aspect ratio is wrong, try to correct it
  return createCorrectedFallback(boundingRect, state);
}

/**
 * Create a centered fallback when no color pixels are detected.
 * This is the last resort when all detection methods fail.
 */
function createCenteredFallback(state: DetectionState): ExtendedDetectionResult {
  // Use 70% of the smaller dimension to create a card-shaped region
  const smallerDim = Math.min(state.width, state.height);
  const cropWidth = Math.floor(smallerDim * 0.7);
  const cropHeight = Math.floor(cropWidth / CARD_DIMENSIONS.ASPECT_RATIO);

  const cropX = Math.floor((state.width - cropWidth) / 2);
  const cropY = Math.floor((state.height - cropHeight) / 2);

  const boundingRect: BoundingRect = {
    x: Math.max(0, cropX),
    y: Math.max(0, cropY),
    width: Math.min(cropWidth, state.width),
    height: Math.min(cropHeight, state.height),
  };

  return {
    success: false, // Mark as false - this is a blind guess
    corners: rectToCorners(boundingRect),
    boundingRect,
    confidence: CONNECTED_COMPONENT.FALLBACK_CONFIDENCE,
    method: "color_region_fallback",
    imageDimensions: { width: state.width, height: state.height },
    detectedAspectRatio: boundingRect.width / boundingRect.height,
  };
}

/**
 * Create a corrected fallback when detected region has wrong aspect ratio.
 * Adjusts the bounding box to match ID card proportions while staying centered on detected region.
 */
function createCorrectedFallback(
  detected: BoundingRect,
  state: DetectionState
): ExtendedDetectionResult {
  const detectedCenterX = detected.x + detected.width / 2;
  const detectedCenterY = detected.y + detected.height / 2;

  // Use the detected width and calculate proper height
  let newWidth = detected.width;
  let newHeight = Math.floor(newWidth / CARD_DIMENSIONS.ASPECT_RATIO);

  // If height would exceed image bounds, use height-based calculation instead
  if (newHeight > state.height * 0.9) {
    newHeight = Math.floor(state.height * 0.8);
    newWidth = Math.floor(newHeight * CARD_DIMENSIONS.ASPECT_RATIO);
  }

  // Center on detected region
  let newX = Math.floor(detectedCenterX - newWidth / 2);
  let newY = Math.floor(detectedCenterY - newHeight / 2);

  // Clamp to image bounds
  newX = Math.max(0, Math.min(newX, state.width - newWidth));
  newY = Math.max(0, Math.min(newY, state.height - newHeight));

  const boundingRect: BoundingRect = {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };

  return {
    success: true,
    corners: rectToCorners(boundingRect),
    boundingRect,
    confidence: CONNECTED_COMPONENT.FALLBACK_CONFIDENCE,
    method: "color_region_fallback",
    imageDimensions: { width: state.width, height: state.height },
    detectedAspectRatio: boundingRect.width / boundingRect.height,
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
