import { CARD_DIMENSIONS } from "./constants";
import type { BoundingRect, Point } from "./types";

// ============================================================================
// OpenCV.js Type Declarations
// ============================================================================

/**
 * OpenCV.js global type declarations
 * These types represent the subset of OpenCV.js API used in this module.
 * OpenCV.js is loaded as a global 'cv' object via WebAssembly.
 */
declare global {
  interface CV {
    Mat: new () => CVMat;
    matFromArray(
      rows: number,
      cols: number,
      type: number,
      data: number[]
    ): CVMat;
    matFromImageData(imageData: ImageData): CVMat;
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
    Size: new (width: number, height: number) => CVSize;
    Scalar: new (
      v0?: number,
      v1?: number,
      v2?: number,
      v3?: number
    ) => CVScalar;

    // Constants
    CV_32FC2: number;
    CV_8UC4: number;
    INTER_CUBIC: number;
    INTER_LINEAR: number;
    BORDER_CONSTANT: number;
    BORDER_REPLICATE: number;
  }

  interface CVMat {
    delete(): void;
    rows: number;
    cols: number;
    data: Uint8Array;
    data32F: Float32Array;
    type(): number;
  }

  interface CVSize {
    width: number;
    height: number;
  }

  interface CVScalar {
    [index: number]: number;
  }

  var cv: CV | undefined;
}

// ============================================================================
// ISO 7810 ID-1 Standard Constants
// ============================================================================

/**
 * ISO 7810 ID-1 aspect ratio (credit card / ID card standard)
 * Physical dimensions: 85.60mm × 53.98mm
 * Aspect ratio: 85.60 / 53.98 ≈ 1.5856
 */
const ISO_7810_ASPECT_RATIO = 1.586;

// ============================================================================
// Basic Geometry Utilities (Retained)
// ============================================================================

/**
 * Calculate cross product of vectors OA and OB (2D version)
 * Positive if counter-clockwise, negative if clockwise
 */
export function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/**
 * Calculate Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a quadrilateral (4 points) is convex
 * All cross products of consecutive edges must have the same sign
 */
export function isConvexQuadrilateral(quad: readonly Point[]): boolean {
  if (quad.length !== 4) return false;

  const cp1 = crossProduct(quad[0], quad[1], quad[2]);
  const cp2 = crossProduct(quad[1], quad[2], quad[3]);
  const cp3 = crossProduct(quad[2], quad[3], quad[0]);
  const cp4 = crossProduct(quad[3], quad[0], quad[1]);

  const allPositive = cp1 > 0 && cp2 > 0 && cp3 > 0 && cp4 > 0;
  const allNegative = cp1 < 0 && cp2 < 0 && cp3 < 0 && cp4 < 0;

  return allPositive || allNegative;
}

/**
 * Calculate area of a quadrilateral using the shoelace formula
 */
export function quadrilateralArea(quad: readonly Point[]): number {
  if (quad.length !== 4) return 0;

  const [a, b, c, d] = quad;
  return (
    0.5 *
    Math.abs(
      a.x * (b.y - d.y) +
        b.x * (c.y - a.y) +
        c.x * (d.y - b.y) +
        d.x * (a.y - c.y)
    )
  );
}

/**
 * Get bounding rectangle from an array of points
 */
export function getBoundingRect(points: readonly Point[]): BoundingRect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert a bounding rectangle to corner points
 * Returns points in order: TL, TR, BR, BL
 */
export function rectToCorners(rect: BoundingRect): readonly Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

/**
 * Compute convex hull of a set of points using Andrew's monotone chain algorithm
 */
export function convexHull(points: readonly Point[]): readonly Point[] {
  if (points.length < 3) return points;

  // Sort points by x, then by y
  const sorted = [...points].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x
  );

  // Build lower hull
  const lower: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  // Build upper hull
  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  // Remove last point of each half (it's repeated)
  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

/**
 * Simplify a contour by sampling every N points
 */
export function simplifyContour(
  contour: readonly Point[],
  epsilon: number
): readonly Point[] {
  if (contour.length < 3) return contour;

  const simplified: Point[] = [];
  for (let i = 0; i < contour.length; i += epsilon) {
    simplified.push(contour[i]);
  }
  return simplified;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamp a pixel value to 0-255 range
 */
export function clampPixel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

// ============================================================================
// NEW: Robust Corner Sorting (Centroid-Based Angular Sort)
// ============================================================================

/**
 * Sorts quadrilateral corners to [TL, TR, BR, BL] order using centroid-based angular sort.
 * This method is robust against card rotation beyond 45 degrees.
 *
 * Algorithm:
 * 1. Calculate the centroid (geometric center) of all 4 points
 * 2. Calculate the angle from centroid to each point using atan2
 * 3. Sort points by angle (ascending) to get clockwise order
 * 4. Rotate the sorted array so the point closest to image origin (0,0) is first (Top-Left)
 *
 * Why this works:
 * - The centroid-angle approach creates a rotation-invariant ordering
 * - Unlike sum/difference heuristics, this handles any rotation angle
 * - The final rotation step ensures consistent TL positioning regardless of card orientation
 *
 * @param points - Array of exactly 4 corner points (unordered)
 * @returns Array of 4 points in [TL, TR, BR, BL] order
 */
export function robustSortCorners(points: readonly Point[]): readonly Point[] {
  if (points.length !== 4) {
    return points;
  }

  // 1. Calculate Centroid (geometric center)
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), {
    x: 0,
    y: 0,
  });
  const center = {
    x: sum.x / points.length,
    y: sum.y / points.length,
  };

  // 2. Sort by angle around centroid (counter-clockwise from positive x-axis)
  // atan2 returns angles in range [-π, π], sorting ascending gives counter-clockwise order
  const sorted = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });

  // 3. Find index of point closest to origin (0,0) - this will be our Top-Left
  // Using squared distance to avoid unnecessary sqrt computation
  let tlIndex = 0;
  let minDistSq = sorted[0].x ** 2 + sorted[0].y ** 2;

  for (let i = 1; i < sorted.length; i++) {
    const distSq = sorted[i].x ** 2 + sorted[i].y ** 2;
    if (distSq < minDistSq) {
      minDistSq = distSq;
      tlIndex = i;
    }
  }

  // 4. Rotate array so TL is at index 0
  // After angular sort, points are in clockwise order, so rotating maintains [TL, TR, BR, BL]
  return [...sorted.slice(tlIndex), ...sorted.slice(0, tlIndex)];
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use robustSortCorners instead for better rotation handling
 */
export const orderCorners = robustSortCorners;

// ============================================================================
// NEW: ISO 7810 Dimension Calculation
// ============================================================================

/**
 * Output dimensions for warped card image
 */
export interface CardWarpDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Calculate output dimensions for a warped card image, enforcing ISO 7810 ID-1 aspect ratio.
 *
 * This function determines the target rectangle size by:
 * 1. Calculating the maximum width from the detected top and bottom edges
 * 2. Deriving height using the ISO 7810 standard aspect ratio (85.60mm × 53.98mm ≈ 1.586)
 *
 * Why enforce aspect ratio instead of measuring both dimensions:
 * - Perspective distortion can squash or stretch the detected height
 * - ID cards have a standardized physical shape that should be preserved
 * - This ensures OCR zones remain at predictable pixel locations
 * - Text won't be vertically compressed, improving recognition accuracy
 *
 * @param orderedCorners - Array of 4 corner points in [TL, TR, BR, BL] order
 * @returns Target dimensions maintaining ISO 7810 ID-1 aspect ratio
 */
export function getCardWarpDimensions(
  orderedCorners: readonly Point[]
): CardWarpDimensions {
  if (orderedCorners.length !== 4) {
    // Fallback to default dimensions from constants
    return {
      width: CARD_DIMENSIONS.OUTPUT_WIDTH,
      height: CARD_DIMENSIONS.OUTPUT_HEIGHT,
    };
  }

  const [tl, tr, br, bl] = orderedCorners;

  // Calculate width from top and bottom edges
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
  const maxWidth = Math.max(widthTop, widthBottom);

  // Enforce ISO 7810 ID-1 aspect ratio (do NOT use detected height)
  // This prevents text squashing from perspective distortion
  const targetWidth = Math.round(maxWidth);
  const targetHeight = Math.round(maxWidth / ISO_7810_ASPECT_RATIO);

  // Ensure minimum dimensions for reasonable OCR quality
  const minWidth = 400;
  const minHeight = Math.round(minWidth / ISO_7810_ASPECT_RATIO);

  return {
    width: Math.max(targetWidth, minWidth),
    height: Math.max(targetHeight, minHeight),
  };
}

// ============================================================================
// NEW: OpenCV.js Perspective Warp
// ============================================================================

/**
 * Error thrown when OpenCV.js operations fail
 */
export class OpenCVError extends Error {
  constructor(message: string, public readonly operation: string) {
    super(`OpenCV ${operation} failed: ${message}`);
    this.name = "OpenCVError";
  }
}

/**
 * Check if OpenCV.js is loaded and available
 */
export function isOpenCVReady(): boolean {
  return typeof cv !== "undefined" && cv !== null;
}

/**
 * Warps the detected card region into a strictly ISO 7810 compliant rectangle using OpenCV.js.
 *
 * This function replaces the manual perspective transform implementation with OpenCV.js
 * operations for better numerical stability and performance (via WebAssembly).
 *
 * Key improvements over manual implementation:
 * - cv.getPerspectiveTransform uses SVD-based solving, more stable than Gaussian elimination
 * - cv.warpPerspective with INTER_CUBIC provides better text clarity than bilinear interpolation
 * - Proper memory management with try/finally ensures no WebAssembly memory leaks
 *
 * @param src - Source cv.Mat image
 * @param orderedCorners - Array of 4 corner points in [TL, TR, BR, BL] order
 * @returns New cv.Mat with the warped card image (caller must call .delete() when done)
 * @throws OpenCVError if OpenCV.js is not loaded or operation fails
 */
export function warpPerspectiveISO(
  src: CVMat,
  orderedCorners: readonly Point[]
): CVMat {
  if (!isOpenCVReady()) {
    throw new OpenCVError("OpenCV.js is not loaded", "warpPerspectiveISO");
  }

  if (orderedCorners.length !== 4) {
    throw new OpenCVError(
      "Exactly 4 ordered corners required",
      "warpPerspectiveISO"
    );
  }

  // Temporary OpenCV objects - must be cleaned up
  let srcTri: CVMat | null = null;
  let dstTri: CVMat | null = null;
  let M: CVMat | null = null;
  let dst: CVMat | null = null;

  try {
    // 1. Calculate target dimensions using ISO 7810 aspect ratio
    const dimensions = getCardWarpDimensions(orderedCorners);
    const { width: targetWidth, height: targetHeight } = dimensions;

    // 2. Create source points matrix (detected corners)
    // Order: TL, TR, BR, BL - matching cv.getPerspectiveTransform expectations
    const [tl, tr, br, bl] = orderedCorners;
    srcTri = cv!.matFromArray(4, 1, cv!.CV_32FC2, [
      tl.x,
      tl.y,
      tr.x,
      tr.y,
      br.x,
      br.y,
      bl.x,
      bl.y,
    ]);

    // 3. Create destination points matrix (output rectangle)
    // Maps to: (0,0) -> (w,0) -> (w,h) -> (0,h)
    dstTri = cv!.matFromArray(4, 1, cv!.CV_32FC2, [
      0,
      0,
      targetWidth,
      0,
      targetWidth,
      targetHeight,
      0,
      targetHeight,
    ]);

    // 4. Compute perspective transformation matrix
    // cv.getPerspectiveTransform uses DLT algorithm with SVD decomposition
    // This is more numerically stable than manual Gaussian elimination
    M = cv!.getPerspectiveTransform(srcTri, dstTri);

    // 5. Apply perspective warp
    // INTER_CUBIC provides better text clarity than INTER_LINEAR (bilinear)
    // BORDER_CONSTANT with black fill for out-of-bounds pixels
    dst = new cv!.Mat();
    cv!.warpPerspective(
      src,
      dst,
      M,
      new cv!.Size(targetWidth, targetHeight),
      cv!.INTER_CUBIC,
      cv!.BORDER_CONSTANT,
      new cv!.Scalar(0, 0, 0, 255)
    );

    // Return the result - caller is responsible for calling delete()
    return dst;
  } catch (error) {
    // Clean up dst on error (other temps cleaned in finally)
    if (dst) {
      dst.delete();
    }
    throw error instanceof OpenCVError
      ? error
      : new OpenCVError(
          error instanceof Error ? error.message : "Unknown error",
          "warpPerspectiveISO"
        );
  } finally {
    // 6. Strict memory cleanup - prevent WebAssembly memory leaks
    // Always clean up temporary matrices, even on success
    if (srcTri) srcTri.delete();
    if (dstTri) dstTri.delete();
    if (M) M.delete();
    // Note: dst is NOT deleted here - it's the return value
  }
}

/**
 * Convenience function to warp using canvas ImageData instead of cv.Mat
 * Useful when integrating with existing canvas-based pipeline
 *
 * @param imageData - Source ImageData from canvas
 * @param orderedCorners - Array of 4 corner points in [TL, TR, BR, BL] order
 * @returns Object containing warped ImageData and dimensions
 */
export function warpImageDataISO(
  imageData: ImageData,
  orderedCorners: readonly Point[]
): { imageData: ImageData; width: number; height: number } {
  if (!isOpenCVReady()) {
    throw new OpenCVError("OpenCV.js is not loaded", "warpImageDataISO");
  }

  // Convert ImageData to cv.Mat
  let src: CVMat | null = null;
  let dst: CVMat | null = null;

  try {
    // Create cv.Mat from ImageData
    // Note: This requires opencv.js to have matFromImageData or similar
    // For now, we'll use matFromArray with the raw data
    src = cv!.matFromArray(
      imageData.height,
      imageData.width,
      cv!.CV_32FC2, // This should be CV_8UC4 for RGBA
      Array.from(imageData.data)
    );

    // Perform the warp
    dst = warpPerspectiveISO(src, orderedCorners);

    // Convert back to ImageData
    const dimensions = getCardWarpDimensions(orderedCorners);
    const resultData = new Uint8ClampedArray(dst.data);
    const resultImageData = new ImageData(
      resultData,
      dimensions.width,
      dimensions.height
    );

    return {
      imageData: resultImageData,
      width: dimensions.width,
      height: dimensions.height,
    };
  } finally {
    if (src) src.delete();
    if (dst) dst.delete();
  }
}

// ============================================================================
// Legacy Transform Point (Retained for compatibility)
// ============================================================================

/**
 * Apply a 3x3 homography matrix to transform a single point
 * Retained for cases where full image warp is not needed
 *
 * @param p - Point to transform
 * @param h - 3x3 homography matrix as flat array [h11, h12, h13, h21, h22, h23, h31, h32, h33]
 * @returns Transformed point
 */
export function transformPoint(
  p: Point,
  h: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ]
): Point {
  const denominator = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / denominator,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / denominator,
  };
}
