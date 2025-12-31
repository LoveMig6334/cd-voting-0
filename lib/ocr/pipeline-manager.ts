/**
 * Pipeline Manager for the Image Processing Pipeline
 * Main orchestrator that coordinates detection, warping, and enhancement stages
 */

import {
  canvasToDataUrl,
  createCanvas,
  drawDetectionOverlay,
  enhanceImage,
  getImageData,
  loadImage,
  scaleImage,
  simpleCrop,
  warpPerspective,
} from "./canvas-utils";
import { detectCard, getMethodDescription } from "./card-detector";
import { CARD_DIMENSIONS } from "./constants";
import {
  type DetectionError,
  err,
  errorToDiagnostic,
  ImageLoadError,
  isErr,
  ok,
  type Result,
} from "./errors";
import type {
  ExtendedDetectionResult,
  ImageDimensions,
  ProcessedImage,
  ProcessingOptions,
} from "./types";
import { createDefaultProcessingOptions } from "./types";

/**
 * Pipeline stage result for diagnostics
 */
export interface PipelineStageResult {
  readonly stage: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly details?: Record<string, unknown>;
}

/**
 * Full pipeline result with diagnostics
 */
export interface PipelineResult {
  readonly result: Result<ProcessedImage, DetectionError>;
  readonly stages: readonly PipelineStageResult[];
  readonly totalDurationMs: number;
}

/**
 * Pipeline Manager class
 * Orchestrates the image processing pipeline with stage tracking
 */
export class PipelineManager {
  private stages: PipelineStageResult[] = [];
  private startTime: number = 0;

  /**
   * Process an image through the full pipeline
   */
  async processImage(
    imageDataUrl: string,
    options: ProcessingOptions = createDefaultProcessingOptions()
  ): Promise<PipelineResult> {
    this.stages = [];
    this.startTime = performance.now();

    // Stage 1: Load image
    const loadResult = await this.runStage("load_image", async () => {
      return loadImage(imageDataUrl);
    });

    if (isErr(loadResult)) {
      return this.createPipelineResult(loadResult);
    }

    const img = loadResult.value;

    // Stage 2: Get image data
    const imageDataResult = await this.runStage("get_image_data", async () => {
      return getImageData(img);
    });

    if (isErr(imageDataResult)) {
      return this.createPipelineResult(imageDataResult);
    }

    // Stage 3: Detect card
    const detectionResult = await this.runStage("detect_card", async () => {
      const { imageData, width, height } = imageDataResult.value;
      const detection = detectCard(imageData, width, height);
      return ok(detection);
    });

    if (isErr(detectionResult)) {
      return this.createPipelineResult(detectionResult);
    }

    const detection = detectionResult.value;

    // Stage 4: Draw detection overlay
    const overlayResult = await this.runStage("draw_overlay", async () => {
      return this.drawOverlay(img, detection);
    });

    if (isErr(overlayResult)) {
      return this.createPipelineResult(overlayResult);
    }

    // Stage 5: Crop and warp card
    const cropResult = await this.runStage("crop_and_warp", async () => {
      return this.cropAndWarp(img, detection, options);
    });

    if (isErr(cropResult)) {
      return this.createPipelineResult(cropResult);
    }

    // Build final result
    const processedImage: ProcessedImage = {
      originalWithOverlay: overlayResult.value,
      croppedCard: cropResult.value,
      detectionResult: detection,
    };

    return this.createPipelineResult(ok(processedImage));
  }

  /**
   * Run a pipeline stage with timing and error tracking
   */
  private async runStage<T>(
    stageName: string,
    operation: () => Promise<Result<T, DetectionError>>
  ): Promise<Result<T, DetectionError>> {
    const stageStart = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - stageStart;

      this.stages.push({
        stage: stageName,
        success: result.ok,
        durationMs: duration,
        details: result.ok ? undefined : errorToDiagnostic(result.error),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - stageStart;
      const detectionError = new ImageLoadError(
        "Unknown",
        error instanceof Error ? error : new Error(String(error))
      );

      this.stages.push({
        stage: stageName,
        success: false,
        durationMs: duration,
        details: errorToDiagnostic(detectionError),
      });

      return err(detectionError);
    }
  }

  /**
   * Draw detection overlay on the original image
   */
  private async drawOverlay(
    img: HTMLImageElement,
    detection: ExtendedDetectionResult
  ): Promise<Result<string, DetectionError>> {
    const canvasResult = createCanvas(img.width, img.height);
    if (!canvasResult.ok) {
      return canvasResult;
    }

    const { canvas, ctx } = canvasResult.value;
    ctx.drawImage(img, 0, 0);
    drawDetectionOverlay(ctx, detection);

    return ok(canvasToDataUrl(canvas));
  }

  /**
   * Crop and warp the card based on detection results
   */
  private async cropAndWarp(
    img: HTMLImageElement,
    detection: ExtendedDetectionResult,
    options: ProcessingOptions
  ): Promise<Result<string, DetectionError>> {
    const outputDimensions: ImageDimensions = {
      width: CARD_DIMENSIONS.OUTPUT_WIDTH,
      height: CARD_DIMENSIONS.OUTPUT_HEIGHT,
    };

    // If cropping is disabled, just scale the image
    if (!options.enableCrop) {
      const scaleResult = scaleImage(img, CARD_DIMENSIONS.OUTPUT_WIDTH);
      if (!scaleResult.ok) {
        return scaleResult;
      }

      const canvas = scaleResult.value;
      if (options.enableEnhancement) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          enhanceImage(ctx, canvas.width, canvas.height);
        }
      }

      return ok(canvasToDataUrl(canvas));
    }

    // Try perspective warp if detection was successful
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
          if (ctx) {
            enhanceImage(ctx, canvas.width, canvas.height);
          }
        }
        return ok(canvasToDataUrl(canvas));
      }

      // Warp failed, fall through to simple crop
      console.warn(
        "Perspective warp failed, using simple crop:",
        warpResult.error.message
      );
    }

    // Fallback: simple crop
    const cropResult = simpleCrop(
      img,
      detection.boundingRect,
      outputDimensions
    );

    if (!cropResult.ok) {
      return cropResult;
    }

    const canvas = cropResult.value;
    if (options.enableEnhancement) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        enhanceImage(ctx, canvas.width, canvas.height);
      }
    }

    return ok(canvasToDataUrl(canvas));
  }

  /**
   * Create the final pipeline result
   */
  private createPipelineResult<T>(
    result: Result<T, DetectionError>
  ): PipelineResult {
    return {
      result: result as Result<ProcessedImage, DetectionError>,
      stages: [...this.stages],
      totalDurationMs: performance.now() - this.startTime,
    };
  }

  /**
   * Get a summary of the pipeline execution
   */
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

/**
 * Convenience function for simple pipeline execution
 * Creates a new PipelineManager for each call
 */
export async function processImage(
  imageDataUrl: string,
  options?: ProcessingOptions
): Promise<ProcessedImage> {
  const manager = new PipelineManager();
  const result = await manager.processImage(imageDataUrl, options);

  if (result.result.ok) {
    return result.result.value;
  }

  // For backwards compatibility, return a fallback result
  // The error is logged but we still provide a usable output
  console.error("Pipeline failed:", result.result.error.getUserMessage());

  // Return a minimal result
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

/**
 * Advanced pipeline execution with full diagnostics
 */
export async function processImageWithDiagnostics(
  imageDataUrl: string,
  options?: ProcessingOptions
): Promise<PipelineResult> {
  const manager = new PipelineManager();
  return manager.processImage(imageDataUrl, options);
}
