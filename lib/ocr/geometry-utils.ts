/**
 * Geometry Utilities for the Image Processing Pipeline
 * Contains math operations, matrix calculations, and corner ordering logic
 */

import { MATRIX } from "./constants";
import { SingularMatrixError, err, ok, type Result } from "./errors";
import type {
  BoundingRect,
  HomographyResult,
  Matrix3x3,
  MutableMatrix3x3,
  Point,
} from "./types";

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
 * Order corners geometrically into TL, TR, BR, BL order
 * Uses sum (x+y) and difference (y-x) to identify corners:
 * - Top-left: minimum sum
 * - Bottom-right: maximum sum
 * - Top-right: minimum difference
 * - Bottom-left: maximum difference
 */
export function orderCorners(points: readonly Point[]): readonly Point[] {
  if (points.length < 4) return [];

  let topLeft = points[0];
  let bottomRight = points[0];
  let topRight = points[0];
  let bottomLeft = points[0];

  let minSum = Infinity;
  let maxSum = -Infinity;
  let minDiff = Infinity;
  let maxDiff = -Infinity;

  for (const p of points) {
    const sum = p.x + p.y;
    const diff = p.y - p.x;

    if (sum < minSum) {
      minSum = sum;
      topLeft = p;
    }
    if (sum > maxSum) {
      maxSum = sum;
      bottomRight = p;
    }
    if (diff < minDiff) {
      minDiff = diff;
      topRight = p;
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      bottomLeft = p;
    }
  }

  return [topLeft, topRight, bottomRight, bottomLeft];
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
 * Solve a linear system Ax = B using Gaussian elimination with partial pivoting
 * Returns the solution vector x
 */
export function solveLinearSystem(
  A: readonly (readonly number[])[],
  B: readonly number[]
): Result<number[], SingularMatrixError> {
  const n = B.length;

  // Create augmented matrix [A|B]
  const augmented: number[][] = A.map((row, i) => [...row, B[i]]);

  // Gaussian elimination with partial pivoting
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

    // Check for singular matrix
    const diag = augmented[i][i];
    if (Math.abs(diag) < MATRIX.SINGULARITY_TOLERANCE) {
      return err(new SingularMatrixError("linear system"));
    }

    // Normalize row
    for (let j = i; j <= n; j++) {
      augmented[i][j] /= diag;
    }

    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }

  // Extract solution
  return ok(augmented.map((row) => row[n]));
}

/**
 * Invert a 3x3 matrix
 * Returns the inverted matrix or error if singular
 */
export function invertMatrix3x3(
  m: Matrix3x3
): Result<Matrix3x3, SingularMatrixError> {
  // Calculate determinant
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);

  if (Math.abs(det) < MATRIX.SINGULARITY_TOLERANCE) {
    return err(new SingularMatrixError("3x3 matrix inversion"));
  }

  const invDet = 1 / det;

  const result: MutableMatrix3x3 = [
    (m[4] * m[8] - m[5] * m[7]) * invDet,
    -(m[1] * m[8] - m[2] * m[7]) * invDet,
    (m[1] * m[5] - m[2] * m[4]) * invDet,
    -(m[3] * m[8] - m[5] * m[6]) * invDet,
    (m[0] * m[8] - m[2] * m[6]) * invDet,
    -(m[0] * m[5] - m[2] * m[3]) * invDet,
    (m[3] * m[7] - m[4] * m[6]) * invDet,
    -(m[0] * m[7] - m[1] * m[6]) * invDet,
    (m[0] * m[4] - m[1] * m[3]) * invDet,
  ];

  return ok(result as Matrix3x3);
}

/**
 * Calculate the perspective transform (homography) matrix from 4 point correspondences
 * Uses the Direct Linear Transform (DLT) algorithm
 */
export function getPerspectiveTransform(
  src: readonly Point[],
  dst: readonly Point[]
): Result<HomographyResult, SingularMatrixError> {
  if (src.length !== 4 || dst.length !== 4) {
    return err(
      new SingularMatrixError(
        "perspective transform requires exactly 4 point pairs"
      )
    );
  }

  // Build system of equations
  // For each point pair (sx, sy) -> (dx, dy):
  // [sx sy 1 0 0 0 -sx*dx -sy*dx] * h = dx
  // [0 0 0 sx sy 1 -sx*dy -sy*dy] * h = dy
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    B.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    B.push(dy);
  }

  const solutionResult = solveLinearSystem(A, B);
  if (!solutionResult.ok) {
    return solutionResult;
  }

  // Homography matrix h33 = 1
  const h = solutionResult.value;
  h.push(1);

  const matrix = h as unknown as Matrix3x3;
  const inverseResult = invertMatrix3x3(matrix);

  if (!inverseResult.ok) {
    return inverseResult;
  }

  return ok({
    matrix,
    inverse: inverseResult.value,
  });
}

/**
 * Apply homography to transform a point
 */
export function transformPoint(p: Point, h: Matrix3x3): Point {
  const denominator = h[6] * p.x + h[7] * p.y + h[8];
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / denominator,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / denominator,
  };
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
