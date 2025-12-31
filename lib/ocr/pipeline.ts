/**
 * Pipeline Module - Image Processing Pipeline
 * Orchestrates detection, warping, enhancement, and canvas operations
 */

import { CARD_DIMENSIONS, ENHANCEMENT, OVERLAY } from "./constants";
import { detectCard, getMethodDescription } from "./detector";
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
  ctx.putImageData(imageData, 0, 0);
}

function clampPixel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
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
      return warpWithOpenCV(srcImg, orderedCorners, width, height, sourceImageData);
    } catch (error) {
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
    if (sourceImageData) {
      srcMat = cv!.matFromImageData(sourceImageData);
    } else {
      const srcResult = createCanvas(srcImg.width, srcImg.height);
      if (!srcResult.ok) return srcResult;
      const { ctx: srcCtx } = srcResult.value;
      srcCtx.drawImage(srcImg, 0, 0);
      const imageData = srcCtx.getImageData(0, 0, srcImg.width, srcImg.height);
      srcMat = cv!.matFromImageData(imageData);
    }

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
      cv!.INTER_CUBIC,
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

    const loadResult = await this.runStage("load_image", async () =>
      loadImage(imageDataUrl)
    );
    if (isErr(loadResult)) return this.createPipelineResult(loadResult);
    const img = loadResult.value;

    const imageDataResult = await this.runStage("get_image_data", async () =>
      getImageData(img)
    );
    if (isErr(imageDataResult))
      return this.createPipelineResult(imageDataResult);

    const detectionResult = await this.runStage("detect_card", async () => {
      const { imageData, width, height } = imageDataResult.value;
      return ok(detectCard(imageData, width, height));
    });
    if (isErr(detectionResult))
      return this.createPipelineResult(detectionResult);
    const detection = detectionResult.value;

    const overlayResult = await this.runStage("draw_overlay", async () =>
      this.drawOverlay(img, detection)
    );
    if (isErr(overlayResult)) return this.createPipelineResult(overlayResult);

    const cropResult = await this.runStage("crop_and_warp", async () =>
      this.cropAndWarp(img, detection, options)
    );
    if (isErr(cropResult)) return this.createPipelineResult(cropResult);

    const processedImage: ProcessedImage = {
      originalWithOverlay: overlayResult.value,
      croppedCard: cropResult.value,
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
    const canvasResult = createCanvas(img.width, img.height);
    if (!canvasResult.ok) return canvasResult;
    const { canvas, ctx } = canvasResult.value;
    ctx.drawImage(img, 0, 0);
    drawDetectionOverlay(ctx, detection);
    return ok(canvasToDataUrl(canvas));
  }

  private async cropAndWarp(
    img: HTMLImageElement,
    detection: ExtendedDetectionResult,
    options: ProcessingOptions
  ): Promise<Result<string, DetectionError>> {
    const outputDimensions: ImageDimensions = {
      width: CARD_DIMENSIONS.OUTPUT_WIDTH,
      height: CARD_DIMENSIONS.OUTPUT_HEIGHT,
    };

    if (!options.enableCrop) {
      const scaleResult = scaleImage(img, CARD_DIMENSIONS.OUTPUT_WIDTH);
      if (!scaleResult.ok) return scaleResult;
      const canvas = scaleResult.value;
      if (options.enableEnhancement) {
        const ctx = canvas.getContext("2d");
        if (ctx) enhanceImage(ctx, canvas.width, canvas.height);
      }
      return ok(canvasToDataUrl(canvas));
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
        outputDimensions
      );

      if (warpResult.ok) {
        const canvas = warpResult.value;
        if (options.enableEnhancement) {
          const ctx = canvas.getContext("2d");
          if (ctx) enhanceImage(ctx, canvas.width, canvas.height);
        }
        return ok(canvasToDataUrl(canvas));
      }
      console.warn("Perspective warp failed, using simple crop");
    }

    const cropResult = simpleCrop(
      img,
      detection.boundingRect,
      outputDimensions
    );
    if (!cropResult.ok) return cropResult;
    const canvas = cropResult.value;
    if (options.enableEnhancement) {
      const ctx = canvas.getContext("2d");
      if (ctx) enhanceImage(ctx, canvas.width, canvas.height);
    }
    return ok(canvasToDataUrl(canvas));
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
