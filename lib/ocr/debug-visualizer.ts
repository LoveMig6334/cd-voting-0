/**
 * Debug Visualizer Module - Hough Transform Debug Utilities
 *
 * This module provides functions to extract and visualize the intermediate
 * results of the Canny/Hough detection pipeline for debugging purposes.
 */

import { CANNY_EDGE_DETECTION } from "./constants";

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

export interface HoughDebugResult {
  readonly lines: MergedLine[];
  readonly lineEndpoints: LineEndpoints[];
  readonly intersections: IntersectionPoint[];
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly scale: number;
  readonly rawLineCount: number;
  readonly mergedLineCount: number;
}

// ============================================================================
// OpenCV Type Check
// ============================================================================

declare global {
  var cv:
    | {
        Mat: new () => CVMat;
        matFromImageData(imageData: ImageData): CVMat;
        Size: new (width: number, height: number) => CVSize;
        cvtColor(src: CVMat, dst: CVMat, code: number): void;
        GaussianBlur(
          src: CVMat,
          dst: CVMat,
          ksize: CVSize,
          sigmaX: number
        ): void;
        morphologyEx(src: CVMat, dst: CVMat, op: number, kernel: CVMat): void;
        getStructuringElement(shape: number, ksize: CVSize): CVMat;
        Canny(
          src: CVMat,
          dst: CVMat,
          threshold1: number,
          threshold2: number
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
        COLOR_RGBA2GRAY: number;
        MORPH_RECT: number;
        MORPH_CLOSE: number;
        INTER_AREA: number;
      }
    | undefined;

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
}

function isOpenCVReady(): boolean {
  return typeof cv !== "undefined" && cv !== null;
}

// ============================================================================
// Line Classification & Merging
// ============================================================================

/**
 * Classify a line as horizontal, vertical, or diagonal based on its theta angle.
 */
function classifyLine(theta: number): LineCategory {
  const tolerance = CANNY_EDGE_DETECTION.LINE_CLASSIFICATION_TOLERANCE;
  const normalizedTheta = ((theta % Math.PI) + Math.PI) % Math.PI;

  if (normalizedTheta < tolerance || normalizedTheta > Math.PI - tolerance) {
    return "horizontal";
  }
  if (Math.abs(normalizedTheta - Math.PI / 2) < tolerance) {
    return "vertical";
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
 */
function mergeLines(lines: HoughLine[]): MergedLine[] {
  if (lines.length === 0) return [];

  const angleThreshold = CANNY_EDGE_DETECTION.LINE_MERGE_ANGLE_THRESHOLD;
  const distanceThreshold = CANNY_EDGE_DETECTION.LINE_MERGE_DISTANCE_THRESHOLD;

  const assigned = new Array(lines.length).fill(false);
  const merged: MergedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (assigned[i]) continue;

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
  imageHeight: number
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
  lineIdx2: number
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
// Main Debug Extraction Function
// ============================================================================

/**
 * Extract Hough lines and intersections from an image for debug visualization.
 * This runs the same pipeline as the main detector but returns intermediate results.
 */
export async function extractHoughDebugData(
  imageDataUrl: string
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

      const result = runHoughExtraction(imageData, img.width, img.height);
      resolve(result);
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

function runHoughExtraction(
  imageData: ImageData,
  originalWidth: number,
  originalHeight: number
): HoughDebugResult | null {
  const targetHeight = CANNY_EDGE_DETECTION.RESCALED_HEIGHT;
  const scale = targetHeight / originalHeight;
  const targetWidth = Math.round(originalWidth * scale);

  let src: CVMat | null = null;
  let scaled: CVMat | null = null;
  let gray: CVMat | null = null;
  let blurred: CVMat | null = null;
  let morphed: CVMat | null = null;
  let edges: CVMat | null = null;
  let kernel: CVMat | null = null;
  let linesMat: CVMat | null = null;

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
      cv!.INTER_AREA
    );

    // Grayscale
    gray = new cv!.Mat();
    cv!.cvtColor(scaled, gray, cv!.COLOR_RGBA2GRAY);

    // Gaussian blur
    blurred = new cv!.Mat();
    const blurSize = CANNY_EDGE_DETECTION.BLUR_KERNEL_SIZE;
    cv!.GaussianBlur(gray, blurred, new cv!.Size(blurSize, blurSize), 0);

    // Morphological close
    morphed = new cv!.Mat();
    const morphSize = CANNY_EDGE_DETECTION.MORPH_KERNEL_SIZE;
    kernel = cv!.getStructuringElement(
      cv!.MORPH_RECT,
      new cv!.Size(morphSize, morphSize)
    );
    cv!.morphologyEx(blurred, morphed, cv!.MORPH_CLOSE, kernel);

    // Canny edge detection
    edges = new cv!.Mat();
    cv!.Canny(
      morphed,
      edges,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_LOW,
      CANNY_EDGE_DETECTION.CANNY_THRESHOLD_HIGH
    );

    // Hough line detection - Two-pass approach
    const maxLines = CANNY_EDGE_DETECTION.HOUGH_MAX_LINES;
    const rawLines: HoughLine[] = [];

    // Helper function to run a single Hough pass
    const runHoughPass = (thresholds: readonly number[]): HoughLine[] => {
      const passLines: HoughLine[] = [];
      for (const threshold of thresholds) {
        linesMat = new cv!.Mat();
        cv!.HoughLines(
          edges,
          linesMat,
          CANNY_EDGE_DETECTION.HOUGH_RHO,
          CANNY_EDGE_DETECTION.HOUGH_THETA,
          threshold
        );

        if (linesMat.rows > 0 && linesMat.rows <= maxLines) {
          for (let i = 0; i < linesMat.rows; i++) {
            passLines.push({
              rho: linesMat.data32F[i * 2],
              theta: linesMat.data32F[i * 2 + 1],
            });
          }
          linesMat.delete();
          linesMat = null;
          break;
        }

        linesMat.delete();
        linesMat = null;
      }
      return passLines;
    };

    // Pass 1: High threshold for strong edges
    const pass1Lines = runHoughPass(CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS);
    rawLines.push(...pass1Lines);

    // Pass 2: Lower threshold for vertical edges
    const pass2Lines = runHoughPass(
      CANNY_EDGE_DETECTION.HOUGH_THRESHOLDS_VERTICAL
    );
    const verticalPass2 = pass2Lines.filter(
      (line) => classifyLine(line.theta) === "vertical"
    );
    rawLines.push(...verticalPass2);

    const rawLineCount = rawLines.length;

    // Merge nearby parallel lines
    const merged = mergeLines(rawLines);

    // Filter to keep only horizontal and vertical (card edges)
    const cardEdgeLines = filterCardEdgeLines(merged);

    console.log(
      `🔍 Debug: Raw=${rawLineCount}, Merged=${merged.length}, CardEdges=${cardEdgeLines.length}`
    );

    // Convert lines to endpoints
    const lineEndpoints = cardEdgeLines.map((line) =>
      houghLineToEndpoints(line, targetWidth, targetHeight)
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
          j
        );
        if (intersection) {
          intersections.push(intersection);
        }
      }
    }

    return {
      lines: cardEdgeLines,
      lineEndpoints,
      intersections,
      imageWidth: targetWidth,
      imageHeight: targetHeight,
      scale,
      rawLineCount,
      mergedLineCount: cardEdgeLines.length,
    };
  } catch (error) {
    console.error("Hough extraction error:", error);
    return null;
  } finally {
    if (src) src.delete();
    if (scaled) scaled.delete();
    if (gray) gray.delete();
    if (blurred) blurred.delete();
    if (morphed) morphed.delete();
    if (edges) edges.delete();
    if (kernel) kernel.delete();
    if (linesMat) linesMat.delete();
  }
}

// ============================================================================
// Canvas Drawing Functions
// ============================================================================

/**
 * Draw Hough lines on a canvas context.
 */
export function drawHoughLines(
  ctx: CanvasRenderingContext2D,
  lineEndpoints: LineEndpoints[],
  color: string = "#FF0000",
  lineWidth: number = 2
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (const line of lineEndpoints) {
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
  radius: number = 5
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
  debugData: HoughDebugResult
): void {
  // Draw lines first (so intersections appear on top)
  drawHoughLines(ctx, debugData.lineEndpoints, "#FF0000", 2);

  // Draw intersections
  drawIntersections(ctx, debugData.intersections, "#00FFFF", 5);
}
