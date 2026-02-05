/**
 * Debug Visualizer Module - Hough Transform Debug Utilities
 *
 * This module provides functions to extract and visualize the intermediate
 * results of the Canny/Hough detection pipeline for debugging purposes.
 */

import { CANNY_EDGE_DETECTION, CARD_DIMENSIONS } from "./constants";

// ============================================================================
// Type Definitions
// ============================================================================

export interface HoughLine {
  readonly rho: number;
  readonly theta: number;
}

export type LineCategory = "horizontal" | "vertical" | "diagonal";

export interface MergedLine extends HoughLine {
  readonly weight: number;
  readonly category: LineCategory;
}

export interface LineEndpoints {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly category: LineCategory;
}

export interface IntersectionPoint {
  readonly x: number;
  readonly y: number;
  readonly lineIndices: readonly [number, number];
}

/**
 * Accumulator data for Hough transform visualization
 */
export interface AccumulatorData {
  /** 2D vote counts [thetaIndex][rhoIndex] */
  readonly votes: number[][];
  /** Maximum vote count for normalization */
  readonly maxVotes: number;
  /** Rho values for each column */
  readonly rhoValues: number[];
  /** Theta values in radians for each row */
  readonly thetaValues: number[];
  /** Number of rho bins */
  readonly rhoSteps: number;
  /** Number of theta bins */
  readonly thetaSteps: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface QuadContour {
  readonly corners: Point[];
  readonly area: number;
  readonly aspectRatio: number;
  readonly score: number;
  readonly isValid: boolean;
}

export interface HoughDebugResult {
  readonly lines: MergedLine[];
  readonly lineEndpoints: LineEndpoints[];
  readonly intersections: IntersectionPoint[];
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly scale: number;
  readonly rawLineCount: number;
  readonly mergedLineCount: number;
  /** Number of raw vertical lines before merging */
  readonly rawVerticalCount: number;
  /** Number of raw horizontal lines before merging */
  readonly rawHorizontalCount: number;
  /** Number of merged vertical lines */
  readonly mergedVerticalCount: number;
  /** Number of merged horizontal lines */
  readonly mergedHorizontalCount: number;
  /** Accumulator data for heatmap visualization */
  readonly accumulator: AccumulatorData | null;
  /** Threshold used for this analysis */
  readonly threshold: number;
  /** All detected quadrilateral candidates */
  readonly quadrilaterals: QuadContour[];
  /** Best quadrilateral (if any passes validation) */
  readonly bestQuadrilateral: QuadContour | null;
}

// ============================================================================
// OpenCV Type Check
// ============================================================================
// Note: CV types (cv, CVMat, CVSize, etc.) are declared globally in detector.ts

function isOpenCVReady(): boolean {
  return typeof cv !== "undefined" && cv !== null;
}

// ============================================================================
// Line Classification & Merging
// ============================================================================

/**
 * Classify a line as horizontal, vertical, or diagonal based on its theta angle.
 * In Hough (ρ,θ): θ is the angle of the NORMAL to the line.
 * - θ ≈ 0 or π → normal is horizontal → LINE is VERTICAL
 * - θ ≈ π/2 → normal is vertical → LINE is HORIZONTAL
 */
function classifyLine(theta: number): LineCategory {
  const tolerance = CANNY_EDGE_DETECTION.LINE_CLASSIFICATION_TOLERANCE;
  const normalizedTheta = ((theta % Math.PI) + Math.PI) % Math.PI;

  // Vertical lines: theta near 0 or π (normal points left/right)
  if (normalizedTheta < tolerance || normalizedTheta > Math.PI - tolerance) {
    return "vertical";
  }
  // Horizontal lines: theta near π/2 (normal points up/down)
  if (Math.abs(normalizedTheta - Math.PI / 2) < tolerance) {
    return "horizontal";
  }
  return "diagonal";
}

/**
 * Compute the angular difference between two lines.
 */
function angleDifference(theta1: number, theta2: number): number {
  const diff = Math.abs(theta1 - theta2);
  return Math.min(diff, Math.PI - diff);
}

/**
 * Merge nearby parallel lines into clusters.
 * Uses category-specific thresholds - vertical lines get more aggressive merging.
 */
function mergeLines(lines: HoughLine[]): MergedLine[] {
  if (lines.length === 0) return [];

  const angleThreshold = CANNY_EDGE_DETECTION.LINE_MERGE_ANGLE_THRESHOLD;
  const distanceThresholdDefault =
    CANNY_EDGE_DETECTION.LINE_MERGE_DISTANCE_THRESHOLD;
  const distanceThresholdVertical =
    CANNY_EDGE_DETECTION.LINE_MERGE_DISTANCE_THRESHOLD_VERTICAL;

  const assigned = new Array(lines.length).fill(false);
  const merged: MergedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (assigned[i]) continue;

    // Determine category of the seed line to choose appropriate threshold
    const seedCategory = classifyLine(lines[i].theta);
    const distanceThreshold =
      seedCategory === "vertical"
        ? distanceThresholdVertical
        : distanceThresholdDefault;

    const cluster: HoughLine[] = [lines[i]];
    assigned[i] = true;

    for (let j = i + 1; j < lines.length; j++) {
      if (assigned[j]) continue;

      const angleDiff = angleDifference(lines[i].theta, lines[j].theta);
      const dist = Math.abs(lines[i].rho - lines[j].rho);

      if (angleDiff < angleThreshold && dist < distanceThreshold) {
        cluster.push(lines[j]);
        assigned[j] = true;
      }
    }

    let sumRho = 0;
    let sumTheta = 0;
    for (const line of cluster) {
      sumRho += line.rho;
      sumTheta += line.theta;
    }

    const avgRho = sumRho / cluster.length;
    const avgTheta = sumTheta / cluster.length;
    const category = classifyLine(avgTheta);

    merged.push({
      rho: avgRho,
      theta: avgTheta,
      weight: cluster.length,
      category,
    });
  }

  return merged;
}

/**
 * Filter to keep only horizontal and vertical lines.
 */
function filterCardEdgeLines(lines: MergedLine[]): MergedLine[] {
  return lines.filter((line) => line.category !== "diagonal");
}

// ============================================================================
// Hough Line Extraction
// ============================================================================

/**
 * Convert Hough line parameters (rho, theta) to line endpoints for drawing.
 */
function houghLineToEndpoints(
  line: MergedLine,
  imageWidth: number,
  imageHeight: number,
): LineEndpoints {
  const { rho, theta, category } = line;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const x0 = cos * rho;
  const y0 = sin * rho;

  // Extend line to cover full image (use large multiplier)
  const scale = Math.max(imageWidth, imageHeight) * 2;

  return {
    x1: Math.round(x0 - scale * sin),
    y1: Math.round(y0 + scale * cos),
    x2: Math.round(x0 + scale * sin),
    y2: Math.round(y0 - scale * cos),
    category,
  };
}

/**
 * Find intersection point between two Hough lines.
 */
function findIntersection(
  line1: HoughLine,
  line2: HoughLine,
  maxX: number,
  maxY: number,
  lineIdx1: number,
  lineIdx2: number,
): IntersectionPoint | null {
  const { rho: rho1, theta: theta1 } = line1;
  const { rho: rho2, theta: theta2 } = line2;

  // Check angle difference (skip near-parallel lines)
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

  // Check if intersection is within image bounds
  if (x < 0 || x > maxX || y < 0 || y > maxY) return null;

  return {
    x: Math.round(x),
    y: Math.round(y),
    lineIndices: [lineIdx1, lineIdx2],
  };
}

// ============================================================================
// Quadrilateral Detection
// ============================================================================

/**
 * Build an adjacency graph from intersections based on shared lines.
 */
function buildIntersectionGraph(
  intersections: IntersectionPoint[],
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

      const dist = Math.sqrt(
        Math.pow(intersections[i].x - intersections[j].x, 2) +
          Math.pow(intersections[i].y - intersections[j].y, 2),
      );
      if (dist < minCornerDistance) continue;

      graph[i].add(j);
      graph[j].add(i);
    }
  }
  return graph;
}

/**
 * Find all 4-cycles (quadrilaterals) in the intersection graph.
 */
function findCycles4(graph: Set<number>[]): number[][] {
  const allCycles: number[][] = [];

  function dfs(visited: number[], current: number): void {
    if (visited.length === 4) {
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

  // Deduplicate cycles
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

/**
 * Compute polygon area using shoelace formula.
 */
function computePolygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Order quadrilateral corners starting from top-left, going clockwise.
 */
function orderQuadCorners(corners: Point[]): Point[] {
  if (corners.length !== 4) return corners;

  let tlIndex = 0;
  let minSum = corners[0].x + corners[0].y;
  for (let i = 1; i < 4; i++) {
    const sum = corners[i].x + corners[i].y;
    if (sum < minSum) {
      minSum = sum;
      tlIndex = i;
    }
  }

  const tl = corners[tlIndex];
  const others = corners
    .filter((_, idx) => idx !== tlIndex)
    .map((p) => ({ point: p, angle: Math.atan2(p.y - tl.y, p.x - tl.x) }))
    .sort((a, b) => a.angle - b.angle);

  return [tl, others[0].point, others[1].point, others[2].point];
}

/**
 * Get bounding rectangle of points.
 */
function getBoundingRect(points: Point[]): { width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

/**
 * Find all quadrilateral contours from intersections.
 */
function findQuadrilateralsFromIntersections(
  intersections: IntersectionPoint[],
  numLines: number,
  imageWidth: number,
  imageHeight: number,
): { quadrilaterals: QuadContour[]; bestQuadrilateral: QuadContour | null } {
  if (intersections.length < 4) {
    return { quadrilaterals: [], bestQuadrilateral: null };
  }

  const graph = buildIntersectionGraph(intersections);
  const cycles = findCycles4(graph);

  const imageArea = imageWidth * imageHeight;
  const minArea = imageArea * CANNY_EDGE_DETECTION.MIN_CONTOUR_AREA_RATIO;

  const quadrilaterals: QuadContour[] = [];

  for (const cycle of cycles) {
    const rawCorners = cycle.map((idx) => ({
      x: intersections[idx].x,
      y: intersections[idx].y,
    }));
    const corners = orderQuadCorners(rawCorners);
    const area = computePolygonArea(corners);

    if (area < minArea) continue;

    const boundingRect = getBoundingRect(corners);
    const aspectRatio = boundingRect.width / boundingRect.height;

    // Check if aspect ratio matches card dimensions
    const isValid =
      aspectRatio >= CARD_DIMENSIONS.MIN_ASPECT_RATIO &&
      aspectRatio <= CARD_DIMENSIONS.MAX_ASPECT_RATIO;

    // Compute score based on area and aspect ratio match
    const idealRatio = CARD_DIMENSIONS.ASPECT_RATIO;
    const ratioDeviation = Math.abs(aspectRatio - idealRatio);
    const ratioScore = Math.max(0, 100 - ratioDeviation * 40);
    const score = area * (ratioScore / 100);

    quadrilaterals.push({
      corners,
      area,
      aspectRatio,
      score,
      isValid,
    });
  }

  // Sort by score descending
  quadrilaterals.sort((a, b) => b.score - a.score);

  // Best quadrilateral is the highest-scoring valid one
  const bestQuadrilateral = quadrilaterals.find((q) => q.isValid) || null;

  return { quadrilaterals, bestQuadrilateral };
}

// ============================================================================
// Main Debug Extraction Function
// ============================================================================

/**
 * Extract Hough lines and intersections from an image for debug visualization.
 * This runs the same pipeline as the main detector but returns intermediate results.
 * @param imageDataUrl - Base64 data URL of the image
 * @param threshold - Optional custom threshold (uses default cascade if not provided)
 */
export async function extractHoughDebugData(
  imageDataUrl: string,
  threshold?: number,
): Promise<HoughDebugResult | null> {
  if (!isOpenCVReady()) {
    console.error("OpenCV not ready for debug extraction");
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      const result = runHoughExtraction(
        imageData,
        img.width,
        img.height,
        threshold,
      );
      resolve(result);
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

function runHoughExtraction(
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number,
  customThreshold?: number,
): HoughDebugResult | null {
  const targetHeight = CANNY_EDGE_DETECTION.RESCALED_HEIGHT;
  const scale = targetHeight / originalHeight;
  const targetWidth = Math.round(originalWidth * scale);

  let src: CVMat | null = null;
  let scaled: CVMat | null = null;
  let gray: CVMat | null = null;
  // Horizontal path (heavy blur)
  let blurredH: CVMat | null = null;
  let morphedH: CVMat | null = null;
  let edgesHorizontal: CVMat | null = null;
  let kernelH: CVMat | null = null;
  // Vertical path (light blur)
  let blurredV: CVMat | null = null;
  let edgesVertical: CVMat | null = null;

  try {
    src = cv!.matFromImageData(imageData);

    // Rescale
    scaled = new cv!.Mat();
    cv!.resize(
      src,
      scaled,
      new cv!.Size(targetWidth, targetHeight),
      0,
      0,
      cv!.INTER_AREA,
    );

    // Grayscale
    gray = new cv!.Mat();
    cv!.cvtColor(scaled, gray, cv!.COLOR_RGBA2GRAY);

    // === HORIZONTAL PATH (heavy blur - good for text/stripes) ===
    blurredH = new cv!.Mat();
    const blurSizeH = CANNY_EDGE_DETECTION.BLUR_KERNEL_SIZE;
    cv!.GaussianBlur(gray, blurredH, new cv!.Size(blurSizeH, blurSizeH), 0);

    morphedH = new cv!.Mat();
    const morphSizeH = CANNY_EDGE_DETECTION.MORPH_KERNEL_SIZE;
    kernelH = cv!.getStructuringElement(
      cv!.MORPH_RECT,
      new cv!.Size(morphSizeH, morphSizeH),
    );
    cv!.morphologyEx(blurredH, morphedH, cv!.MORPH_CLOSE, kernelH);

    edgesHorizontal = new cv!.Mat();
    cv!.Canny(
      morphedH,
      edgesHorizontal,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_LOW,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_HIGH,
    );

    // === VERTICAL PATH (light blur - preserves sharp card edges) ===
    blurredV = new cv!.Mat();
    const blurSizeV = CANNY_EDGE_DETECTION.BLUR_KERNEL_SIZE_VERTICAL;
    cv!.GaussianBlur(gray, blurredV, new cv!.Size(blurSizeV, blurSizeV), 0);
    // Skip morphology for vertical - we want sharp edges

    edgesVertical = new cv!.Mat();
    cv!.Canny(
      blurredV,
      edgesVertical,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_LOW,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_HIGH,
    );

    // === COMPUTE ACCUMULATOR FROM COMBINED EDGES ===
    const accumulator = computeAccumulator(
      edgesHorizontal,
      edgesVertical,
      targetWidth,
      targetHeight,
    );

    // === HOUGH LINE DETECTION ===
    const maxLines = CANNY_EDGE_DETECTION.HOUGH_MAX_LINES;
    const rawLines: HoughLine[] = [];

    // Determine thresholds to use
    const horizontalThresholds = customThreshold
      ? [customThreshold]
      : CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS;
    const verticalThresholds = customThreshold
      ? [Math.max(25, Math.floor(customThreshold * 0.4))] // Scale down for vertical
      : CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS_VERTICAL;

    // Track actual threshold used
    let usedThreshold =
      customThreshold || CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS[0];

    // Helper function to run a single Hough pass
    const runHoughPass = (
      edges: CVMat,
      thresholds: readonly number[] | number[],
    ): HoughLine[] => {
      const passLines: HoughLine[] = [];
      for (const threshold of thresholds) {
        const localLinesMat = new cv!.Mat();
        cv!.HoughLines(
          edges,
          localLinesMat,
          CANNY_EDGE_DETECTION.HOUGH_RHO,
          CANNY_EDGE_DETECTION.HOUGH_THETA,
          threshold,
        );

        if (localLinesMat.rows > 0 && localLinesMat.rows <= maxLines) {
          usedThreshold = threshold;
          for (let i = 0; i < localLinesMat.rows; i++) {
            passLines.push({
              rho: localLinesMat.data32F[i * 2],
              theta: localLinesMat.data32F[i * 2 + 1],
            });
          }
          localLinesMat.delete();
          break;
        }

        localLinesMat.delete();
      }
      return passLines;
    };

    // Pass 1: High threshold on horizontal edges (captures text/stripes)
    const pass1Lines = runHoughPass(edgesHorizontal, horizontalThresholds);
    rawLines.push(...pass1Lines);

    // Pass 2: Lower threshold on vertical edges (captures sharp card boundaries)
    const pass2Lines = runHoughPass(edgesVertical, verticalThresholds);

    // Filter pass 2 to only keep vertical lines
    const verticalPass2 = pass2Lines.filter(
      (line) => classifyLine(line.theta) === "vertical",
    );
    rawLines.push(...verticalPass2);

    const rawLineCount = rawLines.length;

    console.log(
      `🔍 Debug: Pass1(H)=${pass1Lines.length}, Pass2(V)=${verticalPass2.length}, Raw=${rawLineCount}, Threshold=${usedThreshold}`,
    );

    // Merge nearby parallel lines
    const merged = mergeLines(rawLines);

    // Filter to keep only horizontal and vertical (card edges)
    const cardEdgeLines = filterCardEdgeLines(merged);

    console.log(
      `🔍 Debug: Merged=${merged.length}, CardEdges=${cardEdgeLines.length}`,
    );

    // Convert lines to endpoints
    const lineEndpoints = cardEdgeLines.map((line) =>
      houghLineToEndpoints(line, targetWidth, targetHeight),
    );

    // Find intersections
    const intersections: IntersectionPoint[] = [];
    for (let i = 0; i < cardEdgeLines.length; i++) {
      for (let j = i + 1; j < cardEdgeLines.length; j++) {
        const intersection = findIntersection(
          cardEdgeLines[i],
          cardEdgeLines[j],
          targetWidth,
          targetHeight,
          i,
          j,
        );
        if (intersection) {
          intersections.push(intersection);
        }
      }
    }

    // Count raw lines by category
    const rawVerticalCount = rawLines.filter(
      (l) => classifyLine(l.theta) === "vertical",
    ).length;
    const rawHorizontalCount = rawLines.filter(
      (l) => classifyLine(l.theta) === "horizontal",
    ).length;

    // Count merged lines by category
    const mergedVerticalCount = cardEdgeLines.filter(
      (l) => l.category === "vertical",
    ).length;
    const mergedHorizontalCount = cardEdgeLines.filter(
      (l) => l.category === "horizontal",
    ).length;

    console.log(
      `🔍 Debug: Raw V=${rawVerticalCount} H=${rawHorizontalCount}, Merged V=${mergedVerticalCount} H=${mergedHorizontalCount}`,
    );

    // === QUADRILATERAL DETECTION ===
    const { quadrilaterals, bestQuadrilateral } =
      findQuadrilateralsFromIntersections(
        intersections,
        cardEdgeLines.length,
        targetWidth,
        targetHeight,
      );

    console.log(
      `🔍 Debug: Found ${quadrilaterals.length} quadrilaterals, best: ${
        bestQuadrilateral ? "yes" : "none"
      }`,
    );

    return {
      lines: cardEdgeLines,
      lineEndpoints,
      intersections,
      imageWidth: targetWidth,
      imageHeight: targetHeight,
      scale,
      rawLineCount,
      mergedLineCount: cardEdgeLines.length,
      rawVerticalCount,
      rawHorizontalCount,
      mergedVerticalCount,
      mergedHorizontalCount,
      accumulator,
      threshold: usedThreshold,
      quadrilaterals,
      bestQuadrilateral,
    };
  } catch (error) {
    console.error("Hough extraction error:", error);
    return null;
  } finally {
    if (src) src.delete();
    if (scaled) scaled.delete();
    if (gray) gray.delete();
    if (blurredH) blurredH.delete();
    if (morphedH) morphedH.delete();
    if (edgesHorizontal) edgesHorizontal.delete();
    if (kernelH) kernelH.delete();
    if (blurredV) blurredV.delete();
    if (edgesVertical) edgesVertical.delete();
  }
}

// ============================================================================
// Accumulator Computation
// ============================================================================

/**
 * Compute Hough accumulator from edge images for visualization.
 * This creates a 2D vote array representing the ρ-θ parameter space.
 */
function computeAccumulator(
  edgesHorizontal: CVMat,
  edgesVertical: CVMat,
  width: number,
  height: number,
): AccumulatorData {
  // Parameters for accumulator
  const thetaSteps = 180; // 1 degree resolution
  const diagonal = Math.sqrt(width * width + height * height);
  const rhoMax = Math.ceil(diagonal);
  const rhoSteps = rhoMax * 2; // -rhoMax to +rhoMax

  // Initialize accumulator
  const votes: number[][] = [];
  for (let t = 0; t < thetaSteps; t++) {
    votes.push(new Array(rhoSteps).fill(0));
  }

  // Compute theta and rho values for axis labels
  const thetaValues: number[] = [];
  for (let t = 0; t < thetaSteps; t++) {
    thetaValues.push((t * Math.PI) / thetaSteps);
  }

  const rhoValues: number[] = [];
  for (let r = 0; r < rhoSteps; r++) {
    rhoValues.push(r - rhoMax);
  }

  // Helper to accumulate votes from an edge image
  const accumulateFromEdges = (edges: CVMat) => {
    const data = edges.data;
    const cols = edges.cols;
    const rows = edges.rows;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (data[y * cols + x] > 0) {
          // Edge pixel found - vote for all possible lines through it
          for (let t = 0; t < thetaSteps; t++) {
            const theta = thetaValues[t];
            const rho = x * Math.cos(theta) + y * Math.sin(theta);
            const rhoIndex = Math.round(rho + rhoMax);
            if (rhoIndex >= 0 && rhoIndex < rhoSteps) {
              votes[t][rhoIndex]++;
            }
          }
        }
      }
    }
  };

  // Accumulate from both edge images
  accumulateFromEdges(edgesHorizontal);
  accumulateFromEdges(edgesVertical);

  // Find maximum votes for normalization
  let maxVotes = 0;
  for (let t = 0; t < thetaSteps; t++) {
    for (let r = 0; r < rhoSteps; r++) {
      if (votes[t][r] > maxVotes) {
        maxVotes = votes[t][r];
      }
    }
  }

  return {
    votes,
    maxVotes,
    rhoValues,
    thetaValues,
    rhoSteps,
    thetaSteps,
  };
}

// ============================================================================
// Canvas Drawing Functions
// ============================================================================

/**
 * Draw Hough lines on a canvas context with color-coding by category.
 * Horizontal lines are red, vertical lines are blue.
 */
export function drawHoughLines(
  ctx: CanvasRenderingContext2D,
  lineEndpoints: LineEndpoints[],
  defaultColor: string = "#FF0000",
  lineWidth: number = 2,
): void {
  ctx.lineWidth = lineWidth;

  for (const line of lineEndpoints) {
    // Color-code by category: red for horizontal, blue for vertical
    if (line.category === "horizontal") {
      ctx.strokeStyle = "#FF4444"; // Red for horizontal
    } else if (line.category === "vertical") {
      ctx.strokeStyle = "#4444FF"; // Blue for vertical
    } else {
      ctx.strokeStyle = defaultColor;
    }

    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
  }
}

/**
 * Draw intersection points on a canvas context.
 */
export function drawIntersections(
  ctx: CanvasRenderingContext2D,
  intersections: IntersectionPoint[],
  color: string = "#00FFFF",
  radius: number = 5,
): void {
  ctx.fillStyle = color;

  for (const point of intersections) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Draw a complete debug overlay with lines and intersections.
 */
export function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  debugData: HoughDebugResult,
): void {
  // Draw lines first (so intersections appear on top)
  drawHoughLines(ctx, debugData.lineEndpoints, "#FF0000", 2);

  // Draw intersections
  drawIntersections(ctx, debugData.intersections, "#00FFFF", 5);
}
