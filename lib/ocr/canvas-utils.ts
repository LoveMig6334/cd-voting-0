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
import { clampPixel, getPerspectiveTransform } from "./geometry-utils";
import type {
  DetectionResult,
  ImageDataWithDimensions,
  ImageDimensions,
  Matrix3x3,
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
 * Perform perspective warp using inverse mapping with bilinear interpolation
 *
 * Performance note: This is the most expensive operation in the pipeline.
 * For a 600x378 output, we perform ~226k pixel lookups with bilinear interpolation.
 * Each pixel requires:
 * - 3 multiplications + 2 additions for homography transform
 * - 1 division for perspective correction
 * - 4 memory reads + 16 multiplications for bilinear interpolation
 *
 * Potential optimizations (not implemented):
 * - WebGL shader-based warping
 * - SIMD via WebAssembly
 * - Incremental homography computation along scanlines
 */
export function warpPerspective(
  srcImg: HTMLImageElement,
  srcCorners: readonly Point[],
  dstCorners: readonly Point[],
  outputDimensions: ImageDimensions
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  const { width, height } = outputDimensions;

  // Create destination canvas
  const dstResult = createCanvas(width, height);
  if (!dstResult.ok) {
    return dstResult;
  }
  const { canvas: dstCanvas, ctx: dstCtx } = dstResult.value;

  // Create source canvas to read pixels
  const srcResult = createCanvas(srcImg.width, srcImg.height);
  if (!srcResult.ok) {
    return srcResult;
  }
  const { ctx: srcCtx } = srcResult.value;
  srcCtx.drawImage(srcImg, 0, 0);

  // Get source image data
  const srcData = srcCtx.getImageData(0, 0, srcImg.width, srcImg.height);

  // Calculate homography (src -> dst), we need inverse (dst -> src)
  const homographyResult = getPerspectiveTransform(srcCorners, dstCorners);
  if (!homographyResult.ok) {
    return err(new WarpFailedError("Failed to compute homography matrix"));
  }

  const invH = homographyResult.value.inverse;

  // Create destination image data
  const dstData = dstCtx.createImageData(width, height);

  // Perform inverse mapping
  warpPixels(
    srcData,
    dstData,
    invH,
    srcImg.width,
    srcImg.height,
    width,
    height
  );

  dstCtx.putImageData(dstData, 0, 0);

  return ok(dstCanvas);
}

/**
 * Core pixel warping loop with bilinear interpolation
 * Separated for potential future optimization or WebAssembly replacement
 */
function warpPixels(
  srcData: ImageData,
  dstData: ImageData,
  invH: Matrix3x3,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): void {
  const srcPixels = srcData.data;
  const dstPixels = dstData.data;

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      // Apply inverse homography to find source coordinate
      const denominator = invH[6] * x + invH[7] * y + invH[8];
      const srcX = (invH[0] * x + invH[1] * y + invH[2]) / denominator;
      const srcY = (invH[3] * x + invH[4] * y + invH[5]) / denominator;

      // Check bounds (with 1px margin for bilinear interpolation)
      if (
        srcX >= 0 &&
        srcX < srcWidth - 1 &&
        srcY >= 0 &&
        srcY < srcHeight - 1
      ) {
        // Bilinear interpolation
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const dx = srcX - x0;
        const dy = srcY - y0;

        const dstIdx = (y * dstWidth + x) * 4;

        // Get 4 neighbor pixel indices
        const i00 = (y0 * srcWidth + x0) * 4;
        const i10 = (y0 * srcWidth + (x0 + 1)) * 4;
        const i01 = ((y0 + 1) * srcWidth + x0) * 4;
        const i11 = ((y0 + 1) * srcWidth + (x0 + 1)) * 4;

        // Interpolate each channel (R, G, B, A)
        for (let c = 0; c < 4; c++) {
          const val =
            srcPixels[i00 + c] * (1 - dx) * (1 - dy) +
            srcPixels[i10 + c] * dx * (1 - dy) +
            srcPixels[i01 + c] * (1 - dx) * dy +
            srcPixels[i11 + c] * dx * dy;
          dstPixels[dstIdx + c] = val;
        }
      }
      // Out-of-bounds pixels remain transparent (initialized to 0)
    }
  }
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
