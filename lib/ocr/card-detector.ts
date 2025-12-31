/**
 * Card Detector Module - Canny Edge Detection Implementation
 *
 * This module implements card boundary detection using Canny edge detection,
 * Hough line transform, and quadrilateral cycle detection.
 *
 * Algorithm Overview:
 * 1. Rescale image to target height (500px) for faster processing
 * 2. Convert to grayscale
 * 3. Apply Gaussian blur to reduce noise
 * 4. Apply morphological close to fill small holes
 * 5. Apply Canny edge detection
 * 6. Detect lines using Hough line transform
 * 7. Find intersections between lines
 * 8. Build a graph of intersections connected by lines
 * 9. Find 4-cycles (quadrilaterals) in the graph
 * 10. Score and select the best quadrilateral
 */

import { CANNY_EDGE_DETECTION, CARD_DIMENSIONS } from "./constants";
import {
  getBoundingRect,
  isOpenCVReady,
  robustSortCorners,
} from "./geometry-utils";
import type { BoundingRect, ExtendedDetectionResult, Point } from "./types";

// ============================================================================
// Performance Timing Utilities
// ============================================================================

/**
 * Step timing information for performance monitoring
 */
interface StepTiming {
  readonly step: string;
  readonly durationMs: number;
}

/**
 * Detection timings for all steps
 */
interface DetectionTimings {
  readonly steps: readonly StepTiming[];
  readonly totalMs: number;
}

/**
 * Timer class for tracking step durations
 */
class PerformanceTimer {
  private steps: StepTiming[] = [];
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.steps = [];
  }

  markStep(step: string): void {
    const now = performance.now();
    const durationMs = now - this.startTime;
    this.steps.push({ step, durationMs: Math.round(durationMs * 100) / 100 });
    this.startTime = now;
  }

  getTimings(): DetectionTimings {
    const totalMs = this.steps.reduce((sum, s) => sum + s.durationMs, 0);
    return {
      steps: this.steps,
      totalMs: Math.round(totalMs * 100) / 100,
    };
  }

  logTimings(): void {
    const timings = this.getTimings();
    console.group("🕐 Card Detection Performance");
    for (const step of timings.steps) {
      console.log(`  ${step.step}: ${step.durationMs}ms`);
    }
    console.log(`  📊 Total: ${timings.totalMs}ms`);
    console.groupEnd();
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Hough line in polar form (rho, theta)
 */
interface HoughLine {
  readonly rho: number;
  readonly theta: number;
}

/**
 * Line intersection point with metadata
 */
interface LineIntersection {
  readonly point: Point;
  readonly lineIndices: readonly [number, number];
}

/**
 * Quadrilateral contour candidate
 */
interface QuadContour {
  readonly corners: readonly Point[];
  readonly area: number;
  readonly score: number;
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Main card detection function using Canny edge detection.
 * Attempts to find a quadrilateral card boundary in the image.
 *
 * @param imageData - ImageData from canvas
 * @param width - Image width
 * @param height - Image height
 * @returns Extended detection result with corners and diagnostics
 */
export function detectCard(
  imageData: ImageData,
  width: number,
  height: number
): ExtendedDetectionResult {
  const timer = new PerformanceTimer();
  timer.start();

  // Check if OpenCV is available
  if (!isOpenCVReady()) {
    console.warn("OpenCV.js not loaded, using fallback detection");
    timer.markStep("opencv_check_failed");
    timer.logTimings();
    return createCenteredFallback(width, height);
  }

  timer.markStep("opencv_check");

  let src: CVMat | null = null;
  let result: ExtendedDetectionResult;

  try {
    // Convert ImageData to OpenCV Mat
    src = cv!.matFromImageData(imageData);
    timer.markStep("image_to_mat");

    // Run the Canny edge detection pipeline
    result = runCannyDetection(src, width, height, timer);
  } catch (error) {
    console.error("Canny detection failed:", error);
    timer.markStep("detection_error");
    result = createCenteredFallback(width, height);
  } finally {
    // Clean up OpenCV resources
    if (src) src.delete();
    timer.markStep("cleanup");
  }

  timer.logTimings();
  return result;
}

/**
 * Run the full Canny edge detection pipeline
 */
function runCannyDetection(
  src: CVMat,
  originalWidth: number,
  originalHeight: number,
  timer: PerformanceTimer
): ExtendedDetectionResult {
  // Step 1: Rescale image to target height
  const targetHeight = CANNY_EDGE_DETECTION.RESCALED_HEIGHT;
  const scale = targetHeight / originalHeight;
  const targetWidth = Math.round(originalWidth * scale);

  let scaled: CVMat | null = null;
  let gray: CVMat | null = null;
  let blurred: CVMat | null = null;
  let morphed: CVMat | null = null;
  let edges: CVMat | null = null;
  let lines: CVMat | null = null;
  let kernel: CVMat | null = null;

  try {
    // Rescale
    scaled = new cv!.Mat();
    cv!.resize(
      src,
      scaled,
      new cv!.Size(targetWidth, targetHeight),
      0,
      0,
      cv!.INTER_AREA
    );
    timer.markStep("rescale");

    // Convert to grayscale
    gray = new cv!.Mat();
    cv!.cvtColor(scaled, gray, cv!.COLOR_RGBA2GRAY);
    timer.markStep("grayscale");

    // Apply Gaussian blur
    blurred = new cv!.Mat();
    const blurSize = CANNY_EDGE_DETECTION.BLUR_KERNEL_SIZE;
    cv!.GaussianBlur(gray, blurred, new cv!.Size(blurSize, blurSize), 0);
    timer.markStep("gaussian_blur");

    // Apply morphological close operation
    morphed = new cv!.Mat();
    const morphSize = CANNY_EDGE_DETECTION.MORPH_KERNEL_SIZE;
    kernel = cv!.getStructuringElement(
      cv!.MORPH_RECT,
      new cv!.Size(morphSize, morphSize)
    );
    cv!.morphologyEx(blurred, morphed, cv!.MORPH_CLOSE, kernel);
    timer.markStep("morphology_close");

    // Apply Canny edge detection
    edges = new cv!.Mat();
    cv!.Canny(
      morphed,
      edges,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_LOW,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_HIGH
    );
    timer.markStep("canny_edge");

    // Apply Hough line transform
    lines = new cv!.Mat();
    const houghLines = findHoughLines(edges, timer);

    if (!houghLines || houghLines.length === 0) {
      timer.markStep("no_hough_lines");
      return createCenteredFallback(originalWidth, originalHeight);
    }

    timer.markStep("hough_transform");

    // Find intersections between lines
    const intersections = findLineIntersections(
      houghLines,
      targetWidth,
      targetHeight
    );
    timer.markStep("find_intersections");

    if (intersections.length < 4) {
      timer.markStep("insufficient_intersections");
      return createCenteredFallback(originalWidth, originalHeight);
    }

    // Find quadrilateral contours
    const contours = findQuadrilateralContours(
      intersections,
      houghLines.length,
      targetWidth,
      targetHeight
    );
    timer.markStep("find_quadrilaterals");

    if (contours.length === 0) {
      timer.markStep("no_quadrilaterals");
      return createCenteredFallback(originalWidth, originalHeight);
    }

    // Select the best contour
    const bestContour = selectBestContour(
      contours,
      edges,
      targetWidth,
      targetHeight
    );
    timer.markStep("select_best_contour");

    if (!bestContour) {
      timer.markStep("no_valid_contour");
      return createCenteredFallback(originalWidth, originalHeight);
    }

    // Scale corners back to original image size
    const scaledCorners = bestContour.corners.map((p) => ({
      x: Math.round(p.x / scale),
      y: Math.round(p.y / scale),
    }));
    timer.markStep("scale_corners");

    // Order corners as TL, TR, BR, BL
    const orderedCorners = robustSortCorners(scaledCorners);
    timer.markStep("order_corners");

    const boundingRect = getBoundingRect(orderedCorners);
    const aspectRatio = boundingRect.width / boundingRect.height;

    return {
      success: true,
      corners: orderedCorners,
      boundingRect,
      confidence: CANNY_EDGE_DETECTION.SUCCESS_CONFIDENCE,
      method: "canny_edge_detection",
      imageDimensions: { width: originalWidth, height: originalHeight },
      detectedAspectRatio: aspectRatio,
    };
  } finally {
    // Clean up all OpenCV resources
    if (scaled) scaled.delete();
    if (gray) gray.delete();
    if (blurred) blurred.delete();
    if (morphed) morphed.delete();
    if (edges) edges.delete();
    if (lines) lines.delete();
    if (kernel) kernel.delete();
  }
}

// ============================================================================
// Hough Line Detection
// ============================================================================

/**
 * Find lines using Hough transform with adaptive threshold
 */
function findHoughLines(
  edges: CVMat,
  timer: PerformanceTimer
): HoughLine[] | null {
  const thresholds = CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS;
  const maxLines = CANNY_EDGE_DETECTION.HOUGH_MAX_LINES;

  let lines: CVMat | null = null;

  try {
    for (const threshold of thresholds) {
      lines = new cv!.Mat();
      cv!.HoughLines(
        edges,
        lines,
        CANNY_EDGE_DETECTION.HOUGH_RHO,
        CANNY_EDGE_DETECTION.HOUGH_THETA,
        threshold
      );

      if (lines.rows > 0 && lines.rows <= maxLines) {
        break;
      }

      lines.delete();
      lines = null;
    }

    if (!lines || lines.rows === 0) {
      return null;
    }

    // Extract line data from OpenCV Mat
    const result: HoughLine[] = [];
    for (let i = 0; i < lines.rows; i++) {
      const rho = lines.data32F[i * 2];
      const theta = lines.data32F[i * 2 + 1];
      result.push({ rho, theta });
    }

    return result;
  } finally {
    if (lines) lines.delete();
  }
}

// ============================================================================
// Line Intersection Detection
// ============================================================================

/**
 * Calculate Euclidean distance between two points
 */
function euclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

/**
 * Find intersection point of two lines in Hough space
 * Returns null if lines are parallel or intersection is out of bounds
 */
function lineIntersection(
  line1: HoughLine,
  line2: HoughLine,
  maxX: number,
  maxY: number
): Point | null {
  const { rho: rho1, theta: theta1 } = line1;
  const { rho: rho2, theta: theta2 } = line2;

  // Check minimum angle between lines
  const angle1 = Math.abs(theta1 - theta2);
  const angle2 = Math.PI - angle1;
  const minAngle = Math.min(angle1, angle2);

  if (minAngle < CANNY_EDGE_DETECTION.MIN_INTERSECTION_ANGLE) {
    return null; // Lines are nearly parallel
  }

  // Solve linear system to find intersection
  // cos(theta1) * x + sin(theta1) * y = rho1
  // cos(theta2) * x + sin(theta2) * y = rho2
  const cos1 = Math.cos(theta1);
  const sin1 = Math.sin(theta1);
  const cos2 = Math.cos(theta2);
  const sin2 = Math.sin(theta2);

  const det = cos1 * sin2 - cos2 * sin1;
  if (Math.abs(det) < 1e-10) {
    return null; // Singular matrix (parallel lines)
  }

  const x = (rho1 * sin2 - rho2 * sin1) / det;
  const y = (cos1 * rho2 - cos2 * rho1) / det;

  // Check bounds
  if (x < 0 || x > maxX || y < 0 || y > maxY) {
    return null;
  }

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Find all valid intersections between lines
 */
function findLineIntersections(
  lines: HoughLine[],
  maxX: number,
  maxY: number
): LineIntersection[] {
  const intersections: LineIntersection[] = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const point = lineIntersection(lines[i], lines[j], maxX, maxY);
      if (point) {
        intersections.push({
          point,
          lineIndices: [i, j],
        });
      }
    }
  }

  return intersections;
}

// ============================================================================
// Quadrilateral Detection (Graph-based Cycle Finding)
// ============================================================================

/**
 * Build adjacency graph from intersections
 * Two intersections are adjacent if they share a line
 */
function buildIntersectionGraph(
  intersections: LineIntersection[],
  _numLines: number
): Set<number>[] {
  const graph: Set<number>[] = intersections.map(() => new Set());

  const minCornerDistance = CANNY_EDGE_DETECTION.MIN_CORNER_DISTANCE;

  for (let i = 0; i < intersections.length; i++) {
    for (let j = i + 1; j < intersections.length; j++) {
      // Check if intersections share a line
      const lines1 = intersections[i].lineIndices;
      const lines2 = intersections[j].lineIndices;

      const sharedLine =
        lines1[0] === lines2[0] ||
        lines1[0] === lines2[1] ||
        lines1[1] === lines2[0] ||
        lines1[1] === lines2[1];

      if (!sharedLine) continue;

      // Check minimum distance between corners
      const dist = euclideanDistance(
        intersections[i].point,
        intersections[j].point
      );

      if (dist < minCornerDistance) continue;

      // Add edge to graph
      graph[i].add(j);
      graph[j].add(i);
    }
  }

  return graph;
}

/**
 * Find all 4-cycles (quadrilaterals) in the graph using DFS
 */
function findCycles(graph: Set<number>[], length: number): number[][] {
  const allCycles: number[][] = [];

  function dfs(visited: number[], current: number, target: number[]): void {
    if (visited.length === length) {
      // Check if we can complete the cycle
      if (graph[current].has(visited[0])) {
        allCycles.push([...visited]);
      }
      return;
    }

    for (const neighbor of graph[current]) {
      if (!visited.includes(neighbor)) {
        visited.push(neighbor);
        dfs(visited, neighbor, target);
        visited.pop();
      }
    }
  }

  // Start DFS from each node
  for (let i = 0; i < graph.length; i++) {
    dfs([i], i, []);
  }

  // Deduplicate cycles (same cycle can be found in multiple ways)
  const uniqueCycles = deduplicateCycles(allCycles);

  return uniqueCycles;
}

/**
 * Deduplicate cycles by normalizing their representation
 */
function deduplicateCycles(cycles: number[][]): number[][] {
  const seen = new Set<string>();
  const unique: number[][] = [];

  for (const cycle of cycles) {
    // Normalize: rotate to start with minimum element, pick smaller of forward/reverse
    const minIdx = cycle.indexOf(Math.min(...cycle));
    const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
    const reversed = [rotated[0], ...rotated.slice(1).reverse()];

    const key1 = rotated.join(",");
    const key2 = reversed.join(",");
    const key = key1 < key2 ? key1 : key2;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rotated);
    }
  }

  return unique;
}

/**
 * Find quadrilateral contours from intersections
 */
function findQuadrilateralContours(
  intersections: LineIntersection[],
  numLines: number,
  imageWidth: number,
  imageHeight: number
): QuadContour[] {
  if (intersections.length < 4) {
    return [];
  }

  // Build intersection graph
  const graph = buildIntersectionGraph(intersections, numLines);

  // Find all 4-cycles
  const cycles = findCycles(graph, 4);

  // Convert cycles to contours
  const imageArea = imageWidth * imageHeight;
  const minArea = imageArea * CANNY_EDGE_DETECTION.MIN_CONTOUR_AREA_RATIO;

  const contours: QuadContour[] = [];

  for (const cycle of cycles) {
    const corners = cycle.map((idx) => intersections[idx].point);
    const area = computePolygonArea(corners);

    if (area < minArea) {
      continue;
    }

    contours.push({
      corners,
      area,
      score: 0, // Will be computed later
    });
  }

  return contours;
}

/**
 * Compute area of a polygon using the shoelace formula
 */
function computePolygonArea(points: readonly Point[]): number {
  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

// ============================================================================
// Contour Scoring and Selection
// ============================================================================

/**
 * Order contour corners in [TL, TR, BR, BL] order
 */
function orderContour(contour: readonly Point[]): readonly Point[] {
  if (contour.length !== 4) return contour;

  // Find top-left point (smallest sum of x+y)
  let tlIndex = 0;
  let minSum = contour[0].x + contour[0].y;

  for (let i = 1; i < 4; i++) {
    const sum = contour[i].x + contour[i].y;
    if (sum < minSum) {
      minSum = sum;
      tlIndex = i;
    }
  }

  const tl = contour[tlIndex];

  // For remaining points, sort by angle from TL
  const others = contour
    .filter((_, idx) => idx !== tlIndex)
    .map((p) => ({
      point: p,
      angle: Math.atan2(p.y - tl.y, p.x - tl.x),
    }))
    .sort((a, b) => a.angle - b.angle);

  // Order: TL, then by increasing angle (TR, BR, BL)
  return [tl, others[0].point, others[1].point, others[2].point];
}

/**
 * Score contour based on edge overlap
 * Higher score = contour matches detected edges better
 */
function scoreContour(
  contour: readonly Point[],
  edges: CVMat,
  _imageWidth: number,
  _imageHeight: number
): number {
  // Simple scoring based on contour area
  // In the Python version, this draws the contour and computes overlap with edges
  // For now, we use a simplified scoring based on area and aspect ratio

  const orderedContour = orderContour(contour);
  const area = computePolygonArea(orderedContour);

  // Calculate aspect ratio
  const boundingRect = getBoundingRect(orderedContour);
  const aspectRatio = boundingRect.width / boundingRect.height;

  // Score based on aspect ratio similarity to ID card
  const idealRatio = CARD_DIMENSIONS.ASPECT_RATIO;
  const ratioDeviation = Math.abs(aspectRatio - idealRatio);
  const ratioScore = Math.max(0, 100 - ratioDeviation * 40);

  // Combined score (area weighted by ratio score)
  return area * (ratioScore / 100);
}

/**
 * Select the best contour from candidates
 */
function selectBestContour(
  contours: QuadContour[],
  edges: CVMat,
  imageWidth: number,
  imageHeight: number
): QuadContour | null {
  if (contours.length === 0) {
    return null;
  }

  let bestContour: QuadContour | null = null;
  let bestScore = 0;

  for (const contour of contours) {
    const score = scoreContour(contour.corners, edges, imageWidth, imageHeight);

    if (score > bestScore) {
      bestScore = score;
      bestContour = { ...contour, score };
    }
  }

  return bestContour;
}

// ============================================================================
// Fallback Detection
// ============================================================================

/**
 * Create a centered fallback rectangle when detection fails.
 * Uses 70% of the smaller dimension with ID card aspect ratio.
 */
function createCenteredFallback(
  width: number,
  height: number
): ExtendedDetectionResult {
  // Use 70% of the smaller dimension to create a card-shaped region
  const smallerDim = Math.min(width, height);
  const cropWidth = Math.floor(smallerDim * 0.7);
  const cropHeight = Math.floor(cropWidth / CARD_DIMENSIONS.ASPECT_RATIO);

  const cropX = Math.floor((width - cropWidth) / 2);
  const cropY = Math.floor((height - cropHeight) / 2);

  const boundingRect: BoundingRect = {
    x: Math.max(0, cropX),
    y: Math.max(0, cropY),
    width: Math.min(cropWidth, width),
    height: Math.min(cropHeight, height),
  };

  const corners: readonly Point[] = [
    { x: boundingRect.x, y: boundingRect.y },
    { x: boundingRect.x + boundingRect.width, y: boundingRect.y },
    {
      x: boundingRect.x + boundingRect.width,
      y: boundingRect.y + boundingRect.height,
    },
    { x: boundingRect.x, y: boundingRect.y + boundingRect.height },
  ];

  return {
    success: false, // Fallback is not a true detection
    corners,
    boundingRect,
    confidence: CANNY_EDGE_DETECTION.FALLBACK_CONFIDENCE,
    method: "canny_edge_detection",
    imageDimensions: { width, height },
    detectedAspectRatio: CARD_DIMENSIONS.ASPECT_RATIO,
  };
}
