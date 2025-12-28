/**
 * Canvas Utilities for the Image Processing Pipeline
 * Handles Canvas manipulation, Sobel edge detection, and image I/O
 */

import { EDGE_DETECTION, ENHANCEMENT, OVERLAY } from "./constants";
import {
  CanvasContextError,
  ImageLoadError,
  WarpFailedError,
  err,
  ok,
  type Result,
} from "./errors";
import {
  clampPixel,
  getCardWarpDimensions,
  isOpenCVReady,
  robustSortCorners,
  warpPerspectiveISO,
} from "./geometry-utils";
import type {
  DetectionResult,
  ImageDataWithDimensions,
  ImageDimensions,
  Point,
} from "./types";

/**
 * Load an image from a data URL
 */
export function loadImage(
  dataUrl: string
): Promise<Result<HTMLImageElement, ImageLoadError>> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      resolve(ok(img));
    };

    img.onerror = () => {
      resolve(err(new ImageLoadError(dataUrl.slice(0, 100) + "...")));
    };

    img.src = dataUrl;
  });
}

/**
 * Create a canvas with the specified dimensions
 */
export function createCanvas(
  width: number,
  height: number
): Result<
  { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D },
  CanvasContextError
> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return err(new CanvasContextError());
  }

  return ok({ canvas, ctx });
}

/**
 * Get ImageData from an image
 */
export function getImageData(
  img: HTMLImageElement
): Result<ImageDataWithDimensions, CanvasContextError> {
  const result = createCanvas(img.width, img.height);
  if (!result.ok) {
    return result;
  }

  const { ctx } = result.value;
  ctx.drawImage(img, 0, 0);

  return ok({
    imageData: ctx.getImageData(0, 0, img.width, img.height),
    width: img.width,
    height: img.height,
  });
}

/**
 * Apply Sobel edge detection to image data
 * Returns a binary edge mask where edges are marked as 255
 *
 * Performance note: This is an O(width * height) operation with a 3x3 kernel.
 * Optimized to pre-calculate grayscale to avoid redundant calculations.
 */
export function applySobelEdgeDetection(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8Array {
  const edgeMask = new Uint8Array(width * height);
  const sobelX = EDGE_DETECTION.SOBEL_X;
  const sobelY = EDGE_DETECTION.SOBEL_Y;
  const threshold = EDGE_DETECTION.MAGNITUDE_THRESHOLD;

  // Pre-calculate grayscale image
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    // Simple average grayscale as used originally
    grayscale[i] = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  }

  // Skip border pixels (1px on each side)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      // Apply 3x3 Sobel kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const grayIdx = (y + ky) * width + (x + kx);
          const gray = grayscale[grayIdx];

          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray * sobelX[kernelIdx];
          gy += gray * sobelY[kernelIdx];
        }
      }

      // Calculate gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const maskIdx = y * width + x;
      edgeMask[maskIdx] = magnitude > threshold ? 255 : 0;
    }
  }

  return edgeMask;
}

/**
 * Perform perspective warp to correct card orientation
 *
 * This function now uses OpenCV.js when available for better numerical stability
 * and INTER_CUBIC interpolation (better text clarity than bilinear).
 *
 * Falls back to canvas-based simple crop when OpenCV.js is not loaded.
 *
 * REFACTORED: Phase 1 - Now uses OpenCV.js warpPerspective instead of manual
 * inverse mapping with bilinear interpolation. The OpenCV implementation:
 * - Uses SVD-based homography computation (more stable)
 * - Uses INTER_CUBIC interpolation (better text quality)
 * - Handles edge cases more robustly
 */
export function warpPerspective(
  srcImg: HTMLImageElement,
  srcCorners: readonly Point[],
  _dstCorners: readonly Point[], // Ignored - we now calculate from ISO 7810
  _outputDimensions: ImageDimensions // Ignored - we now calculate from corners
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  // Sort corners robustly (handles rotation > 45 degrees)
  const orderedCorners = robustSortCorners([...srcCorners]);

  // Calculate ISO 7810 compliant output dimensions
  const dimensions = getCardWarpDimensions(orderedCorners);
  const { width, height } = dimensions;

  // Try OpenCV.js warp first (preferred)
  if (isOpenCVReady() && typeof cv !== "undefined") {
    try {
      return warpWithOpenCV(srcImg, orderedCorners, width, height);
    } catch (error) {
      // OpenCV failed, fall through to canvas fallback
      console.warn(
        "OpenCV warp failed, using canvas fallback:",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  // Fallback: Canvas-based simple projection
  // This doesn't do true perspective correction but handles basic cases
  return warpWithCanvas(srcImg, orderedCorners, width, height);
}

/**
 * OpenCV.js-based perspective warp
 * Uses cv.getPerspectiveTransform and cv.warpPerspective with INTER_CUBIC
 */
function warpWithOpenCV(
  srcImg: HTMLImageElement,
  orderedCorners: readonly Point[],
  width: number,
  height: number
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  // Create source canvas
  const srcResult = createCanvas(srcImg.width, srcImg.height);
  if (!srcResult.ok) {
    return srcResult;
  }
  const { canvas: srcCanvas, ctx: srcCtx } = srcResult.value;
  srcCtx.drawImage(srcImg, 0, 0);

  // Create cv.Mat from canvas
  let srcMat: CVMat | null = null;
  let dstMat: CVMat | null = null;

  try {
    // Read image into OpenCV Mat
    const imageData = srcCtx.getImageData(0, 0, srcImg.width, srcImg.height);
    srcMat = cv!.matFromImageData(imageData);

    // Perform perspective warp using ISO 7810 compliant function
    dstMat = warpPerspectiveISO(srcMat, orderedCorners);

    // Create destination canvas
    const dstResult = createCanvas(width, height);
    if (!dstResult.ok) {
      return dstResult;
    }
    const { canvas: dstCanvas, ctx: dstCtx } = dstResult.value;

    // Copy result back to canvas
    const dstImageData = new ImageData(
      new Uint8ClampedArray(dstMat.data),
      width,
      height
    );
    dstCtx.putImageData(dstImageData, 0, 0);

    return ok(dstCanvas);
  } catch (error) {
    return err(
      new WarpFailedError(
        error instanceof Error ? error.message : "OpenCV warp failed"
      )
    );
  } finally {
    if (srcMat) srcMat.delete();
    if (dstMat) dstMat.delete();
  }
}

/**
 * Canvas-based fallback warp using drawImage with clipping
 * This doesn't do true perspective correction but provides a reasonable fallback
 * when OpenCV.js is not available. Uses the bounding box of corners.
 */
function warpWithCanvas(
  srcImg: HTMLImageElement,
  orderedCorners: readonly Point[],
  width: number,
  height: number
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  // Calculate bounding box from corners
  const minX = Math.min(...orderedCorners.map((p) => p.x));
  const maxX = Math.max(...orderedCorners.map((p) => p.x));
  const minY = Math.min(...orderedCorners.map((p) => p.y));
  const maxY = Math.max(...orderedCorners.map((p) => p.y));

  const srcWidth = maxX - minX;
  const srcHeight = maxY - minY;

  if (srcWidth <= 0 || srcHeight <= 0) {
    return err(new WarpFailedError("Invalid corner coordinates"));
  }

  // Create destination canvas
  const dstResult = createCanvas(width, height);
  if (!dstResult.ok) {
    return dstResult;
  }
  const { canvas: dstCanvas, ctx: dstCtx } = dstResult.value;

  // Draw the bounded region scaled to output dimensions
  // This is a simple crop/scale - not true perspective correction
  dstCtx.drawImage(
    srcImg,
    minX,
    minY,
    srcWidth,
    srcHeight,
    0,
    0,
    width,
    height
  );

  return ok(dstCanvas);
}

/**
 * Enhance image for better OCR results
 * Applies contrast and brightness adjustments
 */
export function enhanceImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const contrast = ENHANCEMENT.CONTRAST;
  const brightness = ENHANCEMENT.BRIGHTNESS;
  const center = ENHANCEMENT.CONTRAST_CENTER;

  for (let i = 0; i < data.length; i += 4) {
    // Apply contrast around center point, then add brightness
    data[i] = clampPixel((data[i] - center) * contrast + center + brightness);
    data[i + 1] = clampPixel(
      (data[i + 1] - center) * contrast + center + brightness
    );
    data[i + 2] = clampPixel(
      (data[i + 2] - center) * contrast + center + brightness
    );
    // Alpha channel unchanged
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw detection overlay on an image
 * Shows green overlay for success, red dashed rectangle for failure
 */
export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  detection: DetectionResult
): void {
  if (detection.success && detection.corners.length === 4) {
    // Draw semi-transparent green fill
    ctx.fillStyle = OVERLAY.SUCCESS_FILL;
    ctx.beginPath();
    ctx.moveTo(detection.corners[0].x, detection.corners[0].y);
    for (let i = 1; i < detection.corners.length; i++) {
      ctx.lineTo(detection.corners[i].x, detection.corners[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Draw green border
    ctx.strokeStyle = OVERLAY.SUCCESS_STROKE;
    ctx.lineWidth = OVERLAY.SUCCESS_LINE_WIDTH;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(detection.corners[0].x, detection.corners[0].y);
    for (let i = 1; i < detection.corners.length; i++) {
      ctx.lineTo(detection.corners[i].x, detection.corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Draw corner markers
    ctx.fillStyle = OVERLAY.SUCCESS_STROKE;
    for (const corner of detection.corners) {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, OVERLAY.CORNER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Draw red dashed rectangle for failed detection
    const { x, y, width, height } = detection.boundingRect;
    ctx.strokeStyle = OVERLAY.FAILURE_STROKE;
    ctx.lineWidth = OVERLAY.FAILURE_LINE_WIDTH;
    ctx.setLineDash([...OVERLAY.FAILURE_DASH_PATTERN]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }
}

/**
 * Simple crop and scale (fallback when perspective warp fails)
 */
export function simpleCrop(
  img: HTMLImageElement,
  cropRect: { x: number; y: number; width: number; height: number },
  outputDimensions: ImageDimensions
): Result<HTMLCanvasElement, CanvasContextError> {
  const result = createCanvas(outputDimensions.width, outputDimensions.height);
  if (!result.ok) {
    return result;
  }

  const { canvas, ctx } = result.value;
  ctx.drawImage(
    img,
    cropRect.x,
    cropRect.y,
    cropRect.width,
    cropRect.height,
    0,
    0,
    outputDimensions.width,
    outputDimensions.height
  );

  return ok(canvas);
}

/**
 * Scale image while maintaining aspect ratio
 */
export function scaleImage(
  img: HTMLImageElement,
  outputWidth: number
): Result<HTMLCanvasElement, CanvasContextError> {
  const aspectRatio = img.width / img.height;
  const outputHeight = Math.round(outputWidth / aspectRatio);

  const result = createCanvas(outputWidth, outputHeight);
  if (!result.ok) {
    return result;
  }

  const { canvas, ctx } = result.value;
  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

  return ok(canvas);
}

/**
 * Convert canvas to base64 data URL
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  format: "image/png" | "image/jpeg" = "image/png",
  quality?: number
): string {
  return canvas.toDataURL(format, quality);
}
