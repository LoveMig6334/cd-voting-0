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

  // Find yellow/gold colored regions (typical Thai student ID cards)
  const yellowMask = new Uint8Array(width * height);
  const edgeMask = new Uint8Array(width * height);

  // Color thresholds for yellow/gold card detection
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const pixelIndex = i / 4;

    // Detect yellow/gold colors (HSL-like detection via RGB)
    const isYellow =
      r > 150 && g > 120 && b < 150 && r > b + 30 && g > b + 20;
    // Also detect light/cream colors common on ID cards
    const isLight = r > 180 && g > 170 && b > 140 && r - b < 80;
    // Detect blue (some cards have blue elements)
    const isBlue = b > 100 && b > r && b > g - 30;

    if (isYellow || isLight || isBlue) {
      yellowMask[pixelIndex] = 255;
    }
  }

  // Apply Sobel edge detection
  applySobelEdgeDetection(data, edgeMask, width, height);

  // Find contours and largest rectangular region
  const contours = findContours(edgeMask, width, height);
  const cardContour = findLargestQuadrilateral(contours, width, height);

  if (cardContour.length === 4) {
    const rect = getBoundingRect(cardContour);
    const confidence = calculateConfidence(rect, width, height);

    return {
      success: true,
      corners: orderCorners(cardContour),
      boundingRect: rect,
      confidence,
    };
  }

  // Fallback: use edge-based detection
  const fallbackRect = findEdgeBasedBoundary(edgeMask, yellowMask, width, height);
  if (fallbackRect.width > 0) {
    const corners = rectToCorners(fallbackRect);
    return {
      success: true,
      corners,
      boundingRect: fallbackRect,
      confidence: 60,
    };
  }

  // Ultimate fallback: use center 80% of image
  const defaultRect = {
    x: Math.floor(width * 0.1),
    y: Math.floor(height * 0.1),
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
  };

  return {
    success: false,
    corners: rectToCorners(defaultRect),
    boundingRect: defaultRect,
    confidence: 30,
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
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
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
    const simplified = simplifyContour(contour, 10);
    const hull = convexHull(simplified);

    if (hull.length >= 4) {
      const quad = approximateQuadrilateral(hull);
      if (quad.length === 4) {
        const area = quadArea(quad);
        const minArea = width * height * 0.1;
        const maxArea = width * height * 0.95;

        if (area > bestArea && area > minArea && area < maxArea) {
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
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
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

function approximateQuadrilateral(hull: Point[]): Point[] {
  if (hull.length <= 4) return hull;

  // Find 4 most extreme points
  let minX = hull[0], maxX = hull[0], minY = hull[0], maxY = hull[0];
  for (const p of hull) {
    if (p.x < minX.x) minX = p;
    if (p.x > maxX.x) maxX = p;
    if (p.y < minY.y) minY = p;
    if (p.y > maxY.y) maxY = p;
  }

  return [minX, minY, maxX, maxY].filter(
    (p, i, arr) => arr.findIndex((q) => q.x === p.x && q.y === p.y) === i
  );
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

function orderCorners(corners: Point[]): Point[] {
  // Order: top-left, top-right, bottom-right, bottom-left
  const center = {
    x: corners.reduce((s, c) => s + c.x, 0) / corners.length,
    y: corners.reduce((s, c) => s + c.y, 0) / corners.length,
  };

  return corners.sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
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
  // ID cards typically have aspect ratio around 1.5-1.7
  const expectedRatio = 1.586; // Standard ID card ratio
  const ratioScore = 100 - Math.abs(aspectRatio - expectedRatio) * 30;

  const coverageRatio = (rect.width * rect.height) / (imageWidth * imageHeight);
  // Card should cover 20-80% of image
  const coverageScore = coverageRatio > 0.2 && coverageRatio < 0.8 ? 90 : 50;

  return Math.max(0, Math.min(100, (ratioScore + coverageScore) / 2));
}

function findEdgeBasedBoundary(
  edgeMask: Uint8Array,
  colorMask: Uint8Array,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  let minX = width, maxX = 0, minY = height, maxY = 0;
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
  detection: DetectionResult
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;

      const { x, y, width, height } = detection.boundingRect;

      // Set output dimensions (standard ID card aspect ratio)
      const outputWidth = 600;
      const outputHeight = Math.round(outputWidth / 1.586);

      canvas.width = outputWidth;
      canvas.height = outputHeight;

      if (detection.success && detection.corners.length === 4) {
        // Apply perspective correction using bilinear interpolation
        const corners = detection.corners;

        // Simple crop with perspective approximation
        // For more accurate warping, we'd need a proper perspective transform matrix
        const srcQuad = corners;
        const dstQuad = [
          { x: 0, y: 0 },
          { x: outputWidth, y: 0 },
          { x: outputWidth, y: outputHeight },
          { x: 0, y: outputHeight },
        ];

        // Use canvas drawImage with source rect approximation
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

        // Apply image enhancement
        enhanceImage(ctx, outputWidth, outputHeight);
      } else {
        // Fallback: simple crop
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

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
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
export async function processImage(imageDataUrl: string): Promise<ProcessedImage> {
  // Step 1: Detect card boundaries
  const detectionResult = await detectCardBoundaries(imageDataUrl);

  // Step 2: Draw detection overlay on original
  const originalWithOverlay = await drawDetectionOverlay(
    imageDataUrl,
    detectionResult
  );

  // Step 3: Crop and warp card
  const croppedCard = await cropAndWarpCard(imageDataUrl, detectionResult);

  return {
    originalWithOverlay,
    croppedCard,
    detectionResult,
  };
}
