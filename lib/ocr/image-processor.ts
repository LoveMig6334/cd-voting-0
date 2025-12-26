/**
 * Image Preprocessing Pipeline for OCR
 * Uses OpenCV.js for card detection, perspective correction, and image enhancement
 */

export interface DetectionResult {
  success: boolean;
  corners: Point[];
  boundingRect: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface ProcessedImage {
  originalWithOverlay: string; // Base64 image with detection overlay
  croppedCard: string; // Base64 cropped and warped card
  detectionResult: DetectionResult;
}

export interface ProcessingOptions {
  enableCrop: boolean;
  enableEnhancement: boolean;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Detect card boundaries using edge detection and contour analysis
 * Works with yellow/gold/blue Thai student ID cards
 */
export async function detectCardBoundaries(
  imageDataUrl: string
): Promise<DetectionResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = detectCardEdges(imageData, canvas.width, canvas.height);
      resolve(result);
    };
    img.onerror = () => {
      resolve({
        success: false,
        corners: [],
        boundingRect: { x: 0, y: 0, width: 0, height: 0 },
        confidence: 0,
      });
    };
    img.src = imageDataUrl;
  });
}

/**
 * Canvas-based edge detection for card boundaries
 * Uses color-based segmentation for yellow/gold cards
 */
function detectCardEdges(
  imageData: ImageData,
  width: number,
  height: number
): DetectionResult {
  const data = imageData.data;
  const yellowMask = new Uint8Array(width * height);
  const edgeMask = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const pixelIndex = i / 4;

    // FIX 1: Enhanced Color Detection for Dark Backgrounds
    // Since your background is black, we can include any "Bright" pixel
    const isBright = r > 100 && g > 100 && b > 100;

    // Existing Yellow/Gold logic (relaxed)
    const isYellow = r > 90 && g > 70 && b < 180 && r > b;
    const isBlue = b > 70 && b > r && b > g;

    if (isYellow || isBlue || isBright) {
      yellowMask[pixelIndex] = 255;
    }
  }

  applySobelEdgeDetection(data, edgeMask, width, height);

  // Find contours
  const contours = findContours(edgeMask, width, height);
  const cardContour = findLargestQuadrilateral(contours, width, height);

  if (cardContour.length === 4) {
    const rect = getBoundingRect(cardContour);
    const confidence = calculateConfidence(rect, width, height);

    // FIX 2: Allow slightly wider range of aspect ratios (1.0 - 2.8)
    // and lower the confidence threshold check to 30
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio > 1.0 && aspectRatio < 2.8 && confidence > 30) {
      return {
        success: true,
        corners: cardContour,
        boundingRect: rect,
        confidence,
      };
    }
  }

  // Fallback: Edge-based boundary
  const fallbackRect = findEdgeBasedBoundary(
    edgeMask,
    yellowMask,
    width,
    height
  );
  if (fallbackRect.width > 0) {
    const fbRatio = fallbackRect.width / fallbackRect.height;
    // If found blob is roughly landscape, accept it
    if (fbRatio > 1.1 && fbRatio < 2.5) {
      return {
        success: true,
        corners: rectToCorners(fallbackRect),
        boundingRect: fallbackRect,
        confidence: 50,
      };
    }
  }

  // FIX 3: SMART ULTIMATE FALLBACK
  // If detection fails on a Portrait photo, do NOT crop a Portrait rectangle.
  // We must crop a Landscape rectangle from the center to prevent squashing.

  const isPortrait = height > width;
  let defaultWidth, defaultHeight, defaultX, defaultY;

  if (isPortrait) {
    // Logic: Take 90% of width, then calculate height based on ID Card Ratio (1.586)
    defaultWidth = Math.floor(width * 0.9);
    defaultHeight = Math.floor(defaultWidth / 1.586);
    defaultX = Math.floor((width - defaultWidth) / 2);
    // Center it vertically
    defaultY = Math.floor((height - defaultHeight) / 2);
  } else {
    // Standard landscape fallback
    defaultWidth = Math.floor(width * 0.8);
    defaultHeight = Math.floor(height * 0.8);
    defaultX = Math.floor(width * 0.1);
    defaultY = Math.floor(height * 0.1);
  }

  const defaultRect = {
    x: defaultX,
    y: defaultY,
    width: defaultWidth,
    height: defaultHeight,
  };

  return {
    success: false, // Still mark as false so UI shows red border
    corners: rectToCorners(defaultRect),
    boundingRect: defaultRect,
    confidence: 20,
  };
}

function applySobelEdgeDetection(
  data: Uint8ClampedArray,
  edgeMask: Uint8Array,
  width: number,
  height: number
): void {
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          // Convert to grayscale
          const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += gray * sobelX[ki];
          gy += gray * sobelY[ki];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const pixelIndex = y * width + x;
      edgeMask[pixelIndex] = magnitude > 50 ? 255 : 0;
    }
  }
}

function findContours(
  edgeMask: Uint8Array,
  width: number,
  height: number
): Point[][] {
  const contours: Point[][] = [];
  const visited = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edgeMask[idx] === 255 && visited[idx] === 0) {
        const contour = traceContour(edgeMask, visited, x, y, width, height);
        if (contour.length > 50) {
          contours.push(contour);
        }
      }
    }
  }

  return contours;
}

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
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  while (stack.length > 0 && contour.length < 5000) {
    const point = stack.pop()!;
    const idx = point.y * width + point.x;

    if (visited[idx] === 1) continue;
    visited[idx] = 1;
    contour.push(point);

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

function findLargestQuadrilateral(
  contours: Point[][],
  width: number,
  height: number
): Point[] {
  let bestQuad: Point[] = [];
  let bestArea = 0;

  for (const contour of contours) {
    // Less aggressive simplification to preserve corners
    const simplified = simplifyContour(contour, 2);
    const hull = convexHull(simplified);

    if (hull.length >= 4) {
      const quad = getOrderedCorners(hull);
      if (quad.length === 4) {
        const area = quadArea(quad);
        const minArea = width * height * 0.1;
        const maxArea = width * height * 0.95;

        // Ensure convex and reasonable shape
        if (
          area > bestArea &&
          area > minArea &&
          area < maxArea &&
          isConvex(quad)
        ) {
          bestArea = area;
          bestQuad = quad;
        }
      }
    }
  }

  return bestQuad;
}

function simplifyContour(contour: Point[], epsilon: number): Point[] {
  if (contour.length < 3) return contour;

  const simplified: Point[] = [];
  for (let i = 0; i < contour.length; i += epsilon) {
    simplified.push(contour[i]);
  }
  return simplified;
}

function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) =>
    a.x === b.x ? a.y - b.y : a.x - b.x
  );

  const lower: Point[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function cross(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function isConvex(quad: Point[]): boolean {
  if (quad.length !== 4) return false;
  // Check cross products of adjacent edges have same sign
  const cp1 = cross(quad[0], quad[1], quad[2]);
  const cp2 = cross(quad[1], quad[2], quad[3]);
  const cp3 = cross(quad[2], quad[3], quad[0]);
  const cp4 = cross(quad[3], quad[0], quad[1]);
  return (
    (cp1 > 0 && cp2 > 0 && cp3 > 0 && cp4 > 0) ||
    (cp1 < 0 && cp2 < 0 && cp3 < 0 && cp4 < 0)
  );
}

// FIX 4: Ensure getOrderedCorners is strictly geometric (Sum/Diff)
// This logic is robust for standard ID card orientations
function getOrderedCorners(hull: Point[]): Point[] {
  if (hull.length < 4) return [];

  let topLeft = hull[0];
  let bottomRight = hull[0];
  let topRight = hull[0];
  let bottomLeft = hull[0];

  let minSum = Infinity,
    maxSum = -Infinity;
  let minDiff = Infinity,
    maxDiff = -Infinity;

  for (const p of hull) {
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

  // Force strict order: TL, TR, BR, BL
  // This matches the dstCorners order in cropAndWarpCard
  return [topLeft, topRight, bottomRight, bottomLeft];
}

function quadArea(quad: Point[]): number {
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

function getBoundingRect(corners: Point[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function rectToCorners(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

function calculateConfidence(
  rect: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
): number {
  const aspectRatio = rect.width / rect.height;
  const expectedRatio = 1.586;
  const ratioScore = 100 - Math.abs(aspectRatio - expectedRatio) * 30;

  const coverageRatio = (rect.width * rect.height) / (imageWidth * imageHeight);

  // FIX 4: Lower Coverage Threshold
  // In a vertical phone photo, a card might only cover 5-10% of the pixels.
  // Changed threshold from 0.2 (20%) to 0.05 (5%)
  const coverageScore = coverageRatio > 0.05 && coverageRatio < 0.9 ? 90 : 40;

  return Math.max(0, Math.min(100, (ratioScore + coverageScore) / 2));
}

function findEdgeBasedBoundary(
  edgeMask: Uint8Array,
  colorMask: Uint8Array,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;
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
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  // Add padding
  const padding = 10;
  return {
    x: Math.max(0, minX - padding),
    y: Math.max(0, minY - padding),
    width: Math.min(width - minX + padding, maxX - minX + padding * 2),
    height: Math.min(height - minY + padding, maxY - minY + padding * 2),
  };
}

/**
 * Draw detection overlay on original image
 */
export async function drawDetectionOverlay(
  imageDataUrl: string,
  detection: DetectionResult
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      if (detection.success && detection.corners.length === 4) {
        // Draw semi-transparent green overlay
        ctx.fillStyle = "rgba(34, 197, 94, 0.2)";
        ctx.beginPath();
        ctx.moveTo(detection.corners[0].x, detection.corners[0].y);
        for (let i = 1; i < detection.corners.length; i++) {
          ctx.lineTo(detection.corners[i].x, detection.corners[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Draw green border
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(detection.corners[0].x, detection.corners[0].y);
        for (let i = 1; i < detection.corners.length; i++) {
          ctx.lineTo(detection.corners[i].x, detection.corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw corner markers
        ctx.fillStyle = "#22c55e";
        for (const corner of detection.corners) {
          ctx.beginPath();
          ctx.arc(corner.x, corner.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Draw red border for failed detection
        const { x, y, width, height } = detection.boundingRect;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(x, y, width, height);
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Crop and apply perspective warp to extract the card
 */
export async function cropAndWarpCard(
  imageDataUrl: string,
  detection: DetectionResult,
  options: ProcessingOptions = { enableCrop: true, enableEnhancement: true }
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      (async () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // If cropping is disabled, return the original image scaled
        if (!options.enableCrop) {
          const outputWidth = 600;
          const outputHeight = Math.round(
            outputWidth / (img.width / img.height)
          );
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

          if (options.enableEnhancement) {
            enhanceImage(ctx, outputWidth, outputHeight);
          }

          resolve(canvas.toDataURL("image/png"));
          return;
        }

        // Set output dimensions (standard ID card aspect ratio)
        const outputWidth = 600;
        const outputHeight = Math.round(outputWidth / 1.586);

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        if (detection.success && detection.corners.length === 4) {
          // Perform Perspective Warp
          try {
            // Source corners from detection
            const srcCorners = detection.corners;

            // Destination corners (the full output canvas)
            // Order: TL, TR, BR, BL matching getOrderedCorners/orderCorners
            const dstCorners = [
              { x: 0, y: 0 },
              { x: outputWidth, y: 0 },
              { x: outputWidth, y: outputHeight },
              { x: 0, y: outputHeight },
            ];

            await warpPerspective(img, canvas, srcCorners, dstCorners);
          } catch (e) {
            console.error("Warp failed, falling back to crop", e);
            // Fallback: simple crop
            const { x, y, width, height } = detection.boundingRect;
            ctx.drawImage(
              img,
              x,
              y,
              width,
              height,
              0,
              0,
              outputWidth,
              outputHeight
            );
          }

          // Apply image enhancement only if enabled
          if (options.enableEnhancement) {
            enhanceImage(ctx, outputWidth, outputHeight);
          }
        } else {
          // Fallback: simple crop
          const { x, y, width, height } = detection.boundingRect;
          ctx.drawImage(
            img,
            x,
            y,
            width,
            height,
            0,
            0,
            outputWidth,
            outputHeight
          );

          if (options.enableEnhancement) {
            enhanceImage(ctx, outputWidth, outputHeight);
          }
        }

        resolve(canvas.toDataURL("image/png"));
      })();
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
}

/**
 * Perform manual perspective warp
 */
async function warpPerspective(
  srcImg: HTMLImageElement,
  dstCanvas: HTMLCanvasElement,
  srcCorners: Point[],
  dstCorners: Point[]
): Promise<void> {
  const ctx = dstCanvas.getContext("2d")!;
  const width = dstCanvas.width;
  const height = dstCanvas.height;

  // Calculate Homography Matrix
  const h = getPerspectiveTransform(srcCorners, dstCorners);
  const invH = invertMatrix(h);

  // Per-pixel inverse mapping (This is slow in JS, but okay for 600x400)
  // Use a temporay canvas to read source data
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = srcImg.width;
  tempCanvas.height = srcImg.height;
  const tempCtx = tempCanvas.getContext("2d")!;
  tempCtx.drawImage(srcImg, 0, 0);
  const srcData = tempCtx.getImageData(0, 0, srcImg.width, srcImg.height);

  const dstData = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Apply inverse homography to find source coordinate
      // x' = (h00*x + h01*y + h02) / (h20*x + h21*y + h22)
      // y' = (h10*x + h11*y + h12) / (h20*x + h21*y + h22)

      const denominator = invH[6] * x + invH[7] * y + invH[8];
      const srcX = (invH[0] * x + invH[1] * y + invH[2]) / denominator;
      const srcY = (invH[3] * x + invH[4] * y + invH[5]) / denominator;

      if (
        srcX >= 0 &&
        srcX < srcImg.width - 1 &&
        srcY >= 0 &&
        srcY < srcImg.height - 1
      ) {
        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const dx = srcX - x0;
        const dy = srcY - y0;

        const idx = (y * width + x) * 4;

        // Get 4 neighbors
        const i00 = (y0 * srcImg.width + x0) * 4;
        const i10 = (y0 * srcImg.width + (x0 + 1)) * 4;
        const i01 = ((y0 + 1) * srcImg.width + x0) * 4;
        const i11 = ((y0 + 1) * srcImg.width + (x0 + 1)) * 4;

        for (let c = 0; c < 4; c++) {
          const val =
            srcData.data[i00 + c] * (1 - dx) * (1 - dy) +
            srcData.data[i10 + c] * dx * (1 - dy) +
            srcData.data[i01 + c] * (1 - dx) * dy +
            srcData.data[i11 + c] * dx * dy;
          dstData.data[idx + c] = val;
        }
      }
    }
  }

  ctx.putImageData(dstData, 0, 0);
}

function getPerspectiveTransform(src: Point[], dst: Point[]): number[] {
  // Solves Ah = 0 for homography matrix H
  const a: number[][] = [];

  for (let i = 0; i < 4; i++) {
    a.push([
      src[i].x,
      src[i].y,
      1,
      0,
      0,
      0,
      -src[i].x * dst[i].x,
      -src[i].y * dst[i].x,
    ]);
    a.push([
      0,
      0,
      0,
      src[i].x,
      src[i].y,
      1,
      -src[i].x * dst[i].y,
      -src[i].y * dst[i].y,
    ]);
  }

  // Solve linear system using Gaussian elimination
  // We need to add the constrained vector b which is just the dst coordinates for the last column of H?
  // Actually, standard DLT solves Ah=0. We'll set H_33 = 1 and solve for the first 8 params.
  // The system becomes A * [h0...h7] = [dstX...dstY] basically.

  // A simpler approach for the 8-DOF homography:
  // Matrix A (8x8) * H (8x1) = B (8x1)

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

  const h = solveLinearSystem(A, B);
  h.push(1); // h33 = 1
  return h;
}

function solveLinearSystem(A: number[][], B: number[]): number[] {
  const n = B.length;
  // Augment A with B
  for (let i = 0; i < n; i++) A[i].push(B[i]);

  // Gaussian elimination
  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];

    // Normalize
    const diag = A[i][i];
    if (Math.abs(diag) < 1e-8) continue; // Singular
    for (let j = i; j <= n; j++) A[i][j] /= diag;

    // Eliminate
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = i; j <= n; j++) A[k][j] -= factor * A[i][j];
      }
    }
  }

  return A.map((row) => row[n]);
}

function invertMatrix(m: number[]): number[] {
  // m is 3x3 flattened
  // Compute adjoint and determinant
  const det =
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6]);

  if (Math.abs(det) < 1e-8) return m; // Should not happen for valid perspective

  const invDet = 1 / det;

  return [
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
}

/**
 * Enhance image for better OCR results
 */
function enhanceImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Increase contrast and sharpen
  const contrast = 1.2;
  const brightness = 10;

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast and brightness
    data[i] = clamp((data[i] - 128) * contrast + 128 + brightness);
    data[i + 1] = clamp((data[i + 1] - 128) * contrast + 128 + brightness);
    data[i + 2] = clamp((data[i + 2] - 128) * contrast + 128 + brightness);
  }

  ctx.putImageData(imageData, 0, 0);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Full preprocessing pipeline
 */
export async function processImage(
  imageDataUrl: string,
  options: ProcessingOptions = { enableCrop: true, enableEnhancement: true }
): Promise<ProcessedImage> {
  // Step 1: Detect card boundaries
  const detectionResult = await detectCardBoundaries(imageDataUrl);

  // Step 2: Draw detection overlay on original
  const originalWithOverlay = await drawDetectionOverlay(
    imageDataUrl,
    detectionResult
  );

  // Step 3: Crop and warp card with options
  const croppedCard = await cropAndWarpCard(
    imageDataUrl,
    detectionResult,
    options
  );

  return {
    originalWithOverlay,
    croppedCard,
    detectionResult,
  };
}
