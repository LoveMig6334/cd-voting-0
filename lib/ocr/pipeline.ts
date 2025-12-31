/**
 * Pipeline Module - Image Processing Pipeline
 * Orchestrates detection, warping, enhancement, and canvas operations
 */

import {
  CARD_DIMENSIONS,
  ENHANCEMENT,
  OCR_PROCESSING,
  OVERLAY,
} from "./constants";
import { detectCard, getMethodDescription } from "./detector";
import { loadOpenCV } from "./opencv-loader";
import {
  CanvasContextError,
  createDefaultProcessingOptions,
  type DetectionError,
  DetectionResult,
  err,
  errorToDiagnostic,
  ExtendedDetectionResult,
  ImageDataWithDimensions,
  ImageDimensions,
  ImageLoadError,
  isErr,
  ok,
  Point,
  ProcessedImage,
  ProcessingOptions,
  Result,
  WarpFailedError,
} from "./types";

// Note: OpenCV.js types (CV, CVMat, CVSize, CVScalar) are declared globally in detector.ts

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Load an image from a data URL
 */
export function loadImage(
  dataUrl: string
): Promise<Result<HTMLImageElement, ImageLoadError>> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(ok(img));
    img.onerror = () =>
      resolve(err(new ImageLoadError(dataUrl.slice(0, 100) + "...")));
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
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
  if (!result.ok) return result;
  const { ctx } = result.value;
  ctx.drawImage(img, 0, 0);
  return ok({
    imageData: ctx.getImageData(0, 0, img.width, img.height),
    width: img.width,
    height: img.height,
  });
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

/**
 * Draw detection overlay on an image
 */
export function drawDetectionOverlay(
  ctx: CanvasRenderingContext2D,
  detection: DetectionResult
): void {
  if (detection.success && detection.corners.length === 4) {
    ctx.fillStyle = OVERLAY.SUCCESS_FILL;
    ctx.beginPath();
    ctx.moveTo(detection.corners[0].x, detection.corners[0].y);
    for (let i = 1; i < detection.corners.length; i++) {
      ctx.lineTo(detection.corners[i].x, detection.corners[i].y);
    }
    ctx.closePath();
    ctx.fill();

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

    ctx.fillStyle = OVERLAY.SUCCESS_STROKE;
    for (const corner of detection.corners) {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, OVERLAY.CORNER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const { x, y, width, height } = detection.boundingRect;
    ctx.strokeStyle = OVERLAY.FAILURE_STROKE;
    ctx.lineWidth = OVERLAY.FAILURE_LINE_WIDTH;
    ctx.setLineDash([...OVERLAY.FAILURE_DASH_PATTERN]);
    ctx.strokeRect(x, y, width, height);
    ctx.setLineDash([]);
  }
}

/**
 * Enhance image for better OCR results
 */
export function enhanceImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  enhanceImageData(imageData);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Enhance image data in place (Contrast & Brightness)
 */
export function enhanceImageData(imageData: ImageData): void {
  const data = imageData.data;
  const contrast = ENHANCEMENT.CONTRAST;
  const brightness = ENHANCEMENT.BRIGHTNESS;
  const center = ENHANCEMENT.CONTRAST_CENTER;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = clampPixel((data[i] - center) * contrast + center + brightness);
    data[i + 1] = clampPixel(
      (data[i + 1] - center) * contrast + center + brightness
    );
    data[i + 2] = clampPixel(
      (data[i + 2] - center) * contrast + center + brightness
    );
  }
}

function clampPixel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Convert image to grayscale using OpenCV
 */
export function grayscaleImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = (cv as any)!.matFromImageData(imageData);
  const dst = new (cv as any)!.Mat();

  (cv as any)!.cvtColor(src, dst, (cv as any)!.COLOR_RGBA2GRAY);
  const grayImageData = new ImageData(
    new Uint8ClampedArray(dst.data),
    dst.cols,
    dst.rows
  );

  ctx.putImageData(grayImageData, 0, 0);

  src.delete();
  dst.delete();
}

/**
 * Apply adaptive thresholding to create a binary image
 * This is highly effective for OCR preprocessing
 */
export function applyAdaptiveThreshold(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const thresholded = applyAdaptiveThresholdToData(imageData);
  if (thresholded) {
    ctx.putImageData(thresholded, 0, 0);
  }
}

/**
 * Apply adaptive thresholding to ImageData
 */
export function applyAdaptiveThresholdToData(
  imageData: ImageData
): ImageData | null {
  if (!isOpenCVReady() || typeof cv === "undefined") {
    return null;
  }

  const cvAny = cv as any;
  let src: any = null;
  let gray: any = null;
  let adaptive: any = null;
  let mask: any = null;
  let rgba: any = null;

  try {
    src = cvAny.matFromImageData(imageData);
    gray = new cvAny.Mat();
    adaptive = new cvAny.Mat();
    mask = new cvAny.Mat();

    // 1. Convert to grayscale
    if (src.channels() > 1) {
      cvAny.cvtColor(src, gray, cvAny.COLOR_RGBA2GRAY);
    } else {
      src.copyTo(gray);
    }

    // 2. Perform adaptive thresholding for sharp text edges
    cvAny.adaptiveThreshold(
      gray,
      adaptive,
      255,
      cvAny.ADAPTIVE_THRESH_GAUSSIAN_C,
      cvAny.THRESH_BINARY,
      OCR_PROCESSING.ADAPTIVE_THRESHOLD_BLOCK_SIZE,
      OCR_PROCESSING.ADAPTIVE_THRESHOLD_C
    );

    // 3. Global threshold pre-pass: Filter out anything not 'close to black'
    // Any pixel brighter than GLOBAL_THRESHOLD (e.g., 120) is forced to white
    cvAny.threshold(
      gray,
      mask,
      OCR_PROCESSING.GLOBAL_THRESHOLD,
      255,
      cvAny.THRESH_BINARY
    );

    // 4. Combine: Force globally 'light' pixels to white in the adaptive result
    // This removes background noise that adaptive thresholding might mistakenly pick up
    adaptive.setTo(new cvAny.Scalar(255), mask);

    // 5. Convert binary result back to RGBA for canvas display
    rgba = new cvAny.Mat();
    cvAny.cvtColor(adaptive, rgba, cvAny.COLOR_GRAY2RGBA);

    return new ImageData(
      new Uint8ClampedArray(rgba.data),
      rgba.cols,
      rgba.rows
    );
  } catch (error) {
    console.error("Adaptive threshold failed:", error);
    return null;
  } finally {
    // Cleanup
    if (src) src.delete();
    if (gray) gray.delete();
    if (adaptive) adaptive.delete();
    if (mask) mask.delete();
    if (rgba) rgba.delete();
  }
}

/**
 * Sharpen image using OpenCV unsharp mask technique
 * This enhances text edges for better OCR recognition
 */
export function sharpenImage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const sharpened = sharpenImageData(imageData);
  if (sharpened) {
    ctx.putImageData(sharpened, 0, 0);
  }
}

/**
 * Sharpen ImageData using OpenCV
 */
export function sharpenImageData(imageData: ImageData): ImageData | null {
  // Check if OpenCV is available
  if (!isOpenCVReady() || typeof cv === "undefined") {
    console.warn("OpenCV not available, skipping sharpening");
    return null;
  }

  let srcMat: CVMat | null = null;
  let blurredMat: CVMat | null = null;
  let sharpenedMat: CVMat | null = null;

  try {
    srcMat = cv.matFromImageData(imageData);

    // Create blurred version using Gaussian blur
    blurredMat = new cv.Mat();
    const kernelSize = ENHANCEMENT.SHARPEN_KERNEL_SIZE;
    cv.GaussianBlur(srcMat, blurredMat, new cv.Size(kernelSize, kernelSize), 0);

    // Apply unsharp mask: sharpened = original + intensity * (original - blurred)
    // Using addWeighted: sharpened = (1 + intensity) * original - intensity * blurred
    sharpenedMat = new cv.Mat();
    const intensity = ENHANCEMENT.SHARPEN_INTENSITY;
    const alpha = 1 + intensity; // Weight for original
    const beta = -intensity; // Weight for blurred (negative to subtract)
    const gamma = 0; // No additional brightness

    cv.addWeighted(srcMat, alpha, blurredMat, beta, gamma, sharpenedMat);

    // Return the sharpened image data
    return new ImageData(
      new Uint8ClampedArray(sharpenedMat.data),
      imageData.width,
      imageData.height
    );
  } catch (error) {
    console.warn("Sharpening failed:", error);
    return null;
  } finally {
    // Clean up OpenCV matrices
    if (srcMat) srcMat.delete();
    if (blurredMat) blurredMat.delete();
    if (sharpenedMat) sharpenedMat.delete();
  }
}

/**
 * Simple crop and scale
 */
export function simpleCrop(
  img: HTMLImageElement,
  cropRect: { x: number; y: number; width: number; height: number },
  outputDimensions: ImageDimensions
): Result<HTMLCanvasElement, CanvasContextError> {
  const result = createCanvas(outputDimensions.width, outputDimensions.height);
  if (!result.ok) return result;
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
  if (!result.ok) return result;
  const { canvas, ctx } = result.value;
  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);
  return ok(canvas);
}

// ============================================================================
// Perspective Warp
// ============================================================================

/**
 * Check if OpenCV.js is loaded
 */
export function isOpenCVReady(): boolean {
  return typeof cv !== "undefined" && cv !== null;
}

/**
 * Sort corners to [TL, TR, BR, BL] order
 */
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

/**
 * Calculate output dimensions for warped card
 */
function getCardWarpDimensions(orderedCorners: readonly Point[]): {
  width: number;
  height: number;
} {
  if (orderedCorners.length !== 4) {
    return {
      width: CARD_DIMENSIONS.OUTPUT_WIDTH,
      height: CARD_DIMENSIONS.OUTPUT_HEIGHT,
    };
  }

  const [tl, tr, , bl] = orderedCorners;
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const widthBottom = Math.hypot(
    orderedCorners[2].x - bl.x,
    orderedCorners[2].y - bl.y
  );
  const maxWidth = Math.max(widthTop, widthBottom);
  const targetWidth = Math.round(maxWidth);
  const targetHeight = Math.round(maxWidth / CARD_DIMENSIONS.ASPECT_RATIO);

  return {
    width: Math.max(targetWidth, 400),
    height: Math.max(
      targetHeight,
      Math.round(400 / CARD_DIMENSIONS.ASPECT_RATIO)
    ),
  };
}

/**
 * Perform perspective warp
 */
export function warpPerspective(
  srcImg: HTMLImageElement,
  srcCorners: readonly Point[],
  _dstCorners: readonly Point[],
  _outputDimensions: ImageDimensions,
  sourceImageData?: ImageData
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  const orderedCorners = robustSortCorners([...srcCorners]);
  const dimensions = getCardWarpDimensions(orderedCorners);
  const { width, height } = dimensions;

  if (isOpenCVReady() && typeof cv !== "undefined") {
    try {
      return warpWithOpenCV(
        srcImg,
        orderedCorners,
        width,
        height,
        sourceImageData
      );
    } catch {
      console.warn("OpenCV warp failed, using canvas fallback");
    }
  }

  return warpWithCanvas(srcImg, orderedCorners, width, height);
}

function warpWithOpenCV(
  srcImg: HTMLImageElement,
  orderedCorners: readonly Point[],
  width: number,
  height: number,
  sourceImageData?: ImageData
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  let srcMat: CVMat | null = null;
  let dstMat: CVMat | null = null;
  let srcTri: CVMat | null = null;
  let dstTri: CVMat | null = null;
  let M: CVMat | null = null;

  try {
    // Phase 2 optimization: Downscale large images before warp
    // This dramatically reduces warpPerspective computation time
    const MAX_WARP_WIDTH = 1500;
    let scale = 1;
    let srcWidth = srcImg.width;
    let srcHeight = srcImg.height;

    // Determine if downscaling is needed
    if (srcWidth > MAX_WARP_WIDTH && !sourceImageData) {
      scale = MAX_WARP_WIDTH / srcWidth;
      srcWidth = MAX_WARP_WIDTH;
      srcHeight = Math.round(srcImg.height * scale);
    }

    // Scale corner coordinates to match the potentially downscaled image
    const scaledCorners = orderedCorners.map((p) => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    if (sourceImageData) {
      srcMat = cv!.matFromImageData(sourceImageData);
    } else {
      // Use GPU-accelerated canvas.drawImage for downscaling
      const srcResult = createCanvas(srcWidth, srcHeight);
      if (!srcResult.ok) return srcResult;
      const { ctx: srcCtx } = srcResult.value;
      srcCtx.imageSmoothingEnabled = true;
      srcCtx.imageSmoothingQuality = "high";
      srcCtx.drawImage(srcImg, 0, 0, srcWidth, srcHeight);
      const imageData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
      srcMat = cv!.matFromImageData(imageData);
    }

    const [tl, tr, br, bl] = scaledCorners;
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
    dstTri = cv!.matFromArray(4, 1, cv!.CV_32FC2, [
      0,
      0,
      width,
      0,
      width,
      height,
      0,
      height,
    ]);

    M = cv!.getPerspectiveTransform(srcTri, dstTri);
    dstMat = new cv!.Mat();
    cv!.warpPerspective(
      srcMat,
      dstMat,
      M,
      new cv!.Size(width, height),
      cv!.INTER_LINEAR,
      cv!.BORDER_CONSTANT,
      new cv!.Scalar(0, 0, 0, 255)
    );

    const dstResult = createCanvas(width, height);
    if (!dstResult.ok) return dstResult;
    const { canvas: dstCanvas, ctx: dstCtx } = dstResult.value;

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
    if (srcTri) srcTri.delete();
    if (dstTri) dstTri.delete();
    if (M) M.delete();
  }
}

function warpWithCanvas(
  srcImg: HTMLImageElement,
  orderedCorners: readonly Point[],
  width: number,
  height: number
): Result<HTMLCanvasElement, WarpFailedError | CanvasContextError> {
  const minX = Math.min(...orderedCorners.map((p) => p.x));
  const maxX = Math.max(...orderedCorners.map((p) => p.x));
  const minY = Math.min(...orderedCorners.map((p) => p.y));
  const maxY = Math.max(...orderedCorners.map((p) => p.y));

  const srcWidth = maxX - minX;
  const srcHeight = maxY - minY;

  if (srcWidth <= 0 || srcHeight <= 0) {
    return err(new WarpFailedError("Invalid corner coordinates"));
  }

  const dstResult = createCanvas(width, height);
  if (!dstResult.ok) return dstResult;
  const { canvas: dstCanvas, ctx: dstCtx } = dstResult.value;

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

// ============================================================================
// Pipeline Manager
// ============================================================================

export interface PipelineStageResult {
  readonly stage: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly details?: Record<string, unknown>;
}

export interface PipelineResult {
  readonly result: Result<ProcessedImage, DetectionError>;
  readonly stages: readonly PipelineStageResult[];
  readonly totalDurationMs: number;
}

export class PipelineManager {
  private stages: PipelineStageResult[] = [];
  private startTime: number = 0;

  async processImage(
    imageDataUrl: string,
    options: ProcessingOptions = createDefaultProcessingOptions()
  ): Promise<PipelineResult> {
    this.stages = [];
    this.startTime = performance.now();

    // Load OpenCV first (this is a no-op if already loaded)
    try {
      console.log("Stage: Loading OpenCV...");
      await loadOpenCV();
      console.log("Stage: OpenCV Ready");
      this.stages.push({
        stage: "load_opencv",
        success: true,
        durationMs: performance.now() - this.startTime,
      });
    } catch (error) {
      console.warn("OpenCV failed to load: ", error);
      this.stages.push({
        stage: "load_opencv",
        success: false,
        durationMs: performance.now() - this.startTime,
        details: { error: String(error) },
      });
    }

    const loadResult = await this.runStage("load_image", async () =>
      loadImage(imageDataUrl)
    );
    if (isErr(loadResult)) return this.createPipelineResult(loadResult);
    const img = loadResult.value;

    const imageDataResult = await this.runStage("get_image_data", async () => {
      // Hardware-accelerated resize to intermediate detection size.
      // 1024px provides a good balance: small enough for fast readback,
      // but large enough for OpenCV's INTER_AREA to find sharp edges.
      const targetHeight = 1024;
      const scale = targetHeight / img.height;
      const targetWidth = Math.round(img.width * scale);

      const result = createCanvas(targetWidth, targetHeight);
      if (!result.ok) return result;
      const { ctx } = result.value;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      return ok({
        imageData: ctx.getImageData(0, 0, targetWidth, targetHeight),
        width: targetWidth,
        height: targetHeight,
        originalWidth: img.width,
        originalHeight: img.height,
      });
    });
    if (isErr(imageDataResult))
      return this.createPipelineResult(imageDataResult);

    const detectionResult = await this.runStage("detect_card", async () => {
      const { imageData, width, height, originalWidth, originalHeight } =
        imageDataResult.value;

      // Run detection on the small image
      const detection = detectCard(imageData, width, height);

      // Map detection results back to original high-res coordinates
      const scaleX = originalWidth / width;
      const scaleY = originalHeight / height;

      const scaledDetection: ExtendedDetectionResult = {
        ...detection,
        corners: detection.corners.map((p) => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        })),
        boundingRect: {
          x: detection.boundingRect.x * scaleX,
          y: detection.boundingRect.y * scaleY,
          width: detection.boundingRect.width * scaleX,
          height: detection.boundingRect.height * scaleY,
        },
        imageDimensions: { width: originalWidth, height: originalHeight },
      };

      return ok(scaledDetection);
    });
    if (isErr(detectionResult))
      return this.createPipelineResult(detectionResult);
    const detection = detectionResult.value;

    const overlayResult = await this.runStage("draw_overlay", async () =>
      this.drawOverlay(img, detection)
    );
    if (isErr(overlayResult)) return this.createPipelineResult(overlayResult);

    const cropResult = await this.runStage("crop_and_warp", async () =>
      // Note: We intentionally do NOT pass imageDataResult.value.imageData here.
      // That imageData is for the 1024px detection-only image, but our corners
      // have already been scaled back to the original image dimensions.
      // Passing undefined forces warpWithOpenCV to read pixels from the full-res img.
      this.cropAndWarp(img, detection, options, undefined)
    );
    if (isErr(cropResult)) return this.createPipelineResult(cropResult);
    let cardCanvas = cropResult.value;

    // Phase 1 optimization: separate enhancement stage for accurate timing
    const enhancementResult = await this.runStage(
      "image_enhancement",
      async () => {
        let imageData: ImageData | null = null;
        if (options.enableEnhancement) {
          const ctx = cardCanvas.getContext("2d");
          if (ctx) {
            // Get ImageData ONCE for both operations
            imageData = ctx.getImageData(
              0,
              0,
              cardCanvas.width,
              cardCanvas.height
            );

            // Apply sharpening (returns new ImageData or null)
            const sharpened = sharpenImageData(imageData);
            if (sharpened) imageData = sharpened;

            // Apply contrast/brightness (modifies in place)
            enhanceImageData(imageData);

            // Put modified data back ONCE
            ctx.putImageData(imageData, 0, 0);
          }
        }
        // Return both canvas and the latest imageData
        return ok({ canvas: cardCanvas, imageData });
      }
    );
    if (isErr(enhancementResult))
      return this.createPipelineResult(enhancementResult);

    cardCanvas = enhancementResult.value.canvas;
    const enhancedImageData = enhancementResult.value.imageData;

    const thresholdResult = await this.runStage(
      "ocr_preprocessing",
      async () => {
        if (!options.enableOcrPreprocessing) {
          return ok(canvasToDataUrl(cardCanvas));
        }

        // If we have enhancedImageData from previous step, use it directly
        // Otherwise get it from the canvas
        let srcImageData = enhancedImageData;
        if (!srcImageData) {
          const ctx = cardCanvas.getContext("2d");
          if (!ctx) return err(new CanvasContextError());
          srcImageData = ctx.getImageData(
            0,
            0,
            cardCanvas.width,
            cardCanvas.height
          );
        }

        // Apply adaptive thresholding to ImageData (avoiding drawImage + getImageData)
        const thresholdedData = applyAdaptiveThresholdToData(srcImageData);

        // Create result canvas
        const ocrCanvasResult = createCanvas(
          cardCanvas.width,
          cardCanvas.height
        );
        if (!ocrCanvasResult.ok) return ocrCanvasResult;
        const { canvas: ocrCanvas, ctx: ocrCtx } = ocrCanvasResult.value;

        if (thresholdedData) {
          ocrCtx.putImageData(thresholdedData, 0, 0);
        } else {
          // Fallback if thresholding failed
          ocrCtx.drawImage(cardCanvas, 0, 0);
        }

        return ok(canvasToDataUrl(ocrCanvas));
      }
    );
    if (isErr(thresholdResult))
      return this.createPipelineResult(thresholdResult);

    const processedImage: ProcessedImage = {
      originalWithOverlay: overlayResult.value,
      croppedCard: canvasToDataUrl(cardCanvas),
      thresholdedCard: thresholdResult.value,
      detectionResult: detection,
    };

    return this.createPipelineResult(ok(processedImage));
  }

  private async runStage<T>(
    stageName: string,
    operation: () => Promise<Result<T, DetectionError>>
  ): Promise<Result<T, DetectionError>> {
    const stageStart = performance.now();
    try {
      const result = await operation();
      this.stages.push({
        stage: stageName,
        success: result.ok,
        durationMs: performance.now() - stageStart,
        details: result.ok ? undefined : errorToDiagnostic(result.error),
      });
      return result;
    } catch (error) {
      const detectionError = new ImageLoadError(
        "Unknown",
        error instanceof Error ? error : new Error(String(error))
      );
      this.stages.push({
        stage: stageName,
        success: false,
        durationMs: performance.now() - stageStart,
        details: errorToDiagnostic(detectionError),
      });
      return err(detectionError);
    }
  }

  private async drawOverlay(
    img: HTMLImageElement,
    detection: ExtendedDetectionResult
  ): Promise<Result<string, DetectionError>> {
    // Determine preview dimensions (optimize by downscaling large images)
    const maxDim = OVERLAY.MAX_PREVIEW_WIDTH;
    let width = img.width;
    let height = img.height;
    let scale = 1;

    if (width > maxDim) {
      scale = maxDim / width;
      width = maxDim;
      height = Math.round(img.height * scale);
    }

    const canvasResult = createCanvas(width, height);
    if (!canvasResult.ok) return canvasResult;
    const { canvas, ctx } = canvasResult.value;

    // Draw downscaled base image
    ctx.drawImage(img, 0, 0, width, height);

    // Adjust detection corners for the new scale
    const scaledDetection = {
      ...detection,
      corners: detection.corners.map((p) => ({
        x: p.x * scale,
        y: p.y * scale,
      })),
      boundingRect: {
        x: detection.boundingRect.x * scale,
        y: detection.boundingRect.y * scale,
        width: detection.boundingRect.width * scale,
        height: detection.boundingRect.height * scale,
      },
    };

    drawDetectionOverlay(ctx, scaledDetection);
    return ok(canvasToDataUrl(canvas));
  }

  private async cropAndWarp(
    img: HTMLImageElement,
    detection: ExtendedDetectionResult,
    options: ProcessingOptions,
    imageData?: ImageData
  ): Promise<Result<HTMLCanvasElement, DetectionError>> {
    const outputDimensions: ImageDimensions = {
      width: CARD_DIMENSIONS.OUTPUT_WIDTH,
      height: CARD_DIMENSIONS.OUTPUT_HEIGHT,
    };

    if (!options.enableCrop) {
      const scaleResult = scaleImage(img, CARD_DIMENSIONS.OUTPUT_WIDTH);
      if (!scaleResult.ok) return scaleResult;
      return ok(scaleResult.value);
    }

    if (detection.success && detection.corners.length === 4) {
      const warpResult = warpPerspective(
        img,
        detection.corners,
        [
          { x: 0, y: 0 },
          { x: outputDimensions.width, y: 0 },
          { x: outputDimensions.width, y: outputDimensions.height },
          { x: 0, y: outputDimensions.height },
        ],
        outputDimensions,
        imageData
      );

      if (warpResult.ok) {
        return ok(warpResult.value);
      }
      console.warn("Perspective warp failed, using simple crop");
    }

    const cropResult = simpleCrop(
      img,
      detection.boundingRect,
      outputDimensions
    );
    if (!cropResult.ok) return cropResult;
    return ok(cropResult.value);
  }

  private createPipelineResult<T>(
    result: Result<T, DetectionError>
  ): PipelineResult {
    return {
      result: result as Result<ProcessedImage, DetectionError>,
      stages: [...this.stages],
      totalDurationMs: performance.now() - this.startTime,
    };
  }

  static getSummary(result: PipelineResult): string {
    const lines: string[] = [];
    lines.push(`Pipeline completed in ${result.totalDurationMs.toFixed(1)}ms`);
    lines.push(`Success: ${result.result.ok}`);
    lines.push("");
    lines.push("Stages:");

    for (const stage of result.stages) {
      const status = stage.success ? "✓" : "✗";
      lines.push(
        `  ${status} ${stage.stage}: ${stage.durationMs.toFixed(1)}ms`
      );
    }

    if (result.result.ok) {
      const detection = result.result.value.detectionResult;
      lines.push("");
      lines.push("Detection:");
      lines.push(`  Method: ${getMethodDescription(detection.method)}`);
      lines.push(`  Confidence: ${detection.confidence.toFixed(1)}%`);
      lines.push(`  Aspect Ratio: ${detection.detectedAspectRatio.toFixed(3)}`);
    } else {
      lines.push("");
      lines.push(`Error: ${result.result.error.getUserMessage()}`);
    }

    return lines.join("\n");
  }
}

export async function processImage(
  imageDataUrl: string,
  options?: ProcessingOptions
): Promise<ProcessedImage> {
  const manager = new PipelineManager();
  const result = await manager.processImage(imageDataUrl, options);

  if (result.result.ok) {
    return result.result.value;
  }

  console.error("Pipeline failed:", result.result.error.getUserMessage());

  return {
    originalWithOverlay: imageDataUrl,
    croppedCard: imageDataUrl,
    thresholdedCard: imageDataUrl,
    detectionResult: {
      success: false,
      corners: [],
      boundingRect: { x: 0, y: 0, width: 0, height: 0 },
      confidence: 0,
      method: "canny_edge_detection",
      imageDimensions: { width: 0, height: 0 },
      detectedAspectRatio: 0,
    },
  };
}

export async function processImageWithDiagnostics(
  imageDataUrl: string,
  options?: ProcessingOptions
): Promise<PipelineResult> {
  const manager = new PipelineManager();
  return manager.processImage(imageDataUrl, options);
}
