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
import type { BoundingRect, ExtendedDetectionResult, Point } from "./types";

// ============================================================================
// OpenCV.js Type Declarations
// ============================================================================

declare global {
  interface CV {
    Mat: new () => CVMat;
    matFromImageData(imageData: ImageData): CVMat;
    matFromArray(
      rows: number,
      cols: number,
      type: number,
      data: number[]
    ): CVMat;
    Size: new (width: number, height: number) => CVSize;
    Scalar: new (
      v0?: number,
      v1?: number,
      v2?: number,
      v3?: number
    ) => CVScalar;

    // Image processing functions
    cvtColor(src: CVMat, dst: CVMat, code: number): void;
    GaussianBlur(
      src: CVMat,
      dst: CVMat,
      ksize: CVSize,
      sigmaX: number,
      sigmaY?: number
    ): void;
    morphologyEx(
      src: CVMat,
      dst: CVMat,
      op: number,
      kernel: CVMat,
      anchor?: CVPoint,
      iterations?: number
    ): void;
    getStructuringElement(shape: number, ksize: CVSize): CVMat;
    Canny(
      src: CVMat,
      dst: CVMat,
      threshold1: number,
      threshold2: number,
      apertureSize?: number,
      L2gradient?: boolean
    ): void;
    HoughLines(
      image: CVMat,
      lines: CVMat,
      rho: number,
      theta: number,
      threshold: number
    ): void;
    resize(
      src: CVMat,
      dst: CVMat,
      dsize: CVSize,
      fx?: number,
      fy?: number,
      interpolation?: number
    ): void;

    // Perspective warp functions
    getPerspectiveTransform(src: CVMat, dst: CVMat): CVMat;
    warpPerspective(
      src: CVMat,
      dst: CVMat,
      M: CVMat,
      dsize: CVSize,
      flags?: number,
      borderMode?: number,
      borderValue?: CVScalar
    ): void;

    // Image blending functions
    addWeighted(
      src1: CVMat,
      alpha: number,
      src2: CVMat,
      beta: number,
      gamma: number,
      dst: CVMat
    ): void;

    // Constants
    COLOR_RGBA2GRAY: number;
    MORPH_RECT: number;
    MORPH_CLOSE: number;
    INTER_AREA: number;
    INTER_LINEAR: number;
    INTER_CUBIC: number;
    BORDER_CONSTANT: number;
    CV_32FC2: number;
    CV_8UC4: number;
  }

  interface CVMat {
    delete(): void;
    rows: number;
    cols: number;
    data: Uint8Array;
    data32F: Float32Array;
  }

  interface CVSize {
    width: number;
    height: number;
  }

  interface CVScalar {
    [index: number]: number;
  }

  interface CVPoint {
    x: number;
    y: number;
  }

  var cv: CV | undefined;
}

// ============================================================================
// Performance Timing Utilities
// ============================================================================

interface StepTiming {
  readonly step: string;
  readonly durationMs: number;
}

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

  logTimings(): void {
    const totalMs = this.steps.reduce((sum, s) => sum + s.durationMs, 0);
    console.group("🕐 Card Detection Performance");
    for (const step of this.steps) {
      console.log(`  ${step.step}: ${step.durationMs}ms`);
    }
    console.log(`  📊 Total: ${Math.round(totalMs * 100) / 100}ms`);
    console.groupEnd();
  }
}

// ============================================================================
// Geometry Utilities
// ============================================================================

function isOpenCVReady(): boolean {
  return typeof cv !== "undefined" && cv !== null;
}

function robustSortCorners(points: readonly Point[]): readonly Point[] {
  if (points.length !== 4) return points;

  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  const center = { x: sum.x / points.length, y: sum.y / points.length };

  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });

  let tlIndex = 0;
  let minDistSq = sorted[0].x ** 2 + sorted[0].y ** 2;
  for (let i = 1; i < sorted.length; i++) {
    const distSq = sorted[i].x ** 2 + sorted[i].y ** 2;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      tlIndex = i;
    }
  }

  return [...sorted.slice(tlIndex), ...sorted.slice(0, tlIndex)];
}

function getBoundingRect(points: readonly Point[]): BoundingRect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Apply margin to corners by moving them slightly inward toward the center.
 * This prevents cutting off card edges during cropping.
 */
function applyCornerMargin(corners: readonly Point[]): readonly Point[] {
  if (corners.length !== 4) return corners;

  const margin = CANNY_EDGE_DETECTION.CORNER_MARGIN_RATIO;

  // Calculate center of the quadrilateral
  const center = {
    x: corners.reduce((sum, p) => sum + p.x, 0) / 4,
    y: corners.reduce((sum, p) => sum + p.y, 0) / 4,
  };

  // Move each corner slightly toward the center
  return corners.map((corner) => {
    const dx = center.x - corner.x;
    const dy = center.y - corner.y;
    return {
      x: Math.round(corner.x + dx * margin),
      y: Math.round(corner.y + dy * margin),
    };
  });
}

// ============================================================================
// Type Definitions
// ============================================================================

interface HoughLine {
  readonly rho: number;
  readonly theta: number;
}

interface LineIntersection {
  readonly point: Point;
  readonly lineIndices: readonly [number, number];
}

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
 */
export function detectCard(
  imageData: ImageData,
  width: number,
  height: number
): ExtendedDetectionResult {
  const timer = new PerformanceTimer();
  timer.start();

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
    src = cv!.matFromImageData(imageData);
    timer.markStep("image_to_mat");
    result = runCannyDetection(src, width, height, timer);
  } catch (error) {
    console.error("Canny detection failed:", error);
    timer.markStep("detection_error");
    result = createCenteredFallback(width, height);
  } finally {
    if (src) src.delete();
    timer.markStep("cleanup");
  }

  timer.logTimings();
  return result;
}

function runCannyDetection(
  src: CVMat,
  originalWidth: number,
  originalHeight: number,
  timer: PerformanceTimer
): ExtendedDetectionResult {
  const targetHeight = CANNY_EDGE_DETECTION.RESCALED_HEIGHT;
  const scale = targetHeight / originalHeight;
  const targetWidth = Math.round(originalWidth * scale);

  let scaled: CVMat | null = null;
  let gray: CVMat | null = null;
  let blurred: CVMat | null = null;
  let morphed: CVMat | null = null;
  let edges: CVMat | null = null;
  let kernel: CVMat | null = null;

  try {
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

    gray = new cv!.Mat();
    cv!.cvtColor(scaled, gray, cv!.COLOR_RGBA2GRAY);
    timer.markStep("grayscale");

    blurred = new cv!.Mat();
    const blurSize = CANNY_EDGE_DETECTION.BLUR_KERNEL_SIZE;
    cv!.GaussianBlur(gray, blurred, new cv!.Size(blurSize, blurSize), 0);
    timer.markStep("gaussian_blur");

    morphed = new cv!.Mat();
    const morphSize = CANNY_EDGE_DETECTION.MORPH_KERNEL_SIZE;
    kernel = cv!.getStructuringElement(
      cv!.MORPH_RECT,
      new cv!.Size(morphSize, morphSize)
    );
    cv!.morphologyEx(blurred, morphed, cv!.MORPH_CLOSE, kernel);
    timer.markStep("morphology_close");

    edges = new cv!.Mat();
    cv!.Canny(
      morphed,
      edges,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_LOW,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_HIGH
    );
    timer.markStep("canny_edge");

    const houghLines = findHoughLines(edges);
    if (!houghLines || houghLines.length === 0) {
      console.warn("🔍 Detection failed: No Hough lines found");
      timer.markStep("no_hough_lines");
      return createCenteredFallback(originalWidth, originalHeight);
    }
    console.log(`🔍 Hough lines found: ${houghLines.length}`);
    timer.markStep("hough_transform");

    const intersections = findLineIntersections(
      houghLines,
      targetWidth,
      targetHeight
    );
    console.log(`🔍 Intersections found: ${intersections.length}`);
    timer.markStep("find_intersections");

    if (intersections.length < 4) {
      console.warn(
        `🔍 Detection failed: Only ${intersections.length} intersections (need 4+)`
      );
      timer.markStep("insufficient_intersections");
      return createCenteredFallback(originalWidth, originalHeight);
    }

    const contours = findQuadrilateralContours(
      intersections,
      houghLines.length,
      targetWidth,
      targetHeight
    );
    console.log(`🔍 Quadrilaterals found: ${contours.length}`);
    timer.markStep("find_quadrilaterals");

    if (contours.length === 0) {
      console.warn("🔍 Detection failed: No valid quadrilaterals found");
      timer.markStep("no_quadrilaterals");
      return createCenteredFallback(originalWidth, originalHeight);
    }

    const bestContour = selectBestContour(contours);
    timer.markStep("select_best_contour");

    if (!bestContour) {
      console.warn("🔍 Detection failed: No contour passed scoring");
      timer.markStep("no_valid_contour");
      return createCenteredFallback(originalWidth, originalHeight);
    }
    console.log(
      `🔍 Best contour selected with score: ${bestContour.score.toFixed(2)}`
    );
    console.log(`🔍 Corners:`, bestContour.corners);

    const scaledCorners = bestContour.corners.map((p) => ({
      x: Math.round(p.x / scale),
      y: Math.round(p.y / scale),
    }));
    timer.markStep("scale_corners");

    const orderedCorners = robustSortCorners(scaledCorners);
    timer.markStep("order_corners");

    // Apply margin to prevent cutting off card edges
    const marginedCorners = applyCornerMargin(orderedCorners);
    timer.markStep("apply_margin");

    const boundingRect = getBoundingRect(marginedCorners);
    const aspectRatio = boundingRect.width / boundingRect.height;

    return {
      success: true,
      corners: marginedCorners,
      boundingRect,
      confidence: CANNY_EDGE_DETECTION.SUCCESS_CONFIDENCE,
      method: "canny_edge_detection",
      imageDimensions: { width: originalWidth, height: originalHeight },
      detectedAspectRatio: aspectRatio,
    };
  } finally {
    if (scaled) scaled.delete();
    if (gray) gray.delete();
    if (blurred) blurred.delete();
    if (morphed) morphed.delete();
    if (edges) edges.delete();
    if (kernel) kernel.delete();
  }
}

// ============================================================================
// Hough Line Detection
// ============================================================================

function findHoughLines(edges: CVMat): HoughLine[] | null {
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

      if (lines.rows > 0 && lines.rows <= maxLines) break;

      lines.delete();
      lines = null;
    }

    if (!lines || lines.rows === 0) return null;

    const result: HoughLine[] = [];
    for (let i = 0; i < lines.rows; i++) {
      result.push({
        rho: lines.data32F[i * 2],
        theta: lines.data32F[i * 2 + 1],
      });
    }
    return result;
  } finally {
    if (lines) lines.delete();
  }
}

// ============================================================================
// Line Intersection Detection
// ============================================================================

function euclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

function lineIntersection(
  line1: HoughLine,
  line2: HoughLine,
  maxX: number,
  maxY: number
): Point | null {
  const { rho: rho1, theta: theta1 } = line1;
  const { rho: rho2, theta: theta2 } = line2;

  const angle1 = Math.abs(theta1 - theta2);
  const angle2 = Math.PI - angle1;
  const minAngle = Math.min(angle1, angle2);

  if (minAngle < CANNY_EDGE_DETECTION.MIN_INTERSECTION_ANGLE) return null;

  const cos1 = Math.cos(theta1);
  const sin1 = Math.sin(theta1);
  const cos2 = Math.cos(theta2);
  const sin2 = Math.sin(theta2);

  const det = cos1 * sin2 - cos2 * sin1;
  if (Math.abs(det) < 1e-10) return null;

  const x = (rho1 * sin2 - rho2 * sin1) / det;
  const y = (cos1 * rho2 - cos2 * rho1) / det;

  if (x < 0 || x > maxX || y < 0 || y > maxY) return null;

  return { x: Math.round(x), y: Math.round(y) };
}

function findLineIntersections(
  lines: HoughLine[],
  maxX: number,
  maxY: number
): LineIntersection[] {
  const intersections: LineIntersection[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const point = lineIntersection(lines[i], lines[j], maxX, maxY);
      if (point) intersections.push({ point, lineIndices: [i, j] });
    }
  }
  return intersections;
}

// ============================================================================
// Quadrilateral Detection
// ============================================================================

function buildIntersectionGraph(
  intersections: LineIntersection[]
): Set<number>[] {
  const graph: Set<number>[] = intersections.map(() => new Set());
  const minCornerDistance = CANNY_EDGE_DETECTION.MIN_CORNER_DISTANCE;

  for (let i = 0; i < intersections.length; i++) {
    for (let j = i + 1; j < intersections.length; j++) {
      const lines1 = intersections[i].lineIndices;
      const lines2 = intersections[j].lineIndices;

      const sharedLine =
        lines1[0] === lines2[0] ||
        lines1[0] === lines2[1] ||
        lines1[1] === lines2[0] ||
        lines1[1] === lines2[1];

      if (!sharedLine) continue;

      const dist = euclideanDistance(
        intersections[i].point,
        intersections[j].point
      );
      if (dist < minCornerDistance) continue;

      graph[i].add(j);
      graph[j].add(i);
    }
  }
  return graph;
}

function findCycles(graph: Set<number>[], length: number): number[][] {
  const allCycles: number[][] = [];

  function dfs(visited: number[], current: number): void {
    if (visited.length === length) {
      if (graph[current].has(visited[0])) allCycles.push([...visited]);
      return;
    }
    for (const neighbor of graph[current]) {
      if (!visited.includes(neighbor)) {
        visited.push(neighbor);
        dfs(visited, neighbor);
        visited.pop();
      }
    }
  }

  for (let i = 0; i < graph.length; i++) {
    dfs([i], i);
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique: number[][] = [];
  for (const cycle of allCycles) {
    const minIdx = cycle.indexOf(Math.min(...cycle));
    const rotated = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
    const reversed = [rotated[0], ...rotated.slice(1).reverse()];
    const key =
      rotated.join(",") < reversed.join(",")
        ? rotated.join(",")
        : reversed.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(rotated);
    }
  }
  return unique;
}

function findQuadrilateralContours(
  intersections: LineIntersection[],
  numLines: number,
  imageWidth: number,
  imageHeight: number
): QuadContour[] {
  if (intersections.length < 4) return [];

  const graph = buildIntersectionGraph(intersections);
  const cycles = findCycles(graph, 4);

  const imageArea = imageWidth * imageHeight;
  const minArea = imageArea * CANNY_EDGE_DETECTION.MIN_CONTOUR_AREA_RATIO;

  const contours: QuadContour[] = [];
  for (const cycle of cycles) {
    const corners = cycle.map((idx) => intersections[idx].point);
    const area = computePolygonArea(corners);
    if (area >= minArea) {
      contours.push({ corners, area, score: 0 });
    }
  }
  return contours;
}

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

function selectBestContour(contours: QuadContour[]): QuadContour | null {
  if (contours.length === 0) return null;

  let bestContour: QuadContour | null = null;
  let bestScore = 0;

  for (const contour of contours) {
    const orderedContour = orderContour(contour.corners);
    const area = computePolygonArea(orderedContour);
    const boundingRect = getBoundingRect(orderedContour);
    const aspectRatio = boundingRect.width / boundingRect.height;
    const idealRatio = CARD_DIMENSIONS.ASPECT_RATIO;
    const ratioDeviation = Math.abs(aspectRatio - idealRatio);
    const ratioScore = Math.max(0, 100 - ratioDeviation * 40);

    // Corner angle scoring: provides bonus for near-90° corners (0-20% bonus)
    const angleScore = computeCornerAngleScore(orderedContour);
    const angleBonus = 1 + (angleScore / 100) * 0.2; // 1.0 to 1.2 multiplier

    // Combined score: base = area * ratio quality, with angle bonus
    const score = area * (ratioScore / 100) * angleBonus;

    if (score > bestScore) {
      bestScore = score;
      bestContour = { ...contour, corners: [...orderedContour], score };
    }
  }
  return bestContour;
}

/**
 * Compute a score based on how close the corners are to 90 degrees.
 * Returns 0-100 where 100 means all corners are exactly 90°.
 */
function computeCornerAngleScore(corners: readonly Point[]): number {
  if (corners.length !== 4) return 0;

  let totalDeviation = 0;
  const idealAngle = Math.PI / 2; // 90 degrees

  for (let i = 0; i < 4; i++) {
    const prev = corners[(i + 3) % 4];
    const curr = corners[i];
    const next = corners[(i + 1) % 4];

    // Vectors from current corner to adjacent corners
    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    // Compute angle between vectors using dot product
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angle = Math.acos(cosAngle);

    // How far from 90 degrees
    totalDeviation += Math.abs(angle - idealAngle);
  }

  // Average deviation (max reasonable is ~45° per corner)
  const avgDeviation = totalDeviation / 4;
  const maxDeviation = Math.PI / 4; // 45 degrees
  const score = Math.max(0, 100 * (1 - avgDeviation / maxDeviation));

  return score;
}

function orderContour(contour: readonly Point[]): readonly Point[] {
  if (contour.length !== 4) return contour;

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
  const others = contour
    .filter((_, idx) => idx !== tlIndex)
    .map((p) => ({ point: p, angle: Math.atan2(p.y - tl.y, p.x - tl.x) }))
    .sort((a, b) => a.angle - b.angle);

  return [tl, others[0].point, others[1].point, others[2].point];
}

// ============================================================================
// Fallback Detection
// ============================================================================

function createCenteredFallback(
  width: number,
  height: number
): ExtendedDetectionResult {
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
    success: false,
    corners,
    boundingRect,
    confidence: CANNY_EDGE_DETECTION.FALLBACK_CONFIDENCE,
    method: "canny_edge_detection",
    imageDimensions: { width, height },
    detectedAspectRatio: CARD_DIMENSIONS.ASPECT_RATIO,
  };
}

// ============================================================================
// Method Description Utility
// ============================================================================

export function getMethodDescription(method: string): string {
  switch (method) {
    case "canny_edge_detection":
      return "Canny Edge Detection with Hough Lines";
    default:
      return "Unknown detection method";
  }
}
